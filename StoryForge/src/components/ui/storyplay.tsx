import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDebouncedCallback } from 'use-debounce';
import { BookOpen, Sparkles, Search, MoveLeft, MoveRight, BookOpenText, Plus } from 'lucide-react';
import {
  StoryEditor,
  SessionTile,
  StoryRow,
  NewStoryCard,
  SessionView,
  StoryDialog,
  StoryDialogTooltip,
} from '@/components/ui/story';

// ===================== Story Browser =====================
export default function StoryPlay() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [showNewStoryModal, setShowNewStoryModal] = React.useState(false);
  const [showStoryListModal, setShowStoryListModal] = React.useState(false);
  const [showSearchModal, setShowSearchModal] = React.useState(false);

  const [q, setQ] = React.useState('');
  const search = useDebouncedCallback((s: string) => setQ(s), 250);

  const stories = useQuery(api.ui.listStories, { q });
  const mySessions = useQuery(api.ui.listMySessions, {});
  const [editingStoryId, setEditingStoryId] = React.useState<Id<'stories'> | null>(null);
  const [activeSessionId, setActiveSessionId] = React.useState<Id<'sessions'> | null>(null);
  const ensure = useMutation(api.ui.ensureUser);
  React.useEffect(() => {
    void ensure();
  }, [ensure]);

  return (
    <div
      className={
        `grid grid-cols-1 gap-6 p-6 transition-all duration-300 ` +
        (sidebarOpen ? `lg:grid-cols-[350px_1fr_1fr]` : `lg:grid-cols-[100px_1fr_1fr]`)
      }
    >
      <Card
        className={
          `self-start shadow-lg border-slate-200 dark:border-slate-700 transition-all duration-300 ` +
          (sidebarOpen ? 'lg:col-span-1' : 'lg:col-span-1')
        }
      >
        <CardHeader className="border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="w-5 h-5 text-blue-600" />
              {sidebarOpen && 'Stories'}
            </CardTitle>

            <StoryDialogTooltip label={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
              >
                {sidebarOpen ? <MoveLeft className="w-5 h-5" /> : <MoveRight className="w-5 h-5" />}
              </button>
            </StoryDialogTooltip>
          </div>
        </CardHeader>

        {sidebarOpen && (
          <CardContent className="pt-6">
            <NewStoryCard />
            <div className="h-4" />

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search stories..." onChange={(e) => search(e.target.value)} className="pl-10" />
            </div>

            <div className="mt-4 space-y-3">
              {stories?.map((s) => (
                <StoryRow
                  key={s._id}
                  story={s}
                  onEdit={(id) => {
                    setEditingStoryId(id);
                    setActiveSessionId(null);
                  }}
                  onStart={(sessionId) => {
                    setActiveSessionId(sessionId);
                    setEditingStoryId(null);
                  }}
                />
              ))}

              {stories && stories.length === 0 && (
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No stories found.</div>
              )}
            </div>
          </CardContent>
        )}

        {!sidebarOpen && (
          <CardContent className="pt-4 flex flex-col items-center gap-6">
            <StoryDialogTooltip label="Create New Story">
              <button
                onClick={() => setShowNewStoryModal(true)}
                className="text-slate-600 dark:text-slate-300 hover:text-blue-500"
              >
                <Plus className="w-6 h-6" />
              </button>
            </StoryDialogTooltip>

            <StoryDialogTooltip label="Search Stories">
              <button
                onClick={() => setShowSearchModal(true)}
                className="text-slate-600 dark:text-slate-300 hover:text-blue-500"
              >
                <Search className="w-6 h-6" />
              </button>
            </StoryDialogTooltip>

            <StoryDialogTooltip label="All Stories">
              <button
                onClick={() => setShowStoryListModal(true)}
                className="text-slate-600 dark:text-slate-300 hover:text-blue-500"
              >
                <BookOpenText className="w-6 h-6" />
              </button>
            </StoryDialogTooltip>

            <StoryDialog
              open={showNewStoryModal}
              onOpenChange={setShowNewStoryModal}
              title="Create a New Story"
              onEdit={(id) => {
                setEditingStoryId(id);
                setActiveSessionId(null);
              }}
              onStart={(sessionId: Id<'sessions'>) => {
                setActiveSessionId(sessionId);
                setEditingStoryId(null);
              }}
            >
              <NewStoryCard />
            </StoryDialog>

            <StoryDialog
              open={showSearchModal}
              onOpenChange={setShowSearchModal}
              title="Search Stories"
              enableSearch
              stories={stories}
              onSearch={(txt) => search(txt)}
              onEdit={(id) => {
                setEditingStoryId(id);
                setActiveSessionId(null);
              }}
              onStart={(sessionId) => {
                setActiveSessionId(sessionId);
                setEditingStoryId(null);
              }}
            />

            <StoryDialog
              open={showStoryListModal}
              onOpenChange={setShowStoryListModal}
              title="All Stories"
              stories={stories}
              onEdit={(id) => {
                setEditingStoryId(id);
                setActiveSessionId(null);
              }}
              onStart={(sessionId) => {
                setActiveSessionId(sessionId);
                setEditingStoryId(null);
              }}
            />
          </CardContent>
        )}
      </Card>

      {editingStoryId ? (
        <StoryEditor storyId={editingStoryId} onClose={() => setEditingStoryId(null)} />
      ) : activeSessionId ? (
        // Show the active session in the main area when we have one
        <div className="lg:col-span-2">
          <SessionView sessionId={activeSessionId} closeActiveSession={setActiveSessionId} />
        </div>
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
