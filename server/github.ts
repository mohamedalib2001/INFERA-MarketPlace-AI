// GitHub Integration - using Replit's GitHub connector
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Files and directories to exclude from sync
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.replit',
  '.cache',
  '.config',
  '.upm',
  'dist',
  '.env',
  '.env.local',
  '*.log',
  '.breakpoints',
  'replit.nix',
  'generated-icon.png',
  'attached_assets'
];

function shouldExclude(filePath: string): boolean {
  const parts = filePath.split('/');
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.startsWith('*')) {
      const ext = pattern.slice(1);
      if (filePath.endsWith(ext)) return true;
    } else {
      if (parts.includes(pattern) || filePath === pattern) return true;
    }
  }
  return false;
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (shouldExclude(relativePath)) continue;
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}

function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz', '.woff', '.woff2', '.ttf', '.eot'];
  return binaryExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
}

// Initialize empty repo with a README using Contents API
async function initializeEmptyRepo(octokit: Octokit, owner: string, repo: string, branch: string): Promise<string> {
  console.log('Initializing empty repository with README...');
  
  const readmeContent = `# INFERA Marketplace AI

Coming Soon - The Future of Decentralized AI Commerce

Visit: https://www.inferamarketplace.com
`;
  
  const response = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: 'README.md',
    message: 'Initial commit: Add README',
    content: Buffer.from(readmeContent).toString('base64'),
    branch
  });
  
  console.log('Repository initialized with README');
  return response.data.commit.sha!;
}

// Verify repository exists and we have access
async function ensureRepoExists(octokit: Octokit, owner: string, repo: string): Promise<boolean> {
  try {
    await octokit.repos.get({ owner, repo });
    console.log(`Repository ${owner}/${repo} exists and is accessible`);
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      console.log(`Repository ${owner}/${repo} not found, attempting to create...`);
      try {
        await octokit.repos.createForAuthenticatedUser({
          name: repo,
          description: 'INFERA Marketplace AI - Coming Soon',
          private: false,
          auto_init: false
        });
        console.log(`Repository ${owner}/${repo} created successfully`);
        return true;
      } catch (createError: any) {
        console.error('Failed to create repository:', createError.message);
        return false;
      }
    }
    throw error;
  }
}

// Full sync to GitHub using Git Data API
export async function fullSyncToGitHub(owner: string, repo: string, branch: string = 'main', commitMessage: string = 'Sync from Replit'): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  try {
    const octokit = await getUncachableGitHubClient();
    const baseDir = process.cwd();
    
    // First ensure repo exists
    const repoExists = await ensureRepoExists(octokit, owner, repo);
    if (!repoExists) {
      return { success: false, error: 'Repository does not exist and could not be created' };
    }
    
    // Get the latest commit SHA for the branch
    let latestCommitSha: string | null = null;
    let baseTreeSha: string | null = null;
    
    try {
      const refResponse = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
      latestCommitSha = refResponse.data.object.sha;
      
      const commitResponse = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
      baseTreeSha = commitResponse.data.tree.sha;
    } catch (error: any) {
      if (error.status === 404 || error.status === 409) {
        // 404 = branch not found, 409 = empty repo
        if (error.status === 409) {
          console.log('Repository is empty (409), initializing with README...');
          // Initialize repo using Contents API (works on empty repos)
          latestCommitSha = await initializeEmptyRepo(octokit, owner, repo, branch);
          const commitResponse = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
          baseTreeSha = commitResponse.data.tree.sha;
        } else {
          // Try master branch or it's an empty repo
          try {
            const masterRef = await octokit.git.getRef({ owner, repo, ref: 'heads/master' });
            latestCommitSha = masterRef.data.object.sha;
            const commitResponse = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
            baseTreeSha = commitResponse.data.tree.sha;
          } catch (e: any) {
            if (e.status === 409 || e.status === 404) {
              // Repository is empty - initialize with Contents API
              console.log('Repository is empty, initializing with README...');
              latestCommitSha = await initializeEmptyRepo(octokit, owner, repo, branch);
              const commitResponse = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
              baseTreeSha = commitResponse.data.tree.sha;
            } else {
              throw e;
            }
          }
        }
      } else {
        throw error;
      }
    }
    
    // Get all files to sync
    const files = getAllFiles(baseDir);
    console.log(`Found ${files.length} files to sync`);
    
    // Create blobs for each file
    const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
    
    for (const filePath of files) {
      const fullPath = path.join(baseDir, filePath);
      const isBinary = isBinaryFile(filePath);
      
      let content: string;
      let encoding: 'utf-8' | 'base64';
      
      if (isBinary) {
        content = fs.readFileSync(fullPath).toString('base64');
        encoding = 'base64';
      } else {
        content = fs.readFileSync(fullPath, 'utf-8');
        encoding = 'utf-8';
      }
      
      const blobResponse = await octokit.git.createBlob({
        owner,
        repo,
        content,
        encoding
      });
      
      treeItems.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blobResponse.data.sha
      });
    }
    
    // Create a new tree
    const treeResponse = await octokit.git.createTree({
      owner,
      repo,
      tree: treeItems,
      ...(baseTreeSha ? { base_tree: baseTreeSha } : {})
    });
    
    // Create a new commit
    const commitResponse = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: treeResponse.data.sha,
      parents: latestCommitSha ? [latestCommitSha] : []
    });
    
    // Update the branch reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commitResponse.data.sha
    });
    
    console.log(`Successfully synced to GitHub: ${commitResponse.data.sha}`);
    return { success: true, commitSha: commitResponse.data.sha };
    
  } catch (error: any) {
    console.error('GitHub sync error:', error.message);
    return { success: false, error: error.message };
  }
}

// Sync code to GitHub repository
export async function syncToGitHub(owner: string, repo: string) {
  const octokit = await getUncachableGitHubClient();
  const repoInfo = await octokit.repos.get({ owner, repo });
  return repoInfo.data;
}
