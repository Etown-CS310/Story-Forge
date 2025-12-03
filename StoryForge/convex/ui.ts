import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Helper: get current user document
async function me(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  return await ctx.db
    .query('users')
    .withIndex('by_externalId', (q: any) => q.eq('externalId', identity.subject))
    .unique();
}

export const listStories = query({
  args: { q: v.optional(v.string()) },
  handler: async (ctx, { q }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    // find the user's DB record
    const user = await ctx.db
      .query('users')
      .withIndex('by_externalId', (q) => q.eq('externalId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    // Fetch all public stories
    const publicStories = await ctx.db
      .query('stories')
      .withIndex('by_public', (x) => x.eq('public', true))
      .collect();

    // Fetch all of the user's stories (including unpublished)
    const userStories = await ctx.db
      .query('stories')
      .withIndex('by_creator', (x) => x.eq('createdBy', user._id))
      .collect();

    // Merge and remove duplicates (efficiently)
    const seenIds = new Set(publicStories.map((s) => s._id));
    const combined = [...publicStories, ...userStories.filter((s) => !seenIds.has(s._id))];
    // Optional search filter
    const qq = (q ?? '').toLowerCase();
    return combined
      .filter((s) => !qq || s.title.toLowerCase().includes(qq) || (s.summary ?? '').toLowerCase().includes(qq))
      .map((s) => ({ ...s }));
  },
});

// ===== Editor API =====
export const getStoryGraph = query({
  args: { storyId: v.id('stories') },
  handler: async (ctx, { storyId }) => {
    const story = await ctx.db.get(storyId);
    if (!story) throw new Error('Story not found');
    const nodes = await ctx.db
      .query('nodes')
      .withIndex('by_story', (q) => q.eq('storyId', storyId))
      .collect();
    const edges = await ctx.db
      .query('edges')
      .withIndex('by_story_from', (q) => q.eq('storyId', storyId))
      .collect();
    return { storyId, rootNodeId: story.rootNodeId, nodes, edges };
  },
});

export const updateNodeContent = mutation({
  args: { nodeId: v.id('nodes'), content: v.string() },
  handler: async (ctx, { nodeId, content }) => {
    await ctx.db.patch(nodeId, { content });
  },
});

export const updateNodeTitle = mutation({
  args: { nodeId: v.id('nodes'), title: v.string() },
  handler: async (ctx, { nodeId, title }) => {
    await ctx.db.patch(nodeId, { title });
  },
});

export const createNodeAndEdge = mutation({
  args: {
    storyId: v.id('stories'),
    fromNodeId: v.id('nodes'),
    label: v.string(),
    content: v.string(),
    title: v.optional(v.string()), // ← Added title parameter
  },
  handler: async (ctx, { storyId, fromNodeId, label, content, title }) => {
    const from = await ctx.db.get(fromNodeId);
    if (!from || from.storyId !== storyId) throw new Error('fromNode not in story');
    const nodeId = await ctx.db.insert('nodes', {
      storyId,
      role: 'narrator',
      title: title ?? 'Untitled Scene', // ← Use provided title or default only when undefined/null
      content,
      metadata: {},
      version: 1,
      createdBy: from.createdBy,
    });
    await ctx.db.insert('edges', {
      storyId,
      fromNodeId,
      toNodeId: nodeId,
      label,
      order: 0,
    });
    return nodeId;
  },
});

export const createEdge = mutation({
  args: { storyId: v.id('stories'), fromNodeId: v.id('nodes'), toNodeId: v.id('nodes'), label: v.string() },
  handler: async (ctx, { storyId, fromNodeId, toNodeId, label }) => {
    const from = await ctx.db.get(fromNodeId);
    const to = await ctx.db.get(toNodeId);
    if (!from || !to || from.storyId !== storyId || to.storyId !== storyId) throw new Error('nodes not in story');
    await ctx.db.insert('edges', { storyId, fromNodeId, toNodeId, label, order: 0 });
  },
});

export const deleteEdge = mutation({
  args: { edgeId: v.id('edges') },
  handler: async (ctx, { edgeId }) => {
    await ctx.db.delete(edgeId);
  },
});

export const startSessionForMe = mutation({
  args: { storyId: v.id('stories') },
  handler: async (ctx, { storyId }) => {
    const user = await me(ctx);
    if (!user) throw new Error('Unauthorized');
    const story = await ctx.db.get(storyId);
    if (!story) throw new Error('Story not found');
    if (!story.rootNodeId) throw new Error('Story not seeded');

    const sessionId = await ctx.db.insert('sessions', {
      storyId,
      createdBy: user._id,
      title: story.title,
      participants: [user._id],
      currentNodeId: story.rootNodeId,
      flags: {},
      score: 0,
      isGroup: false,
    });

    // Put the root node message into the timeline
    const root = await ctx.db.get(story.rootNodeId);
    if (root) {
      await ctx.db.insert('messages', {
        sessionId,
        nodeId: root._id,
        role: root.role,
        content: root.content,
        readBy: [user._id],
      });
    }

    return sessionId;
  },
});

export const listMySessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await me(ctx);
    if (!user) return [];
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_participant', (q: any) => q.eq('participants', user._id))
      .collect();
    // Attach story title for tiles
    const out = [] as any[];
    for (const s of sessions) {
      const story = await ctx.db.get(s.storyId);
      out.push({ ...s, storyTitle: story?.title ?? 'Story' });
    }
    // newest first
    return out.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getSessionState = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const user = await me(ctx);
    if (!user) throw new Error('Unauthorized');
    const session = await ctx.db.get(sessionId);
    if (!session || !session.participants.includes(user._id)) throw new Error('No access');

    // Timeline
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_session', (q: any) => q.eq('sessionId', sessionId))
      .order('asc')
      .collect();

    // Current choices off the current node
    const choices = await ctx.db
      .query('edges')
      .withIndex('by_story_from', (q: any) => q.eq('storyId', session.storyId).eq('fromNodeId', session.currentNodeId))
      .order('asc')
      .collect();

    // Decorate messages with an author label for UI
    const decorated = await Promise.all(
      messages.map(async (m) => {
        let author: string | undefined = undefined;
        if (m.authorUserId) {
          const u = await ctx.db.get(m.authorUserId);
          author = u?.displayName ?? 'You';
        } else if (m.role === 'character' && m.nodeId) {
          const n = await ctx.db.get(m.nodeId);
          const name = (n?.metadata as any)?.name;
          author = name ?? 'Character';
        } else {
          author = m.role;
        }
        return { ...m, author };
      }),
    );

    return { session, messages: decorated, choices };
  },
});

