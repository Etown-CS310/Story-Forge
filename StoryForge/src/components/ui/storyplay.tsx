// app/StoryPlay.tsx
// High-level UI for browsing stories, launching a session, rendering the chat timeline,
// and choosing branches. Uses Tailwind and shadcn/ui components.

import React, { useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel'; // Ensure this path is correct and the module exports the Id type
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebouncedCallback } from 'use-debounce';

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Stories</CardTitle>
        </CardHeader>
        <CardContent>
          <NewStoryCard />
          <div className="h-3" />
          <Input placeholder="Search…" onChange={(e) => search(e.target.value)} />
          <div className="mt-3 space-y-2">
            {stories?.map((s) => (
              <StoryRow key={s._id} story={s} onEdit={(id) => setEditingStoryId(id)} />
            ))}
            {stories && stories.length === 0 && <div className="text-sm text-muted-foreground">No stories found.</div>}
          </div>
        </CardContent>
      </Card>

      {editingStoryId ? (
        <StoryEditor storyId={editingStoryId} onClose={() => setEditingStoryId(null)} />
      ) : (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {mySessions?.map((s) => (
                <SessionTile key={s._id} session={s} />
              ))}
              {mySessions && mySessions.length === 0 && (
                <div className="text-sm text-muted-foreground">No sessions yet—start one from the Stories list.</div>
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
    <div className="flex items-center justify-between rounded-xl border p-3">
      <div>
        <div className="font-medium">{story.title}</div>
        {story.summary && <div className="text-sm text-muted-foreground line-clamp-2">{story.summary}</div>}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => onEdit(story._id)}>
          Edit
        </Button>
        <Button
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
        >
          {creating ? 'Starting…' : 'Start'}
        </Button>
      </div>
    </div>
  );
}

function SessionTile({ session }: { session: any }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-2xl border p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{session.title ?? 'Session'}</div>
          <div className="text-xs text-muted-foreground">Story • {session.storyTitle}</div>
        </div>
        <Button variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? 'Close' : 'Open'}
        </Button>
      </div>
      {open && <SessionView sessionId={session._id} />}
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
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Editor</CardTitle>
        </CardHeader>
        <CardContent>Loading…</CardContent>
      </Card>
    );

  const outgoing = selectedNodeId ? graph.edges.filter((e: any) => e.fromNodeId === selectedNodeId) : [];

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Edit Story</CardTitle>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Left: node list */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Nodes</div>
            <ScrollArea className="h-80 rounded-md border p-2">
              <div className="space-y-2">
                {graph.nodes.map((n: any) => (
                  <button
                    key={n._id}
                    className={`w-full text-left rounded-md border px-2 py-1 text-sm ${selectedNodeId === n._id ? 'bg-muted' : ''}`}
                    onClick={() => setSelectedNodeId(n._id)}
                  >
                    <div className="font-medium truncate">{n.role}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{n.content}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Middle: edit node */}
          <div className="space-y-2 md:col-span-2">
            <div className="text-sm font-medium">Selected Node</div>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={8}
              value={nodeContent}
              onChange={(e) => setNodeContent(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  void (async () => {
                    if (!selectedNodeId) return;
                    await updateNode({ nodeId: selectedNodeId, content: nodeContent });
                  })();
                }}
              >
                Save Node
              </Button>
              {selectedNodeId && selectedNodeId === graph.rootNodeId && (
                <span className="text-xs text-muted-foreground self-center">Root</span>
              )}
            </div>

            {/* Outgoing edges */}
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Outgoing Choices</div>
              <div className="space-y-2">
                {outgoing.map((e: any) => {
                  const to = graph.nodes.find((n: any) => n._id === e.toNodeId);
                  return (
                    <div key={e._id} className="flex items-start justify-between rounded-md border p-2">
                      <div>
                        <div className="font-medium text-sm">{e.label}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          → {(to?.content ?? '').slice(0, 120)}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          void (async () => {
                            await deleteEdge({ edgeId: e._id });
                          })();
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  );
                })}
                {outgoing.length === 0 && <div className="text-sm text-muted-foreground">No outgoing edges.</div>}
              </div>

              {/* Create new node + edge */}
              <div className="mt-4 rounded-md border p-3 space-y-2">
                <div className="text-sm font-medium">Add Branch</div>
                <Input
                  placeholder="Choice label"
                  value={newChoiceLabel}
                  onChange={(e) => setNewChoiceLabel(e.target.value)}
                />
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm"
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
                >
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
    <div className="mt-3 space-y-2">
      <div className="text-xs text-muted-foreground">Or link to an existing node:</div>
      <select
        className="w-full rounded-md border px-2 py-2 text-sm"
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
      >
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

  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mt-3 grid grid-cols-1 gap-3">
      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80 rounded-md border p-3">
            <MessageList messages={data.messages} />
          </ScrollArea>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Say something…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) void onSend();
              }}
            />
            <Button
              onClick={() => {
                void onSend();
              }}
            >
              Send
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Choices</CardTitle>
        </CardHeader>
        <CardContent>
          {data.choices.length === 0 ? (
            <div className="text-sm text-muted-foreground">No choices at this step.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.choices.map((c) => (
                <Button
                  key={c._id}
                  variant="secondary"
                  onClick={() => {
                    void choose({ sessionId, edgeId: c._id });
                  }}
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
    <div className="space-y-2">
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
        className={`max-w-[75%] rounded-2xl px-4 py-2 shadow ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
      >
        <div className="text-[10px] opacity-70 mb-1">{author ?? role}</div>
        <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
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
    <div className="rounded-xl border p-3">
      <div className="font-semibold mb-2">New Story</div>
      <div className="space-y-2">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Short summary (optional)" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm"
          rows={4}
          placeholder="Opening scene / root node content…"
          value={rootContent}
          onChange={(e) => setRootContent(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
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
        >
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
