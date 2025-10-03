// app/StoryPlay.tsx
// High-level UI for browsing stories, launching a session, rendering the chat timeline,
// and choosing branches. Uses Tailwind and shadcn/ui components.

import React, { useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebouncedCallback } from 'use-debounce';
import { BookOpen, Play, Edit, X, Save, Plus, Link, Trash2, Send, Sparkles, Search } from 'lucide-react';

// ===================== Story Browser =====================
export default function StoryPlay() {
  const [q, setQ] = React.useState('');
  const search = useDebouncedCallback((s: string) => setQ(s), 250);

  const stories = useQuery(api.ui.listPublishedStories, { q });
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
            <Input 
              placeholder="Search stories..." 
              onChange={(e) => search(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="mt-4 space-y-3">
            {stories?.map((s) => (
              <StoryRow key={s._id} story={s} onEdit={(id) => setEditingStoryId(id)} />
            ))}
            {stories && stories.length === 0 && (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                No stories found.
              </div>
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

function StoryRow({ story, onEdit }: { story: any; onEdit: (id: Id<'stories'>) => void }) {
  const create = useMutation(api.ui.startSessionForMe);
  const [creating, setCreating] = React.useState(false);

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-md bg-white dark:bg-slate-800">
      <div className="flex-1 min-w-0 pr-3">
        <div className="font-semibold text-slate-800 dark:text-white">{story.title}</div>
        {story.summary && (
          <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
            {story.summary}
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
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
                await create({ storyId: story._id });
              } catch (error) {
                console.error('Failed to create session:', error);
              } finally {
                setCreating(false);
              }
            })();
          }}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Play className="w-4 h-4" />
          {creating ? 'Starting…' : 'Start'}
        </Button>
      </div>
    </div>
  );
}

function SessionTile({ session }: { session: any }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 dark:text-white truncate">
            {session.title ?? 'Session'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Story • {session.storyTitle}
          </div>
        </div>
        <Button 
          variant={open ? "secondary" : "outline"} 
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="flex-shrink-0"
        >
          {open ? 'Close' : 'Open'}
        </Button>
      </div>
      {open && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <SessionView sessionId={session._id} />
        </div>
      )}
    </div>
  );
}

// ===================== Session View =====================

