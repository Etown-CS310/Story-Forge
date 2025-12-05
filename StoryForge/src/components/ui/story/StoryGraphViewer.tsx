import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { Input } from '../input';
import { Button } from '../button';

interface StoryGraphViewerProps {
  storyId: Id<'stories'>;
}

export default function StoryGraphViewer({ storyId }: StoryGraphViewerProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1); // The fitted scale that represents "100%"
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 }); // Store initial centered position
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isEditingZoom, setIsEditingZoom] = useState(false);
  const [zoomInput, setZoomInput] = useState('100');
  const [hasAutoFitted, setHasAutoFitted] = useState(false);
  const [StoryTitle, setStoryTitle] = useState('');

  const changeStoryTitle = useMutation(api.queries.stories.changeStoryTitle);

  const [isHovering, setIsHovering] = useState(false);

  // Track dark mode in state so it triggers re-render
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  // Watch for dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const data = useQuery(api.queries.visualization.getStoryMermaid, {
    storyId,
    isDarkMode,
  });

  useEffect(() => {
    // Set initial Title
    if (data && data.title) {
      setStoryTitle(data.title);
    }
  }, [data]);

  useEffect(() => {
    if (!data || !mermaidRef.current) return;

    const renderMermaid = async () => {
      try {
        setLoading(true);
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? 'dark' : 'default',
          themeVariables: isDarkMode
            ? {
                // Dark mode specific colors for better visibility
                primaryColor: '#1e293b',
                primaryTextColor: '#e2e8f0',
                primaryBorderColor: '#475569',
                lineColor: '#94a3b8',
                secondaryColor: '#334155',
                tertiaryColor: '#0f172a',
                background: '#0f172a',
                mainBkg: '#1e293b',
                secondBkg: '#334155',
                edgeLabelBackground: '#1e293b',
                nodeBorder: '#64748b',
                clusterBkg: '#1e293b',
                clusterBorder: '#475569',
                defaultLinkColor: '#94a3b8',
                titleColor: '#e2e8f0',
                nodeTextColor: '#e2e8f0',
              }
            : {},
          flowchart: {
            curve: 'basis',
            padding: 20,
            nodeSpacing: 50,
            rankSpacing: 50,
          },
        });

        const { svg } = await mermaid.render('mermaid-graph', data.mermaid);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;

          // Wait for the browser to fully render and layout the SVG by polling for non-zero dimensions (max 500ms)
          const svgElement = mermaidRef.current.querySelector('svg');
          if (svgElement) {
            const start = performance.now();
            await new Promise((resolve) => {
              let resolved = false;

              function check() {
                if (resolved) return; // Stop if already resolved

                if (!svgElement) {
                  resolved = true;
                  resolve(undefined);
                  return;
                }

                const rect = svgElement.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  resolved = true;
                  resolve(undefined);
                } else if (performance.now() - start > 500) {
                  // Timeout after 500ms
                  resolved = true;
                  resolve(undefined);
                } else {
                  requestAnimationFrame(check);
                }
              }

              check();
            });
          }

          // Auto-fit on first render or after theme change
          if (!hasAutoFitted && containerRef.current) {
            const svgElement = mermaidRef.current.querySelector('svg');
            if (svgElement) {
              // Force a reflow to ensure we get accurate dimensions
              svgElement.getBoundingClientRect();

              const svgRect = svgElement.getBoundingClientRect();
              const containerRect = containerRef.current.getBoundingClientRect();

              // Calculate scale to fit (with some padding)
              let fitScale = 1;
              if (svgRect.width > 0 && svgRect.height > 0 && containerRect.width > 0 && containerRect.height > 0) {
                const scaleX = (containerRect.width * 0.9) / svgRect.width;
                const scaleY = (containerRect.height * 0.9) / svgRect.height;
                fitScale = Math.min(scaleX, scaleY, 3);

                // Ensure minimum scale
                fitScale = Math.max(fitScale, 0.1);
              }

              // Center the content properly
              // We need to account for the SVG's original position before scaling
              const scaledWidth = svgRect.width * fitScale;
              const scaledHeight = svgRect.height * fitScale;

              // Center based on the container's dimensions
              const centerX = (containerRect.width - scaledWidth) / 2;
              const centerY = (containerRect.height - scaledHeight) / 2;

              setBaseScale(fitScale); // This becomes our "100%"
              setScale(fitScale);
              const centeredPosition = { x: centerX, y: centerY };
              setPosition(centeredPosition);
              setInitialPosition(centeredPosition); // Store for reset
              setHasAutoFitted(true);
            }
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError((err as Error).message);
        setLoading(false);
      }
    };

    void renderMermaid();
  }, [data, isDarkMode, hasAutoFitted]);

  // Add native wheel listener to properly prevent scroll and handle zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Always prevent default scroll when wheel event is on the container
      e.preventDefault();
      e.stopPropagation();

      // Handle zoom directly here
      const delta = e.deltaY * -0.001;
      setScale((prevScale) => {
        const safeBaseScale = baseScale > 0 ? baseScale : 1;
        const minZoom = Math.max(0.1, safeBaseScale * 0.1); // Ensure reasonable minimum
        const maxZoom = safeBaseScale * 3;
        const newScale = Math.min(Math.max(minZoom, prevScale + delta * safeBaseScale), maxZoom);
        return newScale;
      });
    };

    // passive: false is required to allow preventDefault
    container.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, [baseScale]);

  // Reset view to initial fitted state (regardless of user adjustment)
  const resetView = useCallback(() => {
    // Always reset to the initial fitted state
    setScale(baseScale);
    setPosition(initialPosition);
  }, [baseScale, initialPosition]);

  // Zoom in/out buttons (relative to baseScale)
  const zoomIn = useCallback(() => {
    if (baseScale > 0) {
      setScale((prevScale) => Math.min(prevScale + baseScale * 0.1, baseScale * 3)); // Max 300%
    }
  }, [baseScale]);

  const zoomOut = useCallback(() => {
    if (baseScale > 0) {
      const minZoom = Math.max(0.1, baseScale * 0.1); // Ensure reasonable minimum
      setScale((prevScale) => Math.max(prevScale - baseScale * 0.1, minZoom)); // Min 10% or 0.1, whichever is larger
    }
  }, [baseScale]);

  // Keyboard navigation for accessibility
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const panStep = 50;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setPosition((pos) => ({ x: pos.x, y: pos.y + panStep }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setPosition((pos) => ({ x: pos.x, y: pos.y - panStep }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setPosition((pos) => ({ x: pos.x + panStep, y: pos.y }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setPosition((pos) => ({ x: pos.x - panStep, y: pos.y }));
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetView();
          break;
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [zoomIn, zoomOut, resetView]);

  // Handle mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setIsHovering(false);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  // Handle zoom input
  const handleZoomClick = () => {
    setIsEditingZoom(true);
    const safeBaseScale = baseScale > 0 ? baseScale : 1;
    setZoomInput(Math.round((scale / safeBaseScale) * 100).toString());
  };

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoomInput(e.target.value);
  };

  const handleZoomInputBlur = () => {
    const value = parseInt(zoomInput, 10);

    // Prevent division-by-zero or invalid baseScale use
    if (baseScale <= 0) {
      setIsEditingZoom(false);
      return;
    }

    if (!isNaN(value)) {
      // Clamp value between 10 and 300
      const clamped = Math.min(Math.max(value, 10), 300);

      setScale((clamped / 100) * baseScale);
      setZoomInput(clamped.toString());
    } else {
      // Revert to current zoom if input was invalid
      setZoomInput(Math.round((scale / baseScale) * 100).toString());
    }

    setIsEditingZoom(false);
  };

  const handleZoomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleZoomInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditingZoom(false);
      if (baseScale > 0) {
        setZoomInput(Math.round((scale / baseScale) * 100).toString());
      } else {
        setZoomInput('100');
      }
    }
  };

  const copyToClipboard = () => {
    if (data) {
      navigator.clipboard
        .writeText(data.mermaid)
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

  const downloadSVG = async () => {
    const currentSvg = mermaidRef.current?.querySelector('svg');
    if (!currentSvg || !data) return;

    // Helper function to download SVG
    const downloadSvgBlob = (svgContent: string | SVGSVGElement, filename: string) => {
      const svgData = typeof svgContent === 'string' ? svgContent : new XMLSerializer().serializeToString(svgContent);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    };

    const filename = `${data.title.replace(/\s+/g, '-')}-graph.svg`;

    // If we're in dark mode, temporarily render light mode version for download
    if (isDarkMode) {
      try {
        const mermaid = (await import('mermaid')).default;

        // Initialize with light theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          flowchart: {
            curve: 'basis',
            padding: 20,
            nodeSpacing: 50,
            rankSpacing: 50,
          },
        });

        // Render light mode version
        const uniqueId = 'mermaid-download-' + Date.now();
        const { svg: lightSvg } = await mermaid.render(uniqueId, data.mermaid);

        // Download the light version
        downloadSvgBlob(lightSvg, filename);
      } catch (err) {
        console.error('Failed to generate light mode SVG:', err);
        // Fallback to current SVG if light mode generation fails
        downloadSvgBlob(currentSvg, filename);
      }
    } else {
      // Already in light mode, download current SVG
      downloadSvgBlob(currentSvg, filename);
    }
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
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1">
            <Input
              className="w-full min-w-120 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={StoryTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
            />
            <Button
              variant="default"
              size="sm"
              className="ml-4"
              onClick={() => {
                void (async () => {
                  await changeStoryTitle({ storyId, newTitle: StoryTitle });
                })();
              }}
            >
              Save Title
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
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
            onClick={() => {
              void downloadSVG().catch((err) => {
                console.error('Failed to download SVG:', err);
              });
            }}
            className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            ⬇️ Download
          </button>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={zoomOut}
          className="px-4 py-2.5 text-base font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors shadow-sm"
          title="Zoom out"
          aria-label="Zoom out"
        >
          −
        </button>
        {isEditingZoom ? (
          <input
            type="number"
            value={zoomInput}
            onChange={handleZoomInputChange}
            onBlur={handleZoomInputBlur}
            onKeyDown={handleZoomInputKeyDown}
            autoFocus
            min="10"
            max="300"
            className="w-20 px-3 py-2 text-sm text-center border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Zoom percentage input"
          />
        ) : (
          <button
            onClick={handleZoomClick}
            className="min-w-20 px-3 py-2 text-sm text-center font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-300 dark:border-slate-600"
            title="Click to enter zoom level"
            aria-label="Current zoom level, click to edit"
          >
            {baseScale > 0 ? Math.round((scale / baseScale) * 100) : 100}%
          </button>
        )}
        <button
          onClick={zoomIn}
          className="px-4 py-2.5 text-base font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors shadow-sm"
          title="Zoom in"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={resetView}
          className="px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors shadow-sm"
          title="Reset to optimal fit"
          aria-label="Reset view to optimal fit"
        >
          Reset
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
          {isHovering ? 'Scroll to zoom' : 'Hover over graph to zoom with scroll'}, drag to pan, or use arrow keys
        </span>
      </div>

      <div
        ref={containerRef}
        className={`bg-white dark:bg-slate-800 rounded-lg border-2 transition-colors ${
          isHovering ? 'border-purple-400 dark:border-purple-600' : 'border-slate-200 dark:border-slate-700'
        } p-6 relative focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900`}
        style={{
          height: '70vh',
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
          position: 'relative',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        tabIndex={0}
        role="img"
        aria-label={`Interactive graph view of ${data.title} containing ${data.nodeCount} scenes and ${data.edgeCount} paths. Use arrow keys to pan, plus and minus keys to zoom, and 0 to reset the view.`}
      >
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

        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="inline-block"
        >
          <div ref={mermaidRef} className="mermaid-container" />
        </div>
      </div>
    </div>
  );
}
