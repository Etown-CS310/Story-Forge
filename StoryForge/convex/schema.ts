// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { title } from 'process';

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  users: defineTable({
    // From your auth provider; keep minimal PII
    externalId: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    roles: v.array(v.string()), // ["admin","author","player"]
  }).index('by_externalId', ['externalId']),

  // A story is a directed acyclic graph of nodes/edges
  stories: defineTable({
    title: v.string(),
    summary: v.optional(v.string()),
    createdBy: v.id('users'),
    public: v.boolean(),
    rootNodeId: v.optional(v.id('nodes')), // set after seed
    tags: v.optional(v.array(v.string())),
    // moderation/versioning
    status: v.optional(v.string()), // "draft" | "published" | "archived"
  })
    .index('by_creator', ['createdBy'])
    .index('by_public', ['public']),

  nodes: defineTable({
    storyId: v.id('stories'),
    // node “content” is the canonical message at that step
    role: v.string(), // "system" | "narrator" | "character" | "user" | "ai"
    title: v.optional(v.string()), // short title for authors to identify nodes
    content: v.string(), // rich text or markdown string; keep assets in storage table
    // optional metadata to drive UI or AI prompts
    metadata: v.optional(v.any()), // e.g., characterId, mood, variables to set, etc.
    // versioning: if authors revise, write a new node and point edges at it
    version: v.number(),
    // bookkeeping
    createdBy: v.id('users'),
  })
    .index('by_story', ['storyId'])
    .index('by_story_role', ['storyId', 'role']),

  edges: defineTable({
    storyId: v.id('stories'),
    fromNodeId: v.id('nodes'),
    toNodeId: v.id('nodes'),
    // what the player sees to pick this branch
    label: v.string(), // e.g., "Ask about the key", "Stay silent"
    // optional gating logic
    conditions: v.optional(v.any()), // e.g., { requiresFlag: "hasKey", minScore: 2 }
    // optional effects applied when chosen
    effects: v.optional(v.any()), // e.g., { setFlag: "metGuard", scoreDelta: +1 }
    order: v.number(), // stable UI ordering
  })
    .index('by_story_from', ['storyId', 'fromNodeId'])
    .index('by_story_to', ['storyId', 'toNodeId']),

  // A playthrough for a user (or group) on a given story
  sessions: defineTable({
    storyId: v.id('stories'),
    createdBy: v.id('users'),
    title: v.optional(v.string()),
    participants: v.array(v.id('users')), // creator included
    // traversal state
    currentNodeId: v.id('nodes'),
    flags: v.optional(v.record(v.string(), v.any())), // key-value state
    score: v.optional(v.number()),
    // visibility
    isGroup: v.boolean(),
  })
    .index('by_story', ['storyId'])
    .index('by_creator', ['createdBy'])
    .index('by_participant', ['participants']),

  // Concrete chat messages shown in a session timeline
  messages: defineTable({
    sessionId: v.id('sessions'),
    nodeId: v.optional(v.id('nodes')), // present for narrative/AI/user mapped to a node
    authorUserId: v.optional(v.id('users')), // present for user-authored chat
    role: v.string(), // "user" | "ai" | "narrator" | "system" | "character"
    content: v.string(),
    // derived from choosing an edge; store for audit
    chosenEdgeId: v.optional(v.id('edges')),
    edgeContent: v.optional(v.string()),
    // read-state
    readBy: v.optional(v.array(v.id('users'))),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_role', ['sessionId', 'role']),

  // Optional: user-proposed branches that aren’t published yet
  drafts: defineTable({
    storyId: v.id('stories'),
    baseNodeId: v.id('nodes'),
    proposedBy: v.id('users'),
    proposedNodes: v.array(
      v.object({
        tempId: v.string(), // client temp ids for wiring edges
        role: v.string(),
        content: v.string(),
        metadata: v.optional(v.any()),
        order: v.number(),
      }),
    ),
    proposedEdges: v.array(
      v.object({
        fromTempOrNodeId: v.string(), // tempId or canonical node id
        toTempOrNodeId: v.string(),
        label: v.string(),
        conditions: v.optional(v.any()),
        effects: v.optional(v.any()),
        order: v.number(),
      }),
    ),
    status: v.string(), // "pending" | "approved" | "rejected"
    reviewerId: v.optional(v.id('users')),
    reviewerNotes: v.optional(v.string()),
  })
    .index('by_story', ['storyId'])
    .index('by_proposer', ['proposedBy']),
});
