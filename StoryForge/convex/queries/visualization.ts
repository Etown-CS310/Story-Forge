// convex/queries/visualization.ts
import { query } from '../_generated/server';
import { v } from 'convex/values';

export const getStoryMermaid = query({
  args: { storyId: v.id('stories'), isDarkMode: v.optional(v.boolean()) },
  handler: async (ctx, { storyId, isDarkMode }) => {
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

      // Escape text for Mermaid
      const rawDisplayText = node.title
        ? truncate(node.title, 40)
        : truncate(node.content, 40);

      const displayText = escapeMermaidText(rawDisplayText);

      const isRoot = story.rootNodeId === node._id;
      
      if (isRoot) {
        mermaid += `  ${nodeId}[["🏁 ${displayText}"]]\n`;
      } else {
        mermaid += `  ${nodeId}["${displayText}"]\n`;
      }
    }
    
    mermaid += '\n';
    
    for (const edge of edges) {
      const fromId = sanitizeId(edge.fromNodeId);
      const toId = sanitizeId(edge.toNodeId);

      const rawLabel = truncate(edge.label, 30);
      const label = escapeMermaidText(rawLabel);
      
      let suffix = '';
      if (edge.conditions) suffix += ' 🔒';
      if (edge.effects) suffix += ' ⚡';
      
      mermaid += `  ${fromId} -->|"${label}${suffix}"| ${toId}\n`;
    }
    
    if (story.rootNodeId) {
      if (isDarkMode) {
        mermaid += `\n  style ${sanitizeId(story.rootNodeId)} fill:#15803d,stroke:#22c55e,stroke-width:3px,color:#dcfce7\n`;
      } else {
        mermaid += `\n  style ${sanitizeId(story.rootNodeId)} fill:#86efac,stroke:#16a34a,stroke-width:3px,color:#052e16\n`;
      }
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

function escapeMermaidText(text: string): string {
  return text.replace(/"/g, '&quot;');
}
