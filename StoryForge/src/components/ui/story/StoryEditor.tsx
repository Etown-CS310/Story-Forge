import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Link, Plus, Save, Trash2, X, Network, ChevronsDown, ChevronsUp, ChevronDown, ChevronUp, GitBranch } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import StoryGraphViewer from './StoryGraphViewer';
import AIAssistant from './AIAssistant';
import { Textarea } from '../textarea';
import SavedSuggestionsViewer from './SavedSuggestionsViewer';

// Constants for graph scaling
const MIN_SCALE_MULTIPLIER = 0.8;
const MAX_SCALE_MULTIPLIER = 8;
const CONTAINER_WIDTH_PADDING = 0.88;
const CONTAINER_HEIGHT_PADDING = 0.85;
const SVG_DIMENSION_TIMEOUT_MS = 500;

// Mini graph component showing current node and immediate children
function LocalNodeGraph({ 
  currentNodeId, 
  nodes, 
  edges, 
  isDarkMode 
}: { 
  currentNodeId: Id<'nodes'> | null;
  nodes: any[];
  edges: any[];
  isDarkMode: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const svgWrapperRef = React.useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = React.useState<string>('');
  const [renderState, setRenderState] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = React.useState<string>('');
  
  // Zoom and pan state
  const [scale, setScale] = React.useState(1);
  const [baseScale, setBaseScale] = React.useState(1);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = React.useState(false);
  const [isEditingZoom, setIsEditingZoom] = React.useState(false);
  const [zoomInput, setZoomInput] = React.useState('100');

  React.useEffect(() => {
    if (!currentNodeId) {
      setRenderState('error');
      setErrorMsg('Missing node ID');
      return;
    }

    // Track if component is mounted
    let isMounted = true;

    const renderMermaid = async () => {
      try {
        setRenderState('loading');
        setSvgContent('');
        
        const mermaid = (await import('mermaid')).default;
        
        // Initialize mermaid (not async, no await needed)
        mermaid.initialize({ 
          startOnLoad: false,
          theme: isDarkMode ? 'dark' : 'default',
          flowchart: {
            curve: 'basis',
            padding: 8,
            nodeSpacing: 25,
            rankSpacing: 25,
          }
        });

        // Find current node
        const currentNode = nodes.find(n => n._id === currentNodeId);
        if (!currentNode) {
          console.error('LocalNodeGraph - current node not found');
          if (isMounted) {
            setRenderState('error');
            setErrorMsg('Current node not found');
          }
          return;
        }

        // Find edges from current node
        const outgoingEdges = edges.filter(e => e.fromNodeId === currentNodeId);

        if (outgoingEdges.length === 0) {
          if (isMounted) {
            setRenderState('error');
            setErrorMsg('No outgoing paths to display');
          }
          return;
        }
        
        // Find child nodes
        const childNodeIds = outgoingEdges.map(e => e.toNodeId);
        const childNodes = nodes.filter(n => childNodeIds.includes(n._id));

        // Build mermaid diagram
        let diagram = 'graph TD\n';
        
        // Helper functions
        const sanitizeId = (id: string) => 'n' + id.replace(/[^a-zA-Z0-9]/g, '');
        const truncate = (text: string, maxLen: number) => 
          text.length <= maxLen ? text : text.substring(0, maxLen - 3) + '...';
        const escapeMermaidText = (text: string) => {
          return text
            .replace(/&/g, '&amp;')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/`/g, '&#96;')
            .replace(/'/g, '&#39;')
            .replace(/#/g, '&#35;')
            .replace(/"/g, '&#34;')
            .replace(/\[/g, '&#91;')
            .replace(/\]/g, '&#93;')
            .replace(/{/g, '&#123;')
            .replace(/}/g, '&#125;')
            .replace(/\(/g, '&#40;')
            .replace(/\)/g, '&#41;')
            .replace(/\|/g, '&#124;')
            .replace(/</g, '&#60;')
            .replace(/>/g, '&#62;');
        };

        // Add current node (highlighted)
        const currentNodeId_safe = sanitizeId(currentNode._id);
        const currentNodeText = escapeMermaidText(
          currentNode.title ? truncate(currentNode.title, 40) : truncate(currentNode.content, 40)
        );
        diagram += `  ${currentNodeId_safe}[["📍 ${currentNodeText}"]]\n`;

        // Add child nodes
        for (const child of childNodes) {
          const childId = sanitizeId(child._id);
          const childText = escapeMermaidText(
            child.title ? truncate(child.title, 40) : truncate(child.content, 40)
          );
          diagram += `  ${childId}["${childText}"]\n`;
        }

        diagram += '\n';

        // Add edges
        for (const edge of outgoingEdges) {
          const fromId = sanitizeId(edge.fromNodeId);
          const toId = sanitizeId(edge.toNodeId);
          const label = escapeMermaidText(truncate(edge.label, 30));
          
          let suffix = '';
          if (edge.conditions) suffix += ' 🔒';
          if (edge.effects) suffix += ' ⚡';
          
          diagram += `  ${fromId} -->|"${label}${suffix}"| ${toId}\n`;
        }

        // Style current node
        if (isDarkMode) {
          diagram += `\n  style ${currentNodeId_safe} fill:#1e40af,stroke:#3b82f6,stroke-width:3px,color:#dbeafe\n`;
        } else {
          diagram += `\n  style ${currentNodeId_safe} fill:#93c5fd,stroke:#2563eb,stroke-width:3px,color:#1e3a8a\n`;
        }

        const uniqueId = 'mermaid-mini-' + currentNodeId.replace(/[^a-zA-Z0-9]/g, '') + '-' + Date.now();
        const { svg } = await mermaid.render(uniqueId, diagram);
        
        // Add inline styles to the SVG
        const styledSvg = svg.replace(
          '<svg',
          '<svg style="max-width: 100%; height: auto; display: block; margin: 0 auto;"'
        );
        
        if (isMounted) {
          setSvgContent(styledSvg);
          setRenderState('success');
        }
        
        // Auto-fit after render - wait for SVG to have proper dimensions
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Handle async code with proper error handling
            (async () => {
              if (!isMounted || !containerRef.current || !svgWrapperRef.current) return;
              
              const svgElement = svgWrapperRef.current.querySelector('svg');
              if (!svgElement) return;
              
              // Wait for the SVG to have non-zero dimensions (max timeout)
              const start = performance.now();
              await new Promise<void>(resolve => {
                let resolved = false;
                
                function check() {
                  if (resolved || !isMounted) return;
                  
                  if (!svgElement || !containerRef.current) {
                    resolved = true;
                    resolve();
                    return;
                  }
                  
                  // Force a reflow to ensure we get accurate dimensions
                  const rect = svgElement.getBoundingClientRect();
                  
                  if (rect.width > 0 && rect.height > 0) {
                    resolved = true;
                    resolve();
                  } else if (performance.now() - start > SVG_DIMENSION_TIMEOUT_MS) {
                    // Timeout
                    resolved = true;
                    resolve();
                  } else {
                    requestAnimationFrame(check);
                  }
                }
                
                check();
              });
              
              // Check if still mounted before setting state
              if (!isMounted) return;
              
              // Now calculate the fit
              const svgRect = svgElement.getBoundingClientRect();
              const containerRect = containerRef.current.getBoundingClientRect();
              
              // Calculate scale to fit with padding multipliers
              let fitScale = 1;
              if (svgRect.width > 0 && svgRect.height > 0 && containerRect.width > 0 && containerRect.height > 0) {
                const scaleX = (containerRect.width * CONTAINER_WIDTH_PADDING) / svgRect.width;
                const scaleY = (containerRect.height * CONTAINER_HEIGHT_PADDING) / svgRect.height;
                // Use the smaller scale to ensure everything fits
                fitScale = Math.min(scaleX, scaleY);
                // Clamp between min and max scale multipliers
                fitScale = Math.max(MIN_SCALE_MULTIPLIER, Math.min(fitScale, MAX_SCALE_MULTIPLIER));
              }
              
              // Center the content
              const scaledWidth = svgRect.width * fitScale;
              const scaledHeight = svgRect.height * fitScale;
              const centerX = (containerRect.width - scaledWidth) / 2;
              const centerY = (containerRect.height - scaledHeight) / 2;
              
              // Only set state if still mounted
              if (isMounted) {
                setBaseScale(fitScale);
                setScale(fitScale);
                const centeredPosition = { x: centerX, y: centerY };
                setPosition(centeredPosition);
                setInitialPosition(centeredPosition);
              }
            })().catch((err) => {
              console.error('Failed to auto-fit graph:', err);
              // Don't set error state since this is a non-critical enhancement
            });
          });
        });
      } catch (err) {
        console.error('LocalNodeGraph - Error:', err);
        if (isMounted) {
          setRenderState('error');
          setErrorMsg('Failed to render: ' + (err as Error).message);
        }
      }
    };

    void renderMermaid();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [currentNodeId, nodes, edges, isDarkMode]);

  // Wheel zoom handler
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY * -0.001;
      setScale(prevScale => {
        const safeBaseScale = baseScale > 0 ? baseScale : 1;
        const minZoom = Math.max(0.1, safeBaseScale * 0.1);
        const maxZoom = safeBaseScale * MAX_SCALE_MULTIPLIER;
        const newScale = Math.min(Math.max(minZoom, prevScale + delta * safeBaseScale), maxZoom);
        return newScale;
      });
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleNativeWheel);
  }, [baseScale]);

  // Zoom button handlers - declare BEFORE keyboard navigation that uses them
  const resetView = React.useCallback(() => {
    setScale(baseScale);
    setPosition(initialPosition);
  }, [baseScale, initialPosition]);

  const zoomIn = React.useCallback(() => {
    if (baseScale > 0) {
      setScale(prevScale => Math.min(prevScale + baseScale * 0.1, baseScale * MAX_SCALE_MULTIPLIER));
    }
  }, [baseScale]);
  
  const zoomOut = React.useCallback(() => {
    if (baseScale > 0) {
      const minZoom = Math.max(0.1, baseScale * 0.1);
      setScale(prevScale => Math.max(prevScale - baseScale * 0.1, minZoom));
    }
  }, [baseScale]);

  // Keyboard navigation
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const panStep = 30;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setPosition(pos => ({ x: pos.x, y: pos.y + panStep }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setPosition(pos => ({ x: pos.x, y: pos.y - panStep }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setPosition(pos => ({ x: pos.x + panStep, y: pos.y }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setPosition(pos => ({ x: pos.x - panStep, y: pos.y }));
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
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetView]);

  // Mouse drag handlers
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

  // Zoom input handlers
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

    if (baseScale <= 0) {
      setIsEditingZoom(false);
      return;
    }

    if (!isNaN(value)) {
      const clamped = Math.min(Math.max(value, 10), 300);
      setScale((clamped / 100) * baseScale);
      setZoomInput(clamped.toString());
    } else {
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

  if (renderState === 'loading') {
    return (
      <div className="w-full space-y-3">
        <div className="flex items-center gap-2">
          <button
            disabled
            aria-label="Zoom out (disabled while loading)"
            className="px-3 py-1.5 text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 rounded cursor-not-allowed"
          >
            −
          </button>
          <div className="min-w-[60px] px-2 py-1 text-xs text-center font-medium text-slate-400 dark:text-slate-500">
            ...
          </div>
          <button
            disabled
            aria-label="Zoom in (disabled while loading)"
            className="px-3 py-1.5 text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 rounded cursor-not-allowed"
          >
            +
          </button>
          <button
            disabled
            aria-label="Reset view (disabled while loading)"
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 rounded cursor-not-allowed"
          >
            Reset
          </button>
        </div>
        <div className="w-full min-h-[200px] flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent" />
            <span className="text-sm text-slate-500 dark:text-slate-400">Rendering graph...</span>
          </div>
        </div>
      </div>
    );
  }

  if (renderState === 'error') {
    return (
      <div className="w-full min-h-[200px] flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
        <div className="text-sm text-amber-700 dark:text-amber-300 text-center py-6 px-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
          <div className="font-medium mb-1">Unable to display graph</div>
          {errorMsg && <div className="text-xs opacity-75">{errorMsg}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={zoomOut}
          aria-label="Zoom out"
          className="px-3 py-1.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded transition-colors"
          title="Zoom out"
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
            aria-label="Enter zoom percentage"
            className="w-[60px] px-2 py-1 text-xs text-center border-2 border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <button
            onClick={handleZoomClick}
            aria-label={`Current zoom: ${baseScale > 0 ? Math.round((scale / baseScale) * 100) : 100}%. Click to edit.`}
            className="min-w-[60px] px-2 py-1 text-xs text-center font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors border border-slate-300 dark:border-slate-600"
            title="Click to enter zoom level"
          >
            {baseScale > 0 ? Math.round((scale / baseScale) * 100) : 100}%
          </button>
        )}
        <button
          onClick={zoomIn}
          aria-label="Zoom in"
          className="px-3 py-1.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded transition-colors"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={resetView}
          aria-label="Reset view to optimal fit"
          className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded transition-colors"
          title="Reset to optimal fit"
        >
          Reset
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
          {isHovering ? 'Scroll to zoom' : 'Hover to zoom'}, drag to pan
        </span>
      </div>

      {/* Interactive graph container */}
      <div 
        ref={containerRef}
        className={`bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 transition-colors ${
          isHovering 
            ? 'border-blue-400 dark:border-blue-600' 
            : 'border-slate-200 dark:border-slate-700'
        } p-4 relative focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400`}
        style={{ 
          height: '400px',
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
        aria-label="Interactive story graph showing current scene and available paths"
      >
        <div 
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="inline-block"
        >
          <div ref={svgWrapperRef} dangerouslySetInnerHTML={{ __html: svgContent }} />
        </div>
      </div>
    </div>
  );
}

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
  const [originalNodeContent, setOriginalNodeContent] = React.useState('');
  const [originalNodeTitle, setOriginalNodeTitle] = React.useState('');
  const [newChoiceLabel, setNewChoiceLabel] = React.useState('');
  const [newSceneTitle, setNewSceneTitle] = React.useState('');
  const [newNodeContent, setNewNodeContent] = React.useState('');
  const [isFullHeight, setIsFullHeight] = React.useState(false);
  const [savedSuggestionsOpen, setSavedSuggestionsOpen] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [deleteConfirmEdgeId, setDeleteConfirmEdgeId] = React.useState<Id<'edges'> | null>(null);
  const [showCloseWarning, setShowCloseWarning] = React.useState(false);
  const [isPathsExpanded, setIsPathsExpanded] = React.useState(true);
  
  // Set initial dark mode state on client side
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);
  
  // Ref for scrolling to the Add Scene section
  const addSceneSectionRef = React.useRef<HTMLDivElement>(null);

  // Add a key that changes when selectedNodeId changes to force AIAssistant to remount
  const aiAssistantKey = selectedNodeId ?? 'no-node';

  // Watch for dark mode changes
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Reset to graph view when story changes (don't reset when graph data updates)
  React.useEffect(() => {
    setViewMode('graph');
    setSelectedNodeId(null); // Reset selected node so root will be selected when graph loads
  }, [storyId]);

  // Initialize selectedNodeId to root node when graph loads
  React.useEffect(() => {
    if (!graph) return;
    if (!selectedNodeId) {
      setSelectedNodeId(graph.rootNodeId as Id<'nodes'>);
    }
  }, [graph, selectedNodeId]);

  // Update content when selected node changes
  React.useEffect(() => {
    if (!graph) return;
    const sel = graph.nodes.find((n: any) => n._id === selectedNodeId);
    setNodeContent(sel?.content ?? '');
    setNodeTitle(sel?.title ?? '');

    // Store original values for change detection
    setOriginalNodeContent(sel?.content ?? '');
    setOriginalNodeTitle(sel?.title ?? '');
  }, [graph, selectedNodeId]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return nodeContent !== originalNodeContent || nodeTitle !== originalNodeTitle;
  };

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowCloseWarning(true);
    } else {
      onClose();
    }
  };

  // Save current node and close
  const handleSaveAndClose = async () => {
    if (!selectedNodeId) return;
    await updateNode({ nodeId: selectedNodeId, content: nodeContent });
    await updateNodeTitle({ nodeId: selectedNodeId, title: nodeTitle });
    setShowCloseWarning(false);
    onClose();
  };

  // Discard changes and close
  const handleDiscardAndClose = () => {
    setShowCloseWarning(false);
    onClose();
  };

  const handleDeleteEdge = async (edgeId: Id<'edges'>) => {
    await deleteEdge({ edgeId });
    setDeleteConfirmEdgeId(null);
  };

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
          <Button variant="outline" onClick={handleClose} className="gap-2">
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
                      <ChevronsUp className="w-3 h-3" />
                      Minimize
                    </>
                  ) : (
                    <>
                      <ChevronsDown className="w-3 h-3" />
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
                rows={8}
                value={nodeContent}
                onChange={(e) => setNodeContent(e.target.value)}
              />

              {/* Add key prop to force remount when selectedNodeId changes */}
              <AIAssistant
                key={aiAssistantKey}
                content={nodeContent}
                storyId={storyId}
                nodeId={selectedNodeId ?? undefined}
                onApplySuggestion={(newContent, newTitle) => {
                  setNodeContent(newContent);
                  if (newTitle) {
                    setNodeTitle(newTitle);
                  }
                }}
                onGenerateChoice={(label, description, title) => {
                  setNewChoiceLabel(label);
                  setNewNodeContent(description);
                  setNewSceneTitle(title || '');
                  requestAnimationFrame(() => {
                    const el = addSceneSectionRef.current;
                    if (el) {
                      el.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }
                  });
                }}
                onOpenSavedViewer={() => setSavedSuggestionsOpen(true)}
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

              {/* Current Paths Preview with collapsibility */}
              {outgoing.length > 0 && (
                <div className="mt-6">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Current Paths Preview
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPathsExpanded(!isPathsExpanded)}
                        className="gap-1.5 h-7 text-xs"
                      >
                        {isPathsExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            Collapse
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            Expand
                          </>
                        )}
                      </Button>
                    </div>
                    {isPathsExpanded && (
                      <LocalNodeGraph
                        currentNodeId={selectedNodeId}
                        nodes={graph.nodes}
                        edges={graph.edges}
                        isDarkMode={isDarkMode}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Outgoing edges */}
              <div className="mt-6">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Outgoing Choices</div>
                <div className="space-y-3">
                  {outgoing.map((e: any) => {
                    const to = graph.nodes.find((n: any) => n._id === e.toNodeId);
                    return (
                      <div
                        key={e._id}
                        className="flex items-start justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
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
                          onClick={() => setDeleteConfirmEdgeId(e._id)}
                          className="flex-shrink-0 gap-2 hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
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
                <div ref={addSceneSectionRef} className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4 bg-slate-50 dark:bg-slate-900">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Scene
                  </div>
                  <Input
                    placeholder="Path Label (e.g., 'Enter the forest', 'Stay silent')"
                    value={newChoiceLabel}
                    onChange={(e) => setNewChoiceLabel(e.target.value)}
                  />
                  <Input
                    placeholder="Scene Title (e.g., 'The Dark Forest', 'A Moment of Silence')"
                    value={newSceneTitle}
                    onChange={(e) => setNewSceneTitle(e.target.value)}
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
                        const title = newSceneTitle.trim() || 'Untitled Scene';
                        if (!label || !content) return;
                        await createNodeAndEdge({ storyId, fromNodeId: selectedNodeId, label, content, title });
                        setNewChoiceLabel('');
                        setNewSceneTitle('');
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

      {/* Delete Edge Confirmation Dialog */}
      <Dialog open={!!deleteConfirmEdgeId} onOpenChange={(isOpen: boolean) => !isOpen && setDeleteConfirmEdgeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this choice?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete this choice/path from your story.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmEdgeId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmEdgeId) {
                  handleDeleteEdge(deleteConfirmEdgeId).catch((err) => console.error('Failed to delete:', err));
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning Dialog */}
      <Dialog open={showCloseWarning} onOpenChange={(isOpen: boolean) => !isOpen && setShowCloseWarning(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes to this scene. Do you want to save them before closing?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCloseWarning(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardAndClose}
            >
              Discard Changes
            </Button>
            <Button
              variant="default"
              onClick={() => { void handleSaveAndClose(); }}
            >
              Save and Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SavedSuggestionsViewer
        storyId={storyId}
        nodeId={selectedNodeId ?? undefined}
        open={savedSuggestionsOpen}
        onOpenChange={setSavedSuggestionsOpen}
        onApplySuggestion={(content, title) => {
          setNodeContent(content);
          if (title) setNodeTitle(title);
          setSavedSuggestionsOpen(false);
        }}
        onApplyChoice={(label, desc, title) => {
          setNewChoiceLabel(label);
          setNewNodeContent(desc);
          setNewSceneTitle(title || '');
          setSavedSuggestionsOpen(false);
        }}
      />
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
      <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
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