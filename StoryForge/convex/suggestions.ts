// convex/suggestions.ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';

// Helper to get current user - properly typed
async function getCurrentUser(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthorized');
  
  const user = await ctx.db
    .query('users')
    .withIndex('by_externalId', (q) => q.eq('externalId', identity.subject))
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
    
    // Start with base query by user
    let query = ctx.db
      .query('savedSuggestions')
      .withIndex('by_user', (q) => q.eq('userId', user._id));
    
    // Apply filters using Convex's filter API for better performance
    if (args.storyId !== undefined) {
      query = query.filter((q) => q.eq(q.field('storyId'), args.storyId));
    }
    if (args.nodeId !== undefined) {
      query = query.filter((q) => q.eq(q.field('nodeId'), args.nodeId));
    }
    if (args.type !== undefined) {
      query = query.filter((q) => q.eq(q.field('type'), args.type));
    }
    
    const all = await query.collect();
    
    // Sort by creation time descending (newest first)
    return all.sort((a, b) => b._creationTime - a._creationTime);
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