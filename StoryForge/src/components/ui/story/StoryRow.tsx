import React from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Edit, Play } from 'lucide-react';

export default function StoryRow({
  story,
  onEdit,
  onStart,
  onDelete,
}: {
  story: any;
  onEdit: (id: Id<'stories'>) => void;
  onStart?: (sessionId: Id<'sessions'>) => void;
  onDelete: (id: Id<'stories'>) => Promise<void>;
}) {
  const create = useMutation(api.ui.startSessionForMe);
  const [creating, setCreating] = React.useState(false);

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

      <div className="flex justify-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            void (async () => {
              try {
                await onDelete(story._id);
              } catch (error) {
                console.error('Failed to delete story:', error);
              }
            })();
          }}
          className="gap-2"
        >
          Delete
        </Button>

        <Button variant="secondary" size="sm" onClick={() => onEdit(story._id)} className="gap-2">
          <Edit className="w-4 h-4" />
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
          className="gap-2"
        >
          <Play className="w-4 h-4" />
          {creating ? 'Starting…' : 'Start'}
        </Button>
      </div>
    </div>
  );
}
