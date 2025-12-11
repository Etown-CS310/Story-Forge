import React from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Edit, Play, Trash2, AlertCircle } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ui/confirmDeleteDialog';

export default function StoryRow({
  story,
  onEdit,
  onStart,
  onDeleted,
}: {
  story: any;
  onEdit: (id: Id<'stories'>) => void;
  onStart?: (sessionId: Id<'sessions'>) => void;
  onDeleted?: () => void;
}) {
  const create = useMutation(api.ui.startSessionForMe);
  const deleteStoryMutation = useMutation(api.ui.deleteStory);
  
  const [creating, setCreating] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string>('');

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    
    try {
      await deleteStoryMutation({ storyId: story._id });
      
      // Success - close dialog and call callback
      setDeleteModalOpen(false);
      onDeleted?.();
    } catch (err) {
      console.error('Failed to delete story:', err);
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete story. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDeleteModalOpen(open);
    if (!open) {
      setDeleteError('');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-md bg-white dark:bg-slate-800">
      <div className="mb-3">
        <div className="font-semibold text-slate-800 dark:text-white text-center">{story.title}</div>
        {story.summary && (
          <div className="text-sm text-slate-600 dark:text-slate-400 text-center line-clamp-2 mt-1">
            {story.summary}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        <ConfirmDeleteDialog
          open={deleteModalOpen}
          onOpenChange={handleDialogOpenChange}
          title="Delete Story"
          description={
            <div className="space-y-3">
              <p>Are you sure you want to delete "{story.title}"? This will also delete all associated sessions and cannot be undone.</p>
              
              {deleteError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>
          }
          confirmLabel="Confirm Delete"
          loading={deleting}
          onConfirm={handleDelete}
        />

        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => onEdit(story._id)} 
          className="gap-1.5 px-3"
        >
          <Edit className="w-3.5 h-3.5" />
          Edit
        </Button>

        <Button
          size="sm"
          disabled={creating}
          onClick={() => {
            void (async () => {
              setCreating(true);
              try {
                const sessionId = await create({ storyId: story._id });
                if (onStart && sessionId) {
                  onStart(sessionId as Id<'sessions'>);
                }
              } catch (error) {
                console.error('Failed to create session:', error);
              } finally {
                setCreating(false);
              }
            })();
          }}
          variant="blue"
          className="gap-1.5 px-3"
        >
          <Play className="w-3.5 h-3.5" />
          {creating ? 'Starting…' : 'Start'}
        </Button>

        <Button 
          variant="destructive" 
          size="sm" 
          disabled={deleting} 
          onClick={() => setDeleteModalOpen(true)}
          className="gap-1.5 px-3"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}