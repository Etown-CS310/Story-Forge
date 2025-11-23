import React from 'react';
import { useAction } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, Wand2, Lightbulb, AlertCircle, Loader2, ChevronDown, ChevronUp, PenLine, Plus, MessageSquare } from 'lucide-react';

interface AIAssistantProps {
  content: string;
  onApplySuggestion: (newContent: string, newTitle?: string) => void;
  onGenerateChoice: (label: string, description: string, title?: string) => void;
}

interface ExampleEdits {
  sceneTitle: string;
  revisedText: string;
  analysis: string;
}

export default function AIAssistant({ content, onApplySuggestion, onGenerateChoice }: AIAssistantProps) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string>('');
  const [suggestions, setSuggestions] = React.useState<string>('');
  const [exampleEdits, setExampleEdits] = React.useState<ExampleEdits | null>(null);
  const [generatedChoices, setGeneratedChoices] = React.useState<Array<{ label: string; description: string; title?: string }>>([]);
  const [error, setError] = React.useState<string>('');
  const [customTone, setCustomTone] = React.useState('');
  const [expandLength, setExpandLength] = React.useState('2-3 paragraphs');
  const [expandLengthError, setExpandLengthError] = React.useState<string>('');
  const [feedback, setFeedback] = React.useState('');
  const [feedbackResult, setFeedbackResult] = React.useState('');
  const [collapsed, setCollapsed] = React.useState(false);
  const [apiKeyMissing, setApiKeyMissing] = React.useState(false);

  const suggestImprovements = useAction(api.ai.suggestImprovements);
  const rewriteContent = useAction(api.ai.rewriteContent);
  const enhanceContent = useAction(api.ai.enhanceContent);
  const generateChoices = useAction(api.ai.generateChoices);

  // Moved after all state declarations for better organization
  const clearResults = () => {
    setError('');
    setResult('');
    setSuggestions('');
    setExampleEdits(null);
    setGeneratedChoices([]);
    setFeedbackResult('');
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
      } catch (err: any) {
        if (err.message?.includes('OPENAI_API_KEY')) {
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
        setError('AI response missing required fields (suggestions or exampleEdits). Please try again or check your input.');
      }
    } catch (err: any) {
      if (err.message?.includes('OPENAI_API_KEY')) {
        setError('OpenAI API key not configured in Convex. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError(`Failed to get suggestions: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
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
    } catch (err: any) {
      if (err.message?.includes('OPENAI_API_KEY')) {
        setError('OpenAI API key not configured in Convex. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError(`Failed to rewrite: ${err.message || 'Unknown error'}`);
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
    } catch (err: any) {
      if (err.message?.includes('OPENAI_API_KEY')) {
        setError('OpenAI API key not configured in Convex. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError(`Failed to rewrite: ${err.message || 'Unknown error'}`);
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
    } catch (err: any) {
      if (err.message?.includes('OPENAI_API_KEY')) {
        setError('OpenAI API key not configured in Convex. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError(`Failed to enhance: ${err.message || 'Unknown error'}`);
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
          setError('AI generated choices but none had valid label and description fields');
          setLoading(false);
          return;
        }
        
        setGeneratedChoices(validChoices);
        // Don't set result text when choices are generated - the choices themselves are the result
      } else {
        setError('AI did not return any choices. Please try again or check your input.');
      }
    } catch (err: any) {
      if (err.message?.includes('OPENAI_API_KEY')) {
        setError('OpenAI API key not configured in Convex. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError(`Failed to generate choices: ${err.message || 'Unknown error'}`);
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
    } catch (err: any) {
      if (err.message?.includes('OPENAI_API_KEY')) {
        setError('OpenAI API key not configured in Convex. Run: npx convex env set OPENAI_API_KEY your-key');
      } else {
        setError(`Failed to apply feedback: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950 dark:to-slate-900">
      <CardHeader className="border-b border-purple-100 dark:border-purple-900 !py-2">
        <CardTitle className="flex items-center justify-between text-purple-700 dark:text-purple-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Assistant
          </div>
          <Button
            onClick={() => setCollapsed(!collapsed)}
            variant="ghost"
            size="sm"
            className="h-8 px-3"
          >
            {collapsed ? (
              <div className="flex items-center gap-1.5">
                <ChevronDown className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">Expand</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <ChevronUp className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">Collapse</span>
              </div>
            )}
          </Button>
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

                      if (!value) {
                        setExpandLengthError('Using default');
                      } else if (!validateExpandLength(value)) {
                        setExpandLengthError('Use: N or N-M');
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
                  <Button 
                    onClick={() => onApplySuggestion(exampleEdits.revisedText, exampleEdits.sceneTitle || undefined)} 
                    size="sm" 
                    className="w-full mt-3"
                  >
                    Apply Revised Text to Editor
                  </Button>
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
            <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 space-y-3">
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {result}
              </div>
              <Button onClick={() => onApplySuggestion(result)} size="sm" className="w-full">
                Apply to Editor
              </Button>
            </div>
          )}

          {feedbackResult && (
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">Revised Based on Feedback</h3>
              </div>
              <div className="text-sm text-purple-900 dark:text-purple-100 whitespace-pre-wrap">
                {feedbackResult}
              </div>
              <Button onClick={() => onApplySuggestion(feedbackResult)} size="sm" className="w-full mt-3">
                Apply to Editor
              </Button>
            </div>
          )}

          {generatedChoices.length > 0 && (
            <div className="space-y-3">
              {generatedChoices.map((choice, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border border-indigo-200 dark:border-indigo-800">
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