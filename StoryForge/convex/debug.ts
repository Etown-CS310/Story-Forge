// convex/debug.ts
import { query } from './_generated/server';
export const listAllSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('sessions').collect();
  },
});
