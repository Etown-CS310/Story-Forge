// convex/queries/stories.ts
import { query, mutation } from '../_generated/server';
import { v } from 'convex/values';

export const getStory = query({
  args: { storyId: v.id('stories') },
  handler: async (ctx, { storyId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const story = await ctx.db.get(storyId);
    if (!story) return null;
    if (!story.public && (!identity || identity.subject !== story.createdBy)) {
      // also allow participants of any session on this story
      const me =
        identity &&
        (await ctx.db
          .query('users')
          .withIndex('by_externalId', (q) => q.eq('externalId', identity.subject))
          .unique());
      if (!me) return null;
      const session = await ctx.db
        .query('sessions')
        .withIndex('by_participant', (q) => q.eq('participants', [me._id]))
        .first();
      if (!session || session.storyId !== storyId) return null;
    }
    return story;
  },
});

export const getCurrentChoices = query({
  args: { nodeId: v.id('nodes') },
  handler: async (ctx, { nodeId }) => {
    const node = await ctx.db.get(nodeId);
    if (!node) return [];
    return await ctx.db
      .query('edges')
      .withIndex('by_story_from', (q) => q.eq('storyId', node.storyId).eq('fromNodeId', nodeId))
      .order('asc')
      .collect();
  },
});

export const chooseEdge = mutation({
  args: { sessionId: v.id('sessions'), edgeId: v.id('edges') },
  handler: async (ctx, { sessionId, edgeId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    const me = await ctx.db
      .query('users')
      .withIndex('by_externalId', (q) => q.eq('externalId', identity.subject))
      .unique();
    if (!me) throw new Error('No user record');

    const session = await ctx.db.get(sessionId);
    if (!session || !session.participants.includes(me._id)) throw new Error('No access');

    const edge = await ctx.db.get(edgeId);
    if (!edge || edge.storyId !== session.storyId) throw new Error('Edge not in session story');

    // Optional: enforce conditions based on session.flags/score
    // if (!passes(edge.conditions, session.flags, session.score)) throw new Error("Locked choice");

    // Move pointer
    await ctx.db.patch(sessionId, { currentNodeId: edge.toNodeId });

    const toNode = await ctx.db.get(edge.toNodeId);
    if (toNode) {
      await ctx.db.insert('messages', {
        sessionId,
        nodeId: toNode._id,
        role: toNode.role,
        content: toNode.content,
        chosenEdgeId: edge._id,
        readBy: [me._id],
      });
    }
  },
});

export const sendUserMessage = mutation({
  args: {
    sessionId: v.id('sessions'),
    content: v.string(),
  },
  handler: async (ctx, { sessionId, content }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    const me = await ctx.db
      .query('users')
      .withIndex('by_externalId', (q) => q.eq('externalId', identity.subject))
      .unique();
    if (!me) throw new Error('No user');

    const session = await ctx.db.get(sessionId);
    if (!session || !session.participants.includes(me._id)) throw new Error('No access');

    // Freeform user messages coexist with story nodes
    await ctx.db.insert('messages', {
      sessionId,
      role: 'user',
      authorUserId: me._id,
      content,
      readBy: [me._id],
    });
  },
});

export const changeStoryTitle = mutation({
  args: { storyId: v.id('stories'), newTitle: v.string() },
  handler: async (ctx, { storyId, newTitle }) => {
    const story = await ctx.db.get(storyId);
    if (!story) throw new Error('Story not found');

    await ctx.db.patch(storyId, { title: newTitle });
  },
});
