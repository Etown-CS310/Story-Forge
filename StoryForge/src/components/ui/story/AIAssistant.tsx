import React from 'react';
import { useAction } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Wand2, Lightbulb, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface AIAssistantProps {
  content: string;
  onApplySuggestion: (newContent: string) => void;
  onGenerateChoice: (label: string, description: string) => void;
}

export default function AIAssistant({ content, onApplySuggestion, onGenerateChoice }: AIAssistantProps) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');

  const [collapsed, setCollapsed] = React.useState(false);

  const suggestImprovements = useAction(api.ai.suggestImprovements);
  const rewriteContent = useAction(api.ai.rewriteContent);
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

    try {
      const suggestions = await suggestImprovements({ content });
      setResult(suggestions);
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

  const handleRewrite = async (tone: string) => {
    if (!content.trim()) {
      setError('No content to rewrite');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      const rewritten = await rewriteContent({ content, tone });
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

  const handleGenerateChoices = async () => {
    if (!content.trim()) {
      setError('No content to generate choices from');
      return;
    }

    setLoading(true);
    setError('');

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
                onClick={() => { void handleRewrite('engaging'); }}
                disabled={loading || !content.trim()}
                variant="outline"
                className="gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Rewrite
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => { void handleRewrite('mysterious'); }}
                disabled={loading || !content.trim()}
                size="sm"
                variant="secondary"
              >
                Mystery
              </Button>
              <Button
                onClick={() => { void handleRewrite('dramatic'); }}
                disabled={loading || !content.trim()}
                size="sm"
                variant="secondary"
              >
                Dramatic
              </Button>
              <Button
                onClick={() => { void handleRewrite('humorous'); }}
                disabled={loading || !content.trim()}
                size="sm"
                variant="secondary"
              >
                Humor
              </Button>
            </div>

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

        {/* Result Display */}
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