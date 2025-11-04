import React from 'react';
import { useAction } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, Wand2, Lightbulb, AlertCircle, Loader2, ChevronDown, ChevronUp, PenLine, Plus } from 'lucide-react';

interface AIAssistantProps {
  content: string;
  onApplySuggestion: (newContent: string) => void;
  onGenerateChoice: (label: string, description: string) => void;
}

export default function AIAssistant({ content, onApplySuggestion, onGenerateChoice }: AIAssistantProps) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string>('');
  const [suggestions, setSuggestions] = React.useState<string>('');
  const [exampleEdits, setExampleEdits] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [customTone, setCustomTone] = React.useState('');

  const [collapsed, setCollapsed] = React.useState(false);

  const suggestImprovements = useAction(api.ai.suggestImprovements);
  const rewriteContent = useAction(api.ai.rewriteContent);
  const enhanceContent = useAction(api.ai.enhanceContent);
  const generateChoices = useAction(api.ai.generateChoices);

  const [apiKeyMissing, setApiKeyMissing] = React.useState(false);

  React.useEffect(() => {
    const checkAPIKey = async () => {
      try {
        await suggestImprovements({ content: '' }); // small test call
        setApiKeyMissing(false);
      } catch (err: any) {
        if (err.message?.includes('OPENAI_API_KEY')) {
          setApiKeyMissing(true);
        }
      }
    };
    void checkAPIKey();
  }, []);

  const handleSuggest = async () => {
    if (!content.trim()) {
      setError('No content to analyze');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');
    setSuggestions('');
    setExampleEdits('');

    try {
      const response = await suggestImprovements({ content });
      // Response is now a structured object
      if (typeof response === 'object' && response.suggestions && response.exampleEdits) {
        setSuggestions(response.suggestions);
        setExampleEdits(response.exampleEdits);
      } else {
        // Fallback for string response
        setSuggestions(String(response));
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
    setError('');
    setResult('');
    setSuggestions('');
    setExampleEdits('');

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
    setError('');
    setResult('');
    setSuggestions('');
    setExampleEdits('');

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

    setLoading(true);
    setError('');
    setResult('');
    setSuggestions('');
    setExampleEdits('');

    try {
      const enhanced = await enhanceContent({ content });
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
    setError('');
    setSuggestions('');
    setExampleEdits('');

    try {
      const choices = await generateChoices({ content, numChoices: 3 });
      // Expecting { choices: [{ label, description }] }
      if (choices.choices && Array.isArray(choices.choices)) {
        setResult(`Generated ${choices.choices.length} choice suggestions. Click to add them below.`);
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

  // Helper to parse suggestions into numbered list
  const parseSuggestions = (text: string) => {
    // Split by numbered points (1., 2., 3., etc.)
    const parts = text.split(/(?=\d+\.\s+\*\*)/);
    return parts.filter(p => p.trim());
  };

  // Helper to parse the revised text from example edits
  const parseRevisedText = (text: string) => {
    // Look for "**Revised Text:**" or similar markers
    const revisedMatch = text.match(/\*\*Revised Text:\*\*\s*([\s\S]*?)(?=\n\n---|\n\n\*\*Analysis|$)/i);
    if (revisedMatch) {
      const content = revisedMatch[1].trim();
      // Remove the "Revised Text:" label if it appears at the start
      return content.replace(/^Revised [Tt]ext:\s*/i, '');
    }
    
    // If no marker, try to find the actual story text (usually after suggestions)
    const lines = text.split('\n\n');
    // Find the first substantial paragraph that looks like story text
    const storyPart = lines.find(line => 
      line.length > 100 && 
      !line.startsWith('**') && 
      !line.match(/^\d+\./) &&
      !line.match(/^Revised [Tt]ext:/i)
    );
    
    return storyPart ? storyPart.replace(/^Revised [Tt]ext:\s*/i, '') : text;
  };

  // Helper to parse analysis section
  const parseAnalysis = (text: string) => {
    const analysisMatch = text.match(/\*\*Analysis of Improvements:\*\*\s*([\s\S]*?)$/i);
    if (analysisMatch) {
      return analysisMatch[1].trim();
    }
    return '';
  };

  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950 dark:to-slate-900">
      <CardHeader className="border-b border-purple-100 dark:border-purple-900">
        <CardTitle className="flex items-center justify-between text-purple-700 dark:text-purple-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Assistant
          </div>
          <Button
            onClick={() => setCollapsed(!collapsed)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Setup Instructions */}
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

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Collapsible Action Buttons */}
        {!collapsed && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => { void handleSuggest(); }}
                disabled={loading || !content.trim()}
                variant="outline"
                className="gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                Suggest
              </Button>
              <Button
                onClick={() => { void handleRewrite(); }}
                disabled={loading || !content.trim()}
                variant="outline"
                className="gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Rewrite
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter custom tone (e.g., mysterious, dramatic)"
                  value={customTone}
                  onChange={(e) => setCustomTone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleTone();
                    }
                  }}
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  onClick={() => { void handleTone(); }}
                  disabled={loading || !content.trim() || !customTone.trim()}
                  variant="outline"
                  className="gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                  Tone
                </Button>
              </div>
            </div>

            <Button
              onClick={() => { void handleEnhance(); }}
              disabled={loading || !content.trim()}
              variant="outline"
              className="w-full gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Enhance (Write More)
            </Button>

            <Button
              onClick={() => { void handleGenerateChoices(); }}
              disabled={loading || !content.trim()}
              variant="outline"
              className="w-full gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Choices
            </Button>
          </>
        )}

        {/* Suggestions Display - Separate Block */}
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

            {/* Revised Text Block */}
            {exampleEdits && parseRevisedText(exampleEdits) && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">Revised Text</h3>
                </div>
                <div className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                  {parseRevisedText(exampleEdits)}
                </div>
                <Button
                  onClick={() => onApplySuggestion(parseRevisedText(exampleEdits))}
                  size="sm"
                  className="w-full mt-3"
                >
                  Apply Revised Text to Editor
                </Button>
              </div>
            )}

            {/* Analysis Block */}
            {exampleEdits && parseAnalysis(exampleEdits) && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100">Analysis of Improvements</h3>
                </div>
                <div className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
                  {parseAnalysis(exampleEdits)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Regular Result Display (for Rewrite, Enhance, etc.) */}
        {result && (
          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 space-y-3">
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {result}
            </div>
            <Button
              onClick={() => onApplySuggestion(result)}
              size="sm"
              className="w-full"
            >
              Apply to Editor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}