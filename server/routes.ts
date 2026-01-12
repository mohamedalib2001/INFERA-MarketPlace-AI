import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { fullSyncToGitHub } from "./github";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post(api.subscribers.create.path, async (req, res) => {
    try {
      const input = api.subscribers.create.input.parse(req.body);
      
      const existing = await storage.getSubscriberByEmail(input.email);
      if (existing) {
        return res.status(409).json({ message: "Email already subscribed" });
      }

      await storage.createSubscriber(input);
      res.status(201).json({ success: true, message: "Successfully subscribed!" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  // GitHub sync endpoint (protected)
  app.post("/api/sync-github", async (req, res) => {
    try {
      const result = await fullSyncToGitHub(
        "mohamedalib2001",
        "INFERA-MarketPlace-AI",
        "main",
        "Deploy: INFERA Marketplace AI - Coming Soon page"
      );
      
      if (result.success) {
        res.json({ success: true, commitSha: result.commitSha });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return httpServer;
}
