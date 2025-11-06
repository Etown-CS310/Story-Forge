import React from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

export default function NewStoryCard() {
  const createStory = useMutation(api.ui.createStory);
  const [title, setTitle] = React.useState('');
  const [nodeTitle, setNodeTitle] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [rootContent, setRootContent] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const canSubmit = title.trim() && rootContent.trim();

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
      <div className="font-semibold mb-3 text-slate-800 dark:text-white flex items-center gap-2">
        <Plus className="w-4 h-4 text-blue-600" />
        New Story
      </div>
      <div className="space-y-3">
        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-white dark:bg-slate-800"
        />
        <Input
          placeholder="Short summary (optional)"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="bg-white dark:bg-slate-800"
        />
        <Input
          placeholder="Opening scene title"
          value={nodeTitle}
          onChange={(e) => setNodeTitle(e.target.value)}
          className="bg-white dark:bg-slate-800"
        />
        <textarea
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-3 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          rows={4}
          placeholder="Opening scene content…"
          value={rootContent}
          onChange={(e) => setRootContent(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600"
          />
          Make public
        </label>

        <Button
          disabled={!canSubmit || submitting}
          onClick={() => {
            void (async () => {
              setSubmitting(true);
              await createStory({
                title: title.trim(),
                summary: summary.trim() || undefined,
                rootContent: rootContent.trim(),
                isPublic,
                rootNodeTitle: nodeTitle.trim() || undefined,
              });
              setTitle('');
              setNodeTitle('');
              setSummary('');
              setRootContent('');
              setIsPublic(false);
              setSubmitting(false);
            })();
          }}
          variant="blue"
          className="w-full gap-2 "
        >
          <Plus className="w-4 h-4" />
          {submitting ? 'Creating…' : 'Create Story'}
        </Button>
      </div>
    </div>
  );
}
