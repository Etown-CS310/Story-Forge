// convex/suggestions.ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Helper to get current user
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthorized');
  
  const user = await ctx.db
    .query('users')
    .withIndex('by_externalId', (q: any) => q.eq('externalId', identity.subject))
    .unique();
  
  if (!user) throw new Error('User not found');
  return user;
}

export const saveSuggestion = mutation({
  args: {
    storyId: v.optional(v.id('stories')),
    nodeId: v.optional(v.id('nodes')),
    type: v.string(),
    originalContent: v.string(),
    suggestions: v.optional(v.string()),
    exampleEdits: v.optional(v.object({
      sceneTitle: v.string(),
      revisedText: v.string(),
      analysis: v.string(),
    })),
    choices: v.optional(v.array(v.object({
      label: v.string(),
      description: v.string(),
      title: v.optional(v.string()),
    }))),
    content: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  returns: v.id('savedSuggestions'),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    const id = await ctx.db.insert('savedSuggestions', {
      userId: user._id,
      storyId: args.storyId,
      nodeId: args.nodeId,
      type: args.type,
      originalContent: args.originalContent,
      suggestions: args.suggestions,
      exampleEdits: args.exampleEdits,
      choices: args.choices,
      content: args.content,
      note: args.note,
    });
    
    return id;
  },
});

export const listMySuggestions = query({
  args: {
    storyId: v.optional(v.id('stories')),
    nodeId: v.optional(v.id('nodes')),
    type: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id('savedSuggestions'),
    _creationTime: v.number(),
    userId: v.id('users'),
    storyId: v.optional(v.id('stories')),
    nodeId: v.optional(v.id('nodes')),
    type: v.string(),
    originalContent: v.string(),
    suggestions: v.optional(v.string()),
    exampleEdits: v.optional(v.object({
      sceneTitle: v.string(),
      revisedText: v.string(),
      analysis: v.string(),
    })),
    choices: v.optional(v.array(v.object({
      label: v.string(),
      description: v.string(),
      title: v.optional(v.string()),
    }))),
    content: v.optional(v.string()),
    note: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    let query = ctx.db
      .query('savedSuggestions')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id));
    
    const all = await query.collect();
    
    // Filter by storyId, nodeId, and type if provided
    return all.filter(s => {
      if (args.storyId && s.storyId !== args.storyId) return false;
      if (args.nodeId && s.nodeId !== args.nodeId) return false;
      if (args.type && s.type !== args.type) return false;
      return true;
    }).sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getSuggestion = query({
  args: { id: v.id('savedSuggestions') },
  returns: v.union(
    v.object({
      _id: v.id('savedSuggestions'),
      _creationTime: v.number(),
      userId: v.id('users'),
      storyId: v.optional(v.id('stories')),
      nodeId: v.optional(v.id('nodes')),
      type: v.string(),
      originalContent: v.string(),
      suggestions: v.optional(v.string()),
      exampleEdits: v.optional(v.object({
        sceneTitle: v.string(),
        revisedText: v.string(),
        analysis: v.string(),
      })),
      choices: v.optional(v.array(v.object({
        label: v.string(),
        description: v.string(),
        title: v.optional(v.string()),
      }))),
      content: v.optional(v.string()),
      note: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const suggestion = await ctx.db.get(args.id);
    
    if (!suggestion) return null;
    if (suggestion.userId !== user._id) throw new Error('Unauthorized');
    
    return suggestion;
  },
});

export const deleteSuggestion = mutation({
  args: { id: v.id('savedSuggestions') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const suggestion = await ctx.db.get(args.id);
    
    if (!suggestion) throw new Error('Suggestion not found');
    if (suggestion.userId !== user._id) throw new Error('Unauthorized');
    
    await ctx.db.delete(args.id);
    return null;
  },
});

export const updateSuggestionNote = mutation({
  args: {
    id: v.id('savedSuggestions'),
    note: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const suggestion = await ctx.db.get(args.id);
    
    if (!suggestion) throw new Error('Suggestion not found');
    if (suggestion.userId !== user._id) throw new Error('Unauthorized');
    
    await ctx.db.patch(args.id, { note: args.note });
    return null;
  },
});