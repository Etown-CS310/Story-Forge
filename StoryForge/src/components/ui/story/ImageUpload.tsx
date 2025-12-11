// src/components/ui/story/ImageUpload.tsx
import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Image, Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  nodeId: Id<'nodes'>;
}

export default function ImageUpload({ nodeId }: ImageUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.image.generateUploadUrl);
  const attachImage = useMutation(api.image.attachImageToNode);
  const removeImage = useMutation(api.image.removeImageFromNode);
  const imageUrl = useQuery(api.image.getNodeImageUrl, { nodeId });

  const validateAndUploadFile = async (file: File) => {
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
      
      setError('');
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await validateAndUploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await validateAndUploadFile(file);
  };

  const handleRemove = async () => {
    try {
      await removeImage({ nodeId });
      setError('');
    } catch (err) {
      console.error('Remove error:', err);
      setError('Failed to remove image');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => { void handleDrop(e); }}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
              : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {uploading 
                ? 'Uploading...' 
                : isDragging 
                  ? 'Drop image here' 
                  : 'Drag and drop or click to upload'}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => { void handleFileSelect(e); }}
              className="hidden"
              disabled={uploading}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={triggerFileInput}
              className="gap-2"
              type="button"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Choose File
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500 dark:text-slate-400">
        Supported formats: JPG, PNG, GIF, WebP (max 10MB)
      </div>
    </div>
  );
}