import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDebouncedCallback } from 'use-debounce';
import { BookOpen, Sparkles, Search } from 'lucide-react';
import { StoryEditor, SessionTile, StoryRow, NewStoryCard } from '@/components/ui/story';

// ===================== Story Browser =====================
export default function StoryPlay() {
  const [q, setQ] = React.useState('');
  const search = useDebouncedCallback((s: string) => setQ(s), 250);

  const stories = useQuery(api.ui.listStories, { q });
  const mySessions = useQuery(api.ui.listMySessions, {});
  const [editingStoryId, setEditingStoryId] = React.useState<Id<'stories'> | null>(null);
  const ensure = useMutation(api.ui.ensureUser);
  React.useEffect(() => {
    void ensure();
  }, [ensure]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      <Card className="lg:col-span-1 shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Stories
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <NewStoryCard />
          <div className="h-4" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search stories..." onChange={(e) => search(e.target.value)} className="pl-10" />
          </div>
          <div className="mt-4 space-y-3">
            {stories?.map((s) => (
              <StoryRow key={s._id} story={s} onEdit={(id: Id<'stories'>) => setEditingStoryId(id)} />
            ))}
            {stories && stories.length === 0 && (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No stories found.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {editingStoryId ? (
        <StoryEditor storyId={editingStoryId} onClose={() => setEditingStoryId(null)} />
      ) : (
        <Card className="lg:col-span-2 shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-purple-600" />
              My Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {mySessions?.map((s) => (
                <SessionTile key={s._id} session={s} />
              ))}
              {mySessions && mySessions.length === 0 && (
                <div className="col-span-2 text-sm text-slate-500 dark:text-slate-400 text-center py-12">
                  No sessions yet—start one from the Stories list.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