export const chooseEdge = mutation({
  args: { sessionId: v.id('sessions'), edgeId: v.id('edges') },
  handler: async (ctx, { sessionId, edgeId }) => {
    const user = await me(ctx);
    if (!user) throw new Error('Unauthorized');

    const session = await ctx.db.get(sessionId);
    if (!session || !session.participants.includes(user._id)) throw new Error('No access');

    const edge = await ctx.db.get(edgeId);
    if (!edge || edge.storyId !== session.storyId) throw new Error('Edge invalid');

    // TODO: evaluate conditions & apply effects

    await ctx.db.patch(sessionId, { currentNodeId: edge.toNodeId });

    const toNode = await ctx.db.get(edge.toNodeId);
    if (toNode) {
      await ctx.db.insert('messages', {
        sessionId,
        nodeId: toNode._id,
        role: toNode.role,
        content: toNode.content,
        chosenEdgeId: edge._id,
        edgeContent: edge.label,
        readBy: [user._id],
      });
    }
  },
});

export const advanceSession = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const user = await me(ctx);
    if (!user) throw new Error('Unauthorized');

    const session = await ctx.db.get(sessionId);
    if (!session || !session.participants.includes(user._id)) throw new Error('No access');

    const choices = await ctx.db
      .query('edges')
      .withIndex('by_story_from', (q: any) => q.eq('storyId', session.storyId).eq('fromNodeId', session.currentNodeId))
      .order('asc')
      .collect();

    if (choices.length === 0) return null;

    const edge = choices[0];

    await ctx.db.patch(sessionId, { currentNodeId: edge.toNodeId });

    const toNode = await ctx.db.get(edge.toNodeId);
    if (toNode) {
      await ctx.db.insert('messages', {
        sessionId,
        nodeId: toNode._id,
        role: toNode.role,
        content: toNode.content,
        chosenEdgeId: edge._id,
        edgeContent: edge.label,
        readBy: [user._id],
      });
    }

    return edge._id;
  },
});

