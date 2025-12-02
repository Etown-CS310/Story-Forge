// convex/image.ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Generate an upload URL for an image file
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Associate an uploaded image with a node
 */
export const attachImageToNode = mutation({
  args: {
    nodeId: v.id('nodes'),
    storageId: v.id('_storage'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) {
      throw new Error('Node not found');
    }

    // Validate uploaded file
    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata) {
      throw new Error('File not found');
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (metadata.size > MAX_SIZE) {
      // Delete the uploaded file since it's too large
      await ctx.storage.delete(args.storageId);
      throw new Error('Image must be smaller than 10MB');
    }

    // Validate it's an image
    if (!metadata.contentType?.startsWith('image/')) {
      await ctx.storage.delete(args.storageId);
      throw new Error('File must be an image');
    }

    // Delete old image if it exists
    if (node.imageStorageId) {
      await ctx.storage.delete(node.imageStorageId);
    }

    // Attach new image
    await ctx.db.patch(args.nodeId, {
      imageStorageId: args.storageId,
    });

    return null;
  },
});

/**
 * Remove image from a node
 */
export const removeImageFromNode = mutation({
  args: {
    nodeId: v.id('nodes'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) {
      throw new Error('Node not found');
    }

    // Delete the image from storage
    if (node.imageStorageId) {
      await ctx.storage.delete(node.imageStorageId);
    }

    // Remove reference from node
    await ctx.db.patch(args.nodeId, {
      imageStorageId: undefined,
    });

    return null;
  },
});

/**
 * Get image URL for a node
 */
export const getNodeImageUrl = query({
  args: {
    nodeId: v.id('nodes'),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node || !node.imageStorageId) {
      return null;
    }

    return await ctx.storage.getUrl(node.imageStorageId);
  },
});

/**
 * Get image metadata for a node
 */
export const getNodeImageMetadata = query({
  args: {
    nodeId: v.id('nodes'),
  },
  returns: v.union(
    v.object({
      _id: v.id('_storage'),
      _creationTime: v.number(),
      contentType: v.optional(v.string()),
      sha256: v.string(),
      size: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node || !node.imageStorageId) {
      return null;
    }

    const metadata = await ctx.db.system.get(node.imageStorageId);
    return metadata;
  },
});