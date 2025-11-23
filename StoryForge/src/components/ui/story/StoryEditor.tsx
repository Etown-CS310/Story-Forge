import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Link, Plus, Save, Trash2, X, Network, Maximize2, Minimize2 } from 'lucide-react';
import StoryGraphViewer from './StoryGraphViewer';
import AIAssistant from './AIAssistant';
import { Textarea } from '../textarea';

export default function StoryEditor({ storyId, onClose }: { storyId: Id<'stories'>; onClose: () => void }) {
  const graph = useQuery(api.ui.getStoryGraph, { storyId });
  const createNodeAndEdge = useMutation(api.ui.createNodeAndEdge);
  const updateNode = useMutation(api.ui.updateNodeContent);
  const updateNodeTitle = useMutation(api.ui.updateNodeTitle);
  const createEdge = useMutation(api.ui.createEdge);
  const deleteEdge = useMutation(api.ui.deleteEdge);

  const [viewMode, setViewMode] = React.useState<'edit' | 'graph'>('graph');
  const [selectedNodeId, setSelectedNodeId] = React.useState<Id<'nodes'> | null>(null);
  const [nodeContent, setNodeContent] = React.useState('');
  const [nodeTitle, setNodeTitle] = React.useState('');
  const [newChoiceLabel, setNewChoiceLabel] = React.useState('');
  const [newNodeContent, setNewNodeContent] = React.useState('');
  const [isFullHeight, setIsFullHeight] = React.useState(false);

  React.useEffect(() => {
    if (!graph) return;
    if (!selectedNodeId && graph.rootNodeId) setSelectedNodeId(graph.rootNodeId as Id<'nodes'>);
    const sel = graph.nodes.find((n: any) => n._id === selectedNodeId);
    setNodeContent(sel?.content ?? '');
    setNodeTitle(sel?.title ?? '');
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
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                viewMode === 'graph'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Graph
            </button>
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                viewMode === 'edit'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="w-4 h-4" />
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {viewMode === 'graph' ? (
          <StoryGraphViewer storyId={storyId} />
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left: node list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Scenes</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullHeight(!isFullHeight)}
                  className="gap-1.5 h-7 text-xs"
                >
                  {isFullHeight ? (
                    <>
                      <Minimize2 className="w-3 h-3" />
                      Normal
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3" />
                      Expand
                    </>
                  )}
                </Button>
              </div>
              <ScrollArea
                className={`rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${
                  isFullHeight ? 'h-[48rem]' : 'h-96'
                }`}
              >
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
                      <div className="font-medium truncate text-slate-800 dark:text-white">{n.title}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">{n.content}</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Middle: edit node */}
            <div className="space-y-4 md:col-span-2">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Selected Scene</div>
              <div className="flex items-center gap-3 col-span-2">
                <Input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Scene Title"
                  value={nodeTitle}
                  onChange={(e) => {
                    setNodeTitle(e.target.value);
                  }}
                />
                <Button
                  variant="blue"
                  className="gap-2"
                  onClick={() => {
                    void (async () => {
                      if (!selectedNodeId) return;
                      await updateNodeTitle({ nodeId: selectedNodeId, title: nodeTitle });
                    })();
                  }}
                >
                  <Save className="w-4 h-4" />
                  Save Title
                </Button>
              </div>
              <Textarea
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                rows={8}
                value={nodeContent}
                onChange={(e) => setNodeContent(e.target.value)}
              />
              <AIAssistant
                content={nodeContent}
                onApplySuggestion={(newContent) => setNodeContent(newContent)}
                onGenerateChoice={(label, description) => {
                  setNewChoiceLabel(label);
                  setNewNodeContent(description);
                }}
              />
              <div className="flex gap-3 items-center">
                <Button
                  onClick={() => {
                    void (async () => {
                      if (!selectedNodeId) return;
                      await updateNode({ nodeId: selectedNodeId, content: nodeContent });
                    })();
                  }}
                  variant="blue"
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Scene
                </Button>
                {selectedNodeId && selectedNodeId === graph.rootNodeId && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                    Root
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
                      <div
                        key={e._id}
                        className="flex items-start justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                      >
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
                    Add Scene
                  </div>
                  <Input
                    placeholder="Path Label"
                    value={newChoiceLabel}
                    onChange={(e) => setNewChoiceLabel(e.target.value)}
                  />
                  <Textarea
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    rows={4}
                    placeholder="New scene content…"
                    value={newNodeContent}
                    onChange={(e) => setNewNodeContent(e.target.value)}
                  />
                  <Button
                    disabled={!newChoiceLabel.trim() || !newNodeContent.trim()}
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
                    variant="blue"
                    className="gap-2 w-full"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Path and Scene
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
        )}
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
        Or link to an existing scene:
      </div>
      <select
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        value={toNodeId}
        onChange={(e) => setToNodeId(e.target.value)}
      >
        <option value="">— Select scene —</option>
        {options.map((n) => (
          <option key={n._id} value={n._id}>
            {(n.content ?? '').slice(0, 80)}
          </option>
        ))}
      </select>
      <Input placeholder="Path Label" value={label} onChange={(e) => setLabel(e.target.value)} />
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
        variant="blue"
        className="gap-2 w-full"
      >
        <Link className="w-4 h-4" />
        Link to Scene
      </Button>
    </div>
  );
}