export const createStory = mutation({
  args: {
    title: v.string(),
    summary: v.optional(v.string()),
    rootContent: v.string(), // first node content
    isPublic: v.boolean(),
    rootNodeTitle: v.optional(v.string()),
  },
  handler: async (ctx, { title, summary, rootContent, isPublic, rootNodeTitle }) => {
    // assumes you have a `me(ctx)` helper that returns the current user doc
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_externalId', (q) => q.eq('externalId', identity.subject))
      .unique();
    if (!user) throw new Error('No user record');

    // 1) create the story (published or draft—here we publish for convenience)
    const storyId = await ctx.db.insert('stories', {
      title,
      summary,
      createdBy: user._id,
      public: isPublic,
      rootNodeId: undefined,
      tags: [],
      status: 'published',
    });

    // 2) seed the root node
    const rootNodeId = await ctx.db.insert('nodes', {
      storyId,
      role: 'narrator',
      content: rootContent,
      title: rootNodeTitle || 'Opening Scene',
      metadata: {},
      version: 1,
      createdBy: user._id,
    });

    // 3) set root on the story
    await ctx.db.patch(storyId, { rootNodeId });

    return storyId;
  },
});

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    await getOrCreateUser(ctx);
  },
});

export async function getOrCreateUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthorized');

  const existing = await ctx.db
    .query('users')
    .withIndex('by_externalId', (q: { eq: (arg0: string, arg1: any) => any }) => q.eq('externalId', identity.subject))
    .unique();

  if (existing) return existing;

  // Seed minimal profile from identity claims
  const displayName = identity.nickname || identity.name || identity.email || 'Player';
  const avatarUrl = identity.picture || undefined;

  const userId = await ctx.db.insert('users', {
    externalId: identity.subject,
    displayName,
    avatarUrl,
    roles: ['player'],
  });

  return await ctx.db.get(userId);
}

export const deleteStory = mutation({
  args: { storyId: v.id('stories') },
  handler: async (ctx, { storyId }) => {
    const user = await me(ctx);
    if (!user) throw new Error('Unauthorized');

    // Load story
    const story = await ctx.db.get(storyId);
    if (!story) throw new Error('Story not found');

    // Authorization: only creator or admin can delete the story
    const isOwner = story.createdBy === user._id;
    const isAdmin = user.roles?.includes('admin');
    if (!isOwner && !isAdmin) {
      throw new Error('You do not have permission to delete this story.');
    }

    // ----- 1. Delete nodes -----
    const nodes = await ctx.db
      .query('nodes')
      .withIndex('by_story', (q) => q.eq('storyId', storyId))
      .collect();

    for (const n of nodes) {
      await ctx.db.delete(n._id);
    }

    // ----- 2. Delete edges -----
    const edges = await ctx.db
      .query('edges')
      .withIndex('by_story_from', (q) => q.eq('storyId', storyId))
      .collect();

    for (const e of edges) {
      await ctx.db.delete(e._id);
    }

    // ----- 3. Delete sessions -----
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_story', (q) => q.eq('storyId', storyId))
      .collect();

    for (const session of sessions) {
      // Delete messages in this session
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect();

      for (const m of messages) {
        await ctx.db.delete(m._id);
      }

      await ctx.db.delete(session._id);
    }

    // ----- 4. Delete drafts -----
    const drafts = await ctx.db
      .query('drafts')
      .withIndex('by_story', (q) => q.eq('storyId', storyId))
      .collect();

    for (const d of drafts) {
      await ctx.db.delete(d._id);
    }

    // ----- 5. Delete savedSuggestions tied to this story -----
    const suggestions = await ctx.db
      .query('savedSuggestions')
      .withIndex('by_user_story', (q) => q.eq('userId', user._id).eq('storyId', storyId))
      .collect();

    for (const s of suggestions) {
      await ctx.db.delete(s._id);
    }

    // ----- 6. Finally delete the story itself -----
    await ctx.db.delete(storyId);

    return { ok: true };
  },
});
