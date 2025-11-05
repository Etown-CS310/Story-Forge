import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';

interface StoryGraphViewerProps {
  storyId: Id<'stories'>;
}

export default function StoryGraphViewer({ storyId }: StoryGraphViewerProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const data = useQuery(api.queries.visualization.getStoryMermaid, { storyId });

  useEffect(() => {
    if (!data || !mermaidRef.current) return;

    const renderMermaid = async () => {
      try {
        setLoading(true);
        const mermaid = (await import('mermaid')).default;
        
        mermaid.initialize({ 
          startOnLoad: false,
          theme: 'default',
          flowchart: {
            curve: 'basis',
            padding: 20
          }
        });

        const { svg } = await mermaid.render('mermaid-graph', data.mermaid);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
        setLoading(false);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError((err as Error).message);
        setLoading(false);
      }
    };

    void renderMermaid();
  }, [data]);

  const copyToClipboard = () => {
    if (data) {
      navigator.clipboard.writeText(data.mermaid)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error('Failed to copy to clipboard:', err);
          setError('Failed to copy to clipboard');
        });
    }
  };

  const downloadSVG = () => {
    const svg = mermaidRef.current?.querySelector('svg');
    if (!svg || !data) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.title.replace(/\s+/g, '-')}-graph.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            {data.title}
          </h2>
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {data.nodeCount} Scenes
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {data.edgeCount} Paths
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center gap-2"
          >
            {copied ? '✓ Copied!' : '📋 Copy Mermaid JS'}
          </button>

          <button
            onClick={downloadSVG}
            className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            ⬇️ Download
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 p-6 overflow-x-auto">
        {loading && (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        <div className="flex justify-center">
          <div ref={mermaidRef} className="mermaid-container inline-block min-w-full" />
        </div>
      </div>
    </div>
  );
}