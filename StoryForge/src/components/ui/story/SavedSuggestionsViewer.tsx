import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, Sparkles, Trash2, Copy, FileText, PenLine, Plus, Book, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SavedSuggestionsViewerProps {
  onApplySuggestion?: (content: string, title?: string) => void;
  onApplyChoice?: (label: string, description: string, title?: string) => void;
  storyId?: Id<'stories'>;
  nodeId?: Id<'nodes'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SavedSuggestionsViewer({
  onApplySuggestion,
  onApplyChoice,
  storyId,
  nodeId,
  open,
  onOpenChange,
}: SavedSuggestionsViewerProps) {
  const [filterType, setFilterType] = React.useState<string>('all');
  const [selectedId, setSelectedId] = React.useState<Id<'savedSuggestions'> | null>(null);
  const [note, setNote] = React.useState('');
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<Id<'savedSuggestions'> | null>(null);
  const [copySuccess, setCopySuccess] = React.useState<boolean>(false);

  const suggestions = useQuery(api.suggestions.listMySuggestions, {
    storyId,
    nodeId,
    type: filterType === 'all' ? undefined : filterType,
  });

  const selectedSuggestion = useQuery(
    api.suggestions.getSuggestion,
    selectedId ? { id: selectedId } : 'skip'
  );

  const deleteSuggestion = useMutation(api.suggestions.deleteSuggestion);
  const updateNote = useMutation(api.suggestions.updateSuggestionNote);

  // Reset filter when modal closes
  React.useEffect(() => {
    if (!open) {
      setFilterType('all');
    }
  }, [open]);

  React.useEffect(() => {
    if (selectedSuggestion && selectedSuggestion.note) {
      setNote(selectedSuggestion.note);
    } else {
      setNote('');
    }
  }, [selectedSuggestion]);

  // Reset copy success after 2 seconds
  React.useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  const handleDelete = async (id: Id<'savedSuggestions'>) => {
    await deleteSuggestion({ id });
    if (selectedId === id) {
      setSelectedId(null);
    }
    setDeleteConfirmId(null);
  };

  const handleUpdateNote = async () => {
    if (!selectedId) return;
    await updateNote({ id: selectedId, note });
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true);
      })
      .catch((err) => console.error('Failed to copy:', err));
  };

  if (!suggestions) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Book className="w-5 h-5 text-blue-600" />
              Saved Suggestions
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-700 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Book className="w-5 h-5 text-blue-600" />
              Saved Suggestions
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden pt-6 space-y-4">
            {/* Filter buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {['all', 'improvement', 'choices', 'rewrite', 'enhance'].map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={filterType === type ? 'default' : 'outline'}
                  onClick={() => setFilterType(type)}
                  className="capitalize"
                >
                  {type}
                </Button>
            ))}
          </div>

          {suggestions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No saved suggestions yet.</p>
              <p className="text-sm mt-1">Click "Save" on AI suggestions to save them for later.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3 pr-2">
                {suggestions.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all bg-white dark:bg-slate-800 cursor-pointer"
                    onClick={() => setSelectedId(item._id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {item.type === 'improvement' && (
                          <Lightbulb className="w-4 h-4 text-amber-600" />
                        )}
                        {item.type === 'choices' && (
                          <Sparkles className="w-4 h-4 text-purple-600" />
                        )}
                        {item.type === 'rewrite' && (
                          <PenLine className="w-4 h-4 text-blue-600" />
                        )}
                        {item.type === 'enhance' && (
                          <Plus className="w-4 h-4 text-green-600" />
                        )}
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                          {item.type}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(item._id);
                        }}
                        className="gap-2 hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                      {item.originalContent.slice(0, 100)}...
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {new Date(item._creationTime).toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <Dialog open={!!deleteConfirmId} onOpenChange={(isOpen: boolean) => !isOpen && setDeleteConfirmId(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete saved suggestion?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete this saved suggestion.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setDeleteConfirmId(null)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleteConfirmId) {
                handleDelete(deleteConfirmId).catch((err) => console.error('Failed to delete:', err));
              }
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Copy Success Indicator */}
    {copySuccess && (
      <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5">
        <Check className="w-4 h-4" />
        Copied to clipboard!
      </div>
    )}

    {/* Detail Dialog */}
    <Dialog open={!!selectedId} onOpenChange={(isOpen: boolean) => !isOpen && setSelectedId(null)}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Saved Suggestion Details
          </DialogTitle>
          <DialogDescription>
              {selectedSuggestion && new Date(selectedSuggestion._creationTime).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedSuggestion && (
            <div className="space-y-4 mt-4">
              {/* Original Content */}
              <div>
                <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                  Original Content
                </h3>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {selectedSuggestion.originalContent}
                </div>
              </div>

              {/* Improvement Suggestions */}
              {selectedSuggestion.type === 'improvement' && selectedSuggestion.suggestions && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-amber-700 dark:text-amber-300">
                    Suggestions
                  </h3>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                    {selectedSuggestion.suggestions}
                  </div>
                </div>
              )}

              {/* Example Edits */}
              {selectedSuggestion.exampleEdits && (
                <div className="space-y-3">
                  {selectedSuggestion.exampleEdits.sceneTitle && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-blue-700 dark:text-blue-300">
                        Suggested Title
                      </h3>
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 text-sm text-blue-900 dark:text-blue-100">
                        {selectedSuggestion.exampleEdits.sceneTitle}
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-blue-700 dark:text-blue-300 flex items-center justify-between">
                      <span>Revised Text</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyToClipboard(selectedSuggestion.exampleEdits!.revisedText)}
                          className="gap-2 h-7"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </Button>
                        {onApplySuggestion && (
                          <Button
                            size="sm"
                            onClick={() => {
                              onApplySuggestion(
                                selectedSuggestion.exampleEdits!.revisedText,
                                selectedSuggestion.exampleEdits!.sceneTitle
                              );
                              setSelectedId(null);
                            }}
                            className="h-7"
                          >
                            Apply to Editor
                          </Button>
                        )}
                      </div>
                    </h3>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                      {selectedSuggestion.exampleEdits.revisedText}
                    </div>
                  </div>
                  {selectedSuggestion.exampleEdits.analysis && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-green-700 dark:text-green-300">
                        Analysis
                      </h3>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
                        {selectedSuggestion.exampleEdits.analysis}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Generated Choices */}
              {selectedSuggestion.choices && selectedSuggestion.choices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-purple-700 dark:text-purple-300">
                    Generated Choices
                  </h3>
                  <div className="space-y-2">
                    {selectedSuggestion.choices.map((choice) => (
                      <div
                        key={`${choice.label}-${choice.title ?? ''}-${choice.description.slice(0, 20)}`}
                        className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                              {choice.label}
                            </h4>
                            {choice.title && (
                              <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                                Scene: {choice.title}
                              </div>
                            )}
                          </div>
                          {onApplyChoice && (
                            <Button
                              size="sm"
                              onClick={() => {
                                onApplyChoice(choice.label, choice.description, choice.title);
                                setSelectedId(null);
                              }}
                              className="h-7"
                            >
                              Add to Story
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          {choice.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rewrite/Enhance Content */}
              {selectedSuggestion.content && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Generated Content</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyToClipboard(selectedSuggestion.content ?? '')}
                        className="gap-2 h-7"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </Button>
                      {onApplySuggestion && (
                        <Button
                          size="sm"
                          onClick={() => {
                            onApplySuggestion(selectedSuggestion.content ?? '');
                            setSelectedId(null);
                          }}
                          className="h-7"
                        >
                          Apply to Editor
                        </Button>
                      )}
                    </div>
                  </h3>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedSuggestion.content}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                  Notes
                </h3>
                <div className="flex gap-2">
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note about this suggestion..."
                    className="flex-1"
                  />
                  <Button onClick={() => { void handleUpdateNote(); }} size="sm">
                    Save Note
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}