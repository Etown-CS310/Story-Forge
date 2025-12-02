// src/components/ui/story/ImageUpload.tsx
import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api'; // Ensure this path and structure are correct
// If `image` is missing, verify the API definition and add the necessary endpoints
import { Id } from '@/../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Image, Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  nodeId: Id<'nodes'>;
}

export default function ImageUpload({ nodeId }: ImageUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.image.generateUploadUrl);
  const attachImage = useMutation(api.image.attachImageToNode);
  const removeImage = useMutation(api.image.removeImageFromNode);
  const imageUrl = useQuery(api.image.getNodeImageUrl, { nodeId });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error('Upload failed');
      }

      const { storageId } = await result.json();

      // Attach to node
      await attachImage({
        nodeId,
        storageId: storageId as Id<'_storage'>,
      });
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    try {
      await removeImage({ nodeId });
    } catch (err) {
      console.error('Remove error:', err);
      setError('Failed to remove image');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Image className="w-4 h-4" />
          Scene Image
        </div>
        {imageUrl && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { void handleRemove(); }}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Remove
          </Button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
          {error}
        </div>
      )}

      {imageUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
          <img
            src={imageUrl}
            alt="Scene"
            className="w-full h-auto max-h-96 object-contain bg-slate-50 dark:bg-slate-900"
          />
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center bg-slate-50 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 text-slate-400" />
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {uploading ? 'Uploading...' : 'No image attached'}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => { void handleFileSelect(e); }}
              className="hidden"
              id={`image-upload-${nodeId}`}
              disabled={uploading}
            />
            <label htmlFor={`image-upload-${nodeId}`}>
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                className="gap-2 cursor-pointer"
                asChild
              >
                <span>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Image
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500 dark:text-slate-400">
        Supported formats: JPG, PNG, GIF, WebP (max 10MB)
      </div>
    </div>
  );
}