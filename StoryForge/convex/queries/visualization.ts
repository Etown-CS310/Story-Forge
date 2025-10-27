// convex/queries/visualization.ts
import { query } from '../_generated/server';
import { v } from 'convex/values';

export const getStoryMermaid = query({
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

    let mermaid = 'graph TD\n';
    
    for (const node of nodes) {
      const nodeId = sanitizeId(node._id);
      const truncatedContent = truncate(node.content, 40);
      const isRoot = story.rootNodeId === node._id;
      
      if (isRoot) {
        mermaid += `  ${nodeId}[["🏁 ${truncatedContent}"]]\n`;
      } else if (node.role === 'narrator') {
        mermaid += `  ${nodeId}["📖 ${truncatedContent}"]\n`;
      } else if (node.role === 'character') {
        const charName = node.metadata && typeof node.metadata === 'object' && 'name' in node.metadata
          ? (typeof node.metadata.name === 'string' ? node.metadata.name : 'Character')
          : 'Character';
        mermaid += `  ${nodeId}["💬 ${charName}: ${truncatedContent}"]\n`;
      } else {
        mermaid += `  ${nodeId}["${truncatedContent}"]\n`;
      }
    }
    
    mermaid += '\n';
    
    for (const edge of edges) {
      const fromId = sanitizeId(edge.fromNodeId);
      const toId = sanitizeId(edge.toNodeId);
      const label = truncate(edge.label, 30);
      
      let suffix = '';
      if (edge.conditions) suffix += ' 🔒';
      if (edge.effects) suffix += ' ⚡';
      
      mermaid += `  ${fromId} -->|"${label}${suffix}"| ${toId}\n`;
    }
    
    if (story.rootNodeId) {
      mermaid += `\n  style ${sanitizeId(story.rootNodeId)} fill:#90EE90,stroke:#2E8B57,stroke-width:3px\n`;
    }
    
    return {
      storyId,
      title: story.title,
      mermaid,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    };
  },
});

function sanitizeId(id: string): string {
  return 'n' + id.replace(/[^a-zA-Z0-9]/g, '');
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}