// -------- Story Editor (authoring) --------
function StoryEditor({ storyId, onClose }: { storyId: Id<'stories'>; onClose: () => void }) {
  const graph = useQuery(api.ui.getStoryGraph, { storyId });
  const createNodeAndEdge = useMutation(api.ui.createNodeAndEdge);
  const updateNode = useMutation(api.ui.updateNodeContent);
  const createEdge = useMutation(api.ui.createEdge);
  const deleteEdge = useMutation(api.ui.deleteEdge);

  const [selectedNodeId, setSelectedNodeId] = React.useState<Id<'nodes'> | null>(null);
  const [nodeContent, setNodeContent] = React.useState('');
  const [newChoiceLabel, setNewChoiceLabel] = React.useState('');
  const [newNodeContent, setNewNodeContent] = React.useState('');

  React.useEffect(() => {
    if (!graph) return;
    if (!selectedNodeId && graph.rootNodeId) setSelectedNodeId(graph.rootNodeId as Id<'nodes'>);
    const sel = graph.nodes.find((n: any) => n._id === selectedNodeId);
    setNodeContent(sel?.content ?? '');
  }, [graph, selectedNodeId]);

  if (!graph)
    return (
      <Card className="lg:col-span-2 shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-600" />
            Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );

  const outgoing = selectedNodeId ? graph.edges.filter((e: any) => e.fromNodeId === selectedNodeId) : [];

  return (
    <Card className="lg:col-span-2 shadow-lg border-slate-200 dark:border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-700">
        <CardTitle className="flex items-center gap-2">
          <Edit className="w-5 h-5 text-blue-600" />
          Edit Story
        </CardTitle>
        <Button variant="outline" onClick={onClose} className="gap-2">
          <X className="w-4 h-4" />
          Close
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: node list */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nodes</div>
            <ScrollArea className="h-96 rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900">
              <div className="space-y-2">
                {graph.nodes.map((n: any) => (
                  <button
                    key={n._id}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-all duration-200 ${
                      selectedNodeId === n._id
                        ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'
                    }`}
                    onClick={() => setSelectedNodeId(n._id)}
                  >
                    <div className="font-medium truncate text-slate-800 dark:text-white">{n.role}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">{n.content}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Middle: edit node */}
          <div className="space-y-4 md:col-span-2">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Selected Node</div>
            <textarea
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              rows={8}
              value={nodeContent}
              onChange={(e) => setNodeContent(e.target.value)}
            />
            <div className="flex gap-3 items-center">
              <Button
                onClick={() => {
                  void (async () => {
                    if (!selectedNodeId) return;
                    await updateNode({ nodeId: selectedNodeId, content: nodeContent });
                  })();
                }}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save Node
              </Button>
              {selectedNodeId && selectedNodeId === graph.rootNodeId && (
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                  Root Node
                </span>
              )}
            </div>

            {/* Outgoing edges */}
            <div className="mt-6">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Outgoing Choices</div>
              <div className="space-y-3">
                {outgoing.map((e: any) => {
                  const to = graph.nodes.find((n: any) => n._id === e.toNodeId);
                  return (
                    <div key={e._id} className="flex items-start justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-medium text-sm text-slate-800 dark:text-white">{e.label}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                          → {(to?.content ?? '').slice(0, 120)}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          void (async () => {
                            await deleteEdge({ edgeId: e._id });
                          })();
                        }}
                        className="flex-shrink-0 gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  );
                })}
                {outgoing.length === 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                    No outgoing edges.
                  </div>
                )}
              </div>

              {/* Create new node + edge */}
              <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4 bg-slate-50 dark:bg-slate-900">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Branch
                </div>
                <Input
                  placeholder="Choice label"
                  value={newChoiceLabel}
                  onChange={(e) => setNewChoiceLabel(e.target.value)}
                />
                <textarea
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows={4}
                  placeholder="New node content…"
                  value={newNodeContent}
                  onChange={(e) => setNewNodeContent(e.target.value)}
                />
                <Button
                  onClick={() => {
                    void (async () => {
                      if (!selectedNodeId) return;
                      const label = newChoiceLabel.trim();
                      const content = newNodeContent.trim();
                      if (!label || !content) return;
                      await createNodeAndEdge({ storyId, fromNodeId: selectedNodeId, label, content });
                      setNewChoiceLabel('');
                      setNewNodeContent('');
                    })();
                  }}
                  className="gap-2 w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Choice → New Node
                </Button>

                {/* Or connect to existing node */}
                <ExistingEdgeCreator
                  nodes={graph.nodes}
                  fromNodeId={selectedNodeId}
                  onCreate={async (toNodeId, label) => {
                    await createEdge({ storyId, fromNodeId: selectedNodeId as Id<'nodes'>, toNodeId, label });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExistingEdgeCreator({
  nodes,
  fromNodeId,
  onCreate,
}: {
  nodes: any[];
  fromNodeId: Id<'nodes'> | null;
  onCreate: (toNodeId: Id<'nodes'>, label: string) => Promise<void>;
}) {
  const [toNodeId, setToNodeId] = React.useState<string>('');
  const [label, setLabel] = React.useState('');
  const options = nodes.filter((n) => n._id !== fromNodeId);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
        <Link className="w-3.5 h-3.5" />
        Or link to an existing node:
      </div>
      <select
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        value={toNodeId}
        onChange={(e) => setToNodeId(e.target.value)}
      >
        <option value="">— Select node —</option>
        {options.map((n) => (
          <option key={n._id} value={n._id}>
            {(n.content ?? '').slice(0, 80)}
          </option>
        ))}
      </select>
      <Input placeholder="Choice label" value={label} onChange={(e) => setLabel(e.target.value)} />
      <Button
        disabled={!toNodeId || !label.trim()}
        onClick={() => {
          onCreate(toNodeId as Id<'nodes'>, label.trim())
            .then(() => {
              setLabel('');
              setToNodeId('');
            })
            .catch((error) => {
              console.error('Failed to create edge:', error);
            });
        }}
        className="gap-2 w-full"
        variant="secondary"
      >
        <Link className="w-4 h-4" />
        Link Edge
      </Button>
    </div>
  );
}

// ===================== Session View =====================
function SessionView({ sessionId }: { sessionId: Id<'sessions'> }) {
  const data = useQuery(api.ui.getSessionState, { sessionId });
  const send = useMutation(api.ui.sendUserMessage);
  const choose = useMutation(api.ui.chooseEdge);

  const [draft, setDraft] = React.useState('');
  const onSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await send({ sessionId, content: text });
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-md">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
          <CardTitle className="text-lg">Chat</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ScrollArea className="h-80 rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900">
            <MessageList messages={data.messages} />
          </ScrollArea>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Say something…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) void onSend();
              }}
              className="flex-1"
            />
            <Button
              onClick={() => {
                void onSend();
              }}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
          <CardTitle className="text-lg">Choices</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {data.choices.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              No choices at this step.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.choices.map((c) => (
                <Button
                  key={c._id}
                  variant="secondary"
                  onClick={() => {
                    void choose({ sessionId, edgeId: c._id });
                  }}
                  className="hover:bg-blue-100 dark:hover:bg-blue-900 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                >
                  {c.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MessageList({ messages }: { messages: any[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <MessageBubble key={m._id} role={m.role} author={m.author} content={m.content} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ role, author, content }: { role: string; author?: string; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm transition-all ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700'
        }`}
      >
        <div className={`text-[10px] mb-1.5 font-medium ${isUser ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
          {author ?? role}
        </div>
        <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{content}</div>
      </div>
    </div>
  );
}

function NewStoryCard() {
  const createStory = useMutation(api.ui.createStory);
  const [title, setTitle] = React.useState('');
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
        <textarea
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-3 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          rows={4}
          placeholder="Opening scene / root node content…"
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
              });
              setTitle('');
              setSummary('');
              setRootContent('');
              setIsPublic(false);
              setSubmitting(false);
            })();
          }}
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {submitting ? 'Creating…' : 'Create Story'}
        </Button>
      </div>
    </div>
  );
}

// ===================== Convex server: UI-optimized functions =====================
// Place the following in convex/ui.ts, and export through api in convex/_generated/api.

// ===================== Notes =====================
// 1) Add routes to your app router and mount <StoryPlay/> where desired.
// 2) Ensure shadcn/ui is set up; swap for your own components if not.
// 3) For large timelines, paginate getSessionState() with a cursor on messages.by_session.
// 4) To display character avatars, extend MessageBubble to use node metadata.
// 5) To gate choices, implement a `passes(conditions, session.flags, session.score)` helper on server.
