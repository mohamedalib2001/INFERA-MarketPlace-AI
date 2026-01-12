import { z } from 'zod';
import { insertSubscriberSchema } from './schema';

export const api = {
  subscribers: {
    create: {
      method: 'POST' as const,
      path: '/api/subscribers',
      input: insertSubscriberSchema,
      responses: {
        201: z.object({ success: z.boolean(), message: z.string() }),
        400: z.object({ message: z.string() }),
        409: z.object({ message: z.string() }), // Conflict - email already exists
      },
    },
  },
};
