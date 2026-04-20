import React from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, Wand2, Lightbulb, AlertCircle, Loader2, ChevronDown, ChevronUp, PenLine, Plus, MessageSquare, Save, Check, Book } from 'lucide-react';
import { Id } from '@/../convex/_generated/dataModel';

interface AIAssistantProps {
  content: string;
  onApplySuggestion: (newContent: string, newTitle?: string) => void;
  onGenerateChoice: (label: string, description: string, title?: string) => void;
  storyId?: Id<'stories'>;
  nodeId?: Id<'nodes'>;
  onOpenSavedViewer?: () => void;
}

interface ExampleEdits {
  sceneTitle: string;
  revisedText: string;
  analysis: string;
}

export default function AIAssistant({ content, onApplySuggestion, onGenerateChoice, storyId, nodeId, onOpenSavedViewer }: AIAssistantProps) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string>('');
  const [lastResultType, setLastResultType] = React.useState<'rewrite' | 'enhance'>('rewrite');
  const [suggestions, setSuggestions] = React.useState<string>('');
  const [exampleEdits, setExampleEdits] = React.useState<ExampleEdits | null>(null);
  const [generatedChoices, setGeneratedChoices] = React.useState<Array<{ label: string; description: string; title?: string }>>([]);
  const [error, setError] = React.useState<string>('');
  const [saveError, setSaveError] = React.useState<string>('');
  const [customTone, setCustomTone] = React.useState('');
  const [expandLength, setExpandLength] = React.useState('2-3 paragraphs');
  const [expandLengthError, setExpandLengthError] = React.useState<string>('');
  const [feedback, setFeedback] = React.useState('');
  const [feedbackResult, setFeedbackResult] = React.useState('');
  const [collapsed, setCollapsed] = React.useState(false);
  const [apiKeyMissing, setApiKeyMissing] = React.useState(false);
  const [savedSuggestion, setSavedSuggestion] = React.useState(false);
  const [savedChoices, setSavedChoices] = React.useState(false);
  const [savedRewrite, setSavedRewrite] = React.useState(false);
  const [savedFeedback, setSavedFeedback] = React.useState(false);

  const suggestImprovements = useAction(api.ai.suggestImprovements);
  const rewriteContent = useAction(api.ai.rewriteContent);
  const enhanceContent = useAction(api.ai.enhanceContent);
  const generateChoices = useAction(api.ai.generateChoices);
  const saveSuggestion = useMutation(api.suggestions.saveSuggestion);

  // Store timeout IDs for cleanup
  const timeoutsRef = React.useRef<NodeJS.Timeout[]>([]);

  // Clear save error after 3 seconds
  React.useEffect(() => {
    if (saveError) {
      const timer = setTimeout(() => setSaveError(''), 3000);
      timeoutsRef.current.push(timer);
      return () => clearTimeout(timer);
    }
  }, [saveError]);

  // Cleanup all timeouts on unmount
  React.useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Moved after all state declarations for better organization
  const clearResults = () => {
    setError('');
    setSaveError('');
    setResult('');
    setSuggestions('');
    setExampleEdits(null);
    setGeneratedChoices([]);
    setFeedbackResult('');
    setSavedSuggestion(false);
    setSavedChoices(false);
    setSavedRewrite(false);
    setSavedFeedback(false);
  };

  const validateExpandLength = (value: string): boolean => {
    // Allow formats: "2", "2-3", "2-3 paragraphs"
    const pattern = /^\d+(-\d+)?(\s+paragraphs?)?$/i;
    return pattern.test(value.trim());
  };

  React.useEffect(() => {
    const checkAPIKey = async () => {
      try {
        await suggestImprovements({ content: '' });
        setApiKeyMissing(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes('OPENAI_API_KEY')) {
          setApiKeyMissing(true);
        }
      }
    };
    void checkAPIKey();
  }, [suggestImprovements]);

  const handleSuggest = async () => {
    if (!content.trim()) {
      setError('No content to analyze');
      return;
    }

    setLoading(true);
    clearResults();

    try {
      const response = await suggestImprovements({ content });
      if (response.exampleEdits && response.suggestions) {
        setSuggestions(response.suggestions);
        setExampleEdits(response.exampleEdits);
      } else {
        setError('AI response missing required fields. Please try again.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('OPENAI_API_KEY')) {
        setApiKeyMissing(true);
        setError('AI service is not configured. Please contact support.');
        console.error('OpenAI API key not configured. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError('Failed to get suggestions. Please try again.');
        console.error('Suggestion error:', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSuggestion = async () => {
    if (!suggestions || !exampleEdits) return;
    
    try {
      await saveSuggestion({
        storyId,
        nodeId,
        type: 'improvement',
        originalContent: content,
        suggestions,
        exampleEdits,
      });
      setSavedSuggestion(true);
      const timer = setTimeout(() => setSavedSuggestion(false), 2000);
      timeoutsRef.current.push(timer);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setSaveError('Failed to save suggestion. Please try again.');
      console.error('Save error:', errorMsg);
    }
  };

  const handleSaveChoices = async () => {
    if (generatedChoices.length === 0) return;
    
    try {
      await saveSuggestion({
        storyId,
        nodeId,
        type: 'choices',
        originalContent: content,
        choices: generatedChoices,
      });
      setSavedChoices(true);
      const timer = setTimeout(() => setSavedChoices(false), 2000);
      timeoutsRef.current.push(timer);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setSaveError('Failed to save choices. Please try again.');
      console.error('Save error:', errorMsg);
    }
  };

  const handleSaveRewrite = async () => {
    if (!result) return;
    
    try {
      await saveSuggestion({
        storyId,
        nodeId,
        type: lastResultType,
        originalContent: content,
        content: result,
      });
      setSavedRewrite(true);
      const timer = setTimeout(() => setSavedRewrite(false), 2000);
      timeoutsRef.current.push(timer);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setSaveError('Failed to save rewrite. Please try again.');
      console.error('Save error:', errorMsg);
    }
  };

  const handleSaveFeedback = async () => {
    if (!feedbackResult) return;
    
    try {
      await saveSuggestion({
        storyId,
        nodeId,
        type: 'rewrite',
        originalContent: content,
        content: feedbackResult,
      });
      setSavedFeedback(true);
      const timer = setTimeout(() => setSavedFeedback(false), 2000);
      timeoutsRef.current.push(timer);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setSaveError('Failed to save feedback result. Please try again.');
      console.error('Save error:', errorMsg);
    }
  };

  const handleRewrite = async () => {
    if (!content.trim()) {
      setError('No content to rewrite');
      return;
    }

    setLoading(true);
    clearResults();

    try {
      const rewritten = await rewriteContent({ content });
      setResult(rewritten);
      setLastResultType('rewrite');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('OPENAI_API_KEY')) {
        setApiKeyMissing(true);
        setError('AI service is not configured. Please contact support.');
        console.error('OpenAI API key not configured. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError('Failed to rewrite content. Please try again.');
        console.error('Rewrite error:', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTone = async () => {
    if (!content.trim()) {
      setError('No content to rewrite');
      return;
    }

    if (!customTone.trim()) {
      setError('Please enter a tone');
      return;
    }

    setLoading(true);
    clearResults();

    try {
      const rewritten = await rewriteContent({ content, tone: customTone });
      setResult(rewritten);
      setLastResultType('rewrite');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('OPENAI_API_KEY')) {
        setApiKeyMissing(true);
        setError('AI service is not configured. Please contact support.');
        console.error('OpenAI API key not configured. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError('Failed to apply tone. Please try again.');
        console.error('Tone error:', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!content.trim()) {
      setError('No content to enhance');
      return;
    }

    // Only check expandLengthError state (set by real-time validation)
    if (expandLengthError) {
      return;
    }

    setLoading(true);
    clearResults();

    try {
      const enhanced = await enhanceContent({ content, targetLength: expandLength.trim() });
      setResult(enhanced);
      setLastResultType('enhance');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('OPENAI_API_KEY')) {
        setApiKeyMissing(true);
        setError('AI service is not configured. Please contact support.');
        console.error('OpenAI API key not configured. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError('Failed to enhance content. Please try again.');
        console.error('Enhance error:', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateChoices = async () => {
    if (!content.trim()) {
      setError('No content to generate choices from');
      return;
    }

    setLoading(true);
    clearResults();

    try {
      const choices = await generateChoices({ content, numChoices: 3 });
      if (choices.choices && Array.isArray(choices.choices)) {
        const validChoices = choices.choices.filter((c: any) => c.label && c.description);
        
        if (validChoices.length === 0) {
          setError('No valid choices generated. Please try again.');
          setLoading(false);
          return;
        }
        
        setGeneratedChoices(validChoices);
      } else {
        setError('Failed to generate choices. Please try again.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('OPENAI_API_KEY')) {
        setApiKeyMissing(true);
        setError('AI service is not configured. Please contact support.');
        console.error('OpenAI API key not configured. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError('Failed to generate choices. Please try again.');
        console.error('Generate choices error:', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async () => {
    if (!feedback.trim()) {
      setError('Please enter feedback');
      return;
    }

    if (!content.trim()) {
      setError('No content to provide feedback on');
      return;
    }

    setLoading(true);
    clearResults();

    try {
      const feedbackResponse = await rewriteContent({ 
        content: content,
        feedback: feedback
      });
      setFeedbackResult(feedbackResponse);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('OPENAI_API_KEY')) {
        setApiKeyMissing(true);
        setError('AI service is not configured. Please contact support.');
        console.error('OpenAI API key not configured. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError('Failed to apply feedback. Please try again.');
        console.error('Feedback error:', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950 dark:to-slate-900">
      <CardHeader className={`${!collapsed ? 'border-b border-orange-100 dark:border-orange-900 !py-2' : '!py-1'}`}>
        <CardTitle className="flex items-center justify-between text-orange-700 dark:text-orange-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Assistant
          </div>
          <div className="flex items-center gap-2">
            {onOpenSavedViewer && (
              <Button
                onClick={onOpenSavedViewer}
                variant="outline"
                size="sm"
                className="h-8 px-3 border-2 border-orange-300 dark:border-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900"
              >
                <div className="flex items-center gap-1.5">
                  <Book className="w-4 h-4 text-orange-700 dark:text-orange-300" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">My Saved</span>
                </div>
              </Button>
            )}
            <Button
              onClick={() => setCollapsed(!collapsed)}
              variant="outline"
              size="sm"
              className="h-8 px-3 border-2 border-orange-300 dark:border-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900"
            >
              {collapsed ? (
                <div className="flex items-center gap-1.5">
                  <ChevronDown className="w-4 h-4 text-orange-700 dark:text-orange-300" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Expand</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <ChevronUp className="w-4 h-4 text-orange-700 dark:text-orange-300" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Collapse</span>
                </div>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-4 space-y-4">
          {apiKeyMissing && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm space-y-2">
              <div className="font-medium text-blue-900 dark:text-blue-100">
                Setup Required
              </div>
              <div className="text-blue-700 dark:text-blue-300 space-y-1">
                <p>1. Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline font-medium">OpenAI</a></p>
                <p>2. Configure in Convex:</p>
                <code className="block bg-blue-100 dark:bg-blue-900 px-2 py-1.5 rounded font-mono text-xs mt-1">
                  npx convex env set OPENAI_API_KEY sk-your-key-here
                </code>
                <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                  ✓ Stored securely in Convex environment
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saveError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Improved Grid Layout */}
          <div className="space-y-2">
            {/* Row 1: Simple buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => { void handleSuggest(); }} disabled={loading || !content.trim()} variant="outline" className="gap-2 h-10">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />} Suggest
              </Button>

              <Button onClick={() => { void handleRewrite(); }} disabled={loading || !content.trim()} variant="outline" className="gap-2 h-10">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Rewrite
              </Button>
            </div>

            {/* Row 2: Tone and Expand */}
            <div className="grid grid-cols-2 gap-2">
              {/* LEFT SIDE: TONE */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g. horror, mystery"
                  value={customTone}
                  onChange={(e) => setCustomTone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleTone();
                    }
                  }}
                  disabled={loading}
                  className="flex-1 h-10"
                />
                <Button
                  onClick={() => { void handleTone(); }}
                  disabled={loading || !content.trim() || !customTone.trim()}
                  variant="outline"
                  className="gap-2 h-10 px-3 shrink-0"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                </Button>
              </div>

              {/* RIGHT SIDE: EXPAND */}
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="2-3"
                    value={expandLength}
                    onChange={(e) => {
                      const value = e.target.value;
                      setExpandLength(value);

                      if (!validateExpandLength(value)) {
                        setExpandLengthError('Use: N, N-M, or N-M paragraphs');
                      } else {
                        setExpandLengthError('');
                      }
                    }}
                    disabled={loading}
                    className={`flex-1 h-10 ${expandLengthError ? 'border-red-500 dark:border-red-500' : ''}`}
                  />
                  <Button 
                    onClick={() => { void handleEnhance(); }} 
                    disabled={loading || !content.trim() || !!expandLengthError} 
                    variant="outline" 
                    className="gap-2 h-10 px-3 shrink-0"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
                {expandLengthError && (
                  <span className="text-xs text-red-600 dark:text-red-400 ml-1">{expandLengthError}</span>
                )}
              </div>
            </div>

            {/* Row 3: Feedback and Generate */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Your feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleFeedback();
                    }
                  }}
                  disabled={loading}
                  className="flex-1 h-10"
                />
                <Button 
                  onClick={() => { void handleFeedback(); }} 
                  disabled={loading || !feedback.trim() || !content.trim()} 
                  variant="outline" 
                  className="gap-2 h-10 px-3 shrink-0"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                </Button>
              </div>

              <Button onClick={() => { void handleGenerateChoices(); }} disabled={loading || !content.trim()} variant="outline" className="gap-2 h-10">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Choices
              </Button>
            </div>
          </div>

          {suggestions && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">Improvement Suggestions</h3>
                </div>
                <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                  {suggestions}
                </div>
              </div>

              {exampleEdits && exampleEdits.revisedText && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Wand2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Revised Text</h3>
                  </div>
                  {exampleEdits.sceneTitle && (
                    <div className="mb-3 p-2 bg-blue-100 dark:bg-blue-900 rounded border border-blue-300 dark:border-blue-700">
                      <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Suggested Scene Title:</div>
                      <div className="text-sm text-blue-900 dark:text-blue-100 font-semibold">
                        {exampleEdits.sceneTitle}
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                    {exampleEdits.revisedText}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      onClick={() => onApplySuggestion(exampleEdits.revisedText, exampleEdits.sceneTitle || undefined)} 
                      size="sm" 
                      className="flex-1"
                    >
                      Apply Revised Text to Editor
                    </Button>
                    <Button
                      onClick={() => { void handleSaveSuggestion(); }}
                      size="sm"
                      variant={savedSuggestion ? "outline" : "blue"}
                      className="gap-2"
                      disabled={savedSuggestion}
                    >
                      {savedSuggestion ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {savedSuggestion ? 'Saved' : 'Save'}
                    </Button>
                  </div>
                </div>
              )}

              {exampleEdits && exampleEdits.analysis && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Analysis of Improvements</h3>
                  </div>
                  <div className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
                    {exampleEdits.analysis}
                  </div>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-700 space-y-3">
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {result}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => onApplySuggestion(result)} 
                  size="sm" 
                  className="flex-1"
                >
                  Apply to Editor
                </Button>
                <Button
                  onClick={() => { void handleSaveRewrite(); }}
                  size="sm"
                  variant={savedRewrite ? "outline" : "blue"}
                  className="gap-2"
                  disabled={savedRewrite}
                >
                  {savedRewrite ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {savedRewrite ? 'Saved' : 'Save'}
                </Button>
              </div>
            </div>
          )}

          {feedbackResult && (
            <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">Revised Based on Feedback</h3>
              </div>
              <div className="text-sm text-orange-900 dark:text-orange-100 whitespace-pre-wrap">
                {feedbackResult}
              </div>
              <div className="flex gap-2 mt-3">
                <Button 
                  onClick={() => onApplySuggestion(feedbackResult)} 
                  size="sm" 
                  className="flex-1"
                >
                  Apply to Editor
                </Button>
                <Button
                  onClick={() => { void handleSaveFeedback(); }}
                  size="sm"
                  variant={savedFeedback ? "outline" : "blue"}
                  className="gap-2"
                  disabled={savedFeedback}
                >
                  {savedFeedback ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {savedFeedback ? 'Saved' : 'Save'}
                </Button>
              </div>
            </div>
          )}

          {generatedChoices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Generated Choices</h4>
                  <Button
                    onClick={() => { void handleSaveChoices(); }}
                    size="sm"
                    variant={savedChoices ? "outline" : "blue"}
                    className="gap-2"
                    disabled={savedChoices}
                  >
                  {savedChoices ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {savedChoices ? 'Saved' : 'Save All'}
                </Button>
              </div>
              {generatedChoices.map((choice) => (
                <div 
                  key={`${choice.label}-${choice.title ?? ''}-${choice.description.slice(0, 20)}`}
                  className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border border-indigo-200 dark:border-indigo-800"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                        Choice: {choice.label}
                      </h4>
                      {choice.title && (
                        <div className="text-xs text-indigo-700 dark:text-indigo-300 mb-1 bg-indigo-100 dark:bg-indigo-900 px-2 py-1 rounded inline-block">
                          Scene: {choice.title}
                        </div>
                      )}
                      <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-2">
                        {choice.description}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => onGenerateChoice(choice.label, choice.description, choice.title)} 
                    size="sm" 
                    className="w-full mt-2"
                  >
                    Add to Story
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}