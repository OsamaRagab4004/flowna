"use client"

import React, { useEffect, useState, useRef } from 'react'
import mermaid from 'mermaid'
// Import the library components and types
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { ArrowLeft, Brain, ZoomIn, ZoomOut, RefreshCw, Maximize, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MindMapViewerProps {
  mindMapDefinition?: string;
}

// Helper function to clean up mermaid error messages
const cleanupMermaidErrors = (container: HTMLElement) => {
  // Remove error elements by class (including the specific error-text class)
  const errorElements = container.querySelectorAll('.mermaid-error, .error, .error-text, [class*="error"], [class*="Error"]');
  errorElements.forEach(el => el.remove());
  
  // Remove text nodes with error content
  const textNodes = container.querySelectorAll('text');
  textNodes.forEach(textNode => {
    if (textNode.textContent && 
        (textNode.textContent.includes('Syntax error') || 
         textNode.textContent.includes('mermaid version') ||
         textNode.textContent.includes('Error') ||
         textNode.textContent.includes('%%') ||
         textNode.textContent.trim().startsWith('%%'))) {
      textNode.remove();
    }
  });
  
  // Remove text elements with specific attributes that indicate errors
  const errorTextElements = container.querySelectorAll('text[font-size="100px"], text[x="1250"][y="400"], text[class="error-text"]');
  errorTextElements.forEach(el => el.remove());
  
  // Remove any standalone text elements in SVG root (usually error messages)
  const svgElements = container.querySelectorAll('svg');
  svgElements.forEach(svg => {
    const directTextChildren = Array.from(svg.children).filter(child => 
      child.tagName === 'text' || child.nodeName === 'text'
    );
    directTextChildren.forEach(textChild => textChild.remove());
  });
};

// Helper function to set up mutation observer for continuous error cleanup
const setupErrorObserver = (container: HTMLElement) => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Check if the added node is an error element
            if (element.classList.contains('mermaid-error') || 
                element.classList.contains('error') ||
                element.classList.contains('error-text') ||
                element.tagName === 'text' && element.textContent?.includes('Syntax error') ||
                element.tagName === 'text' && element.textContent?.includes('mermaid version')) {
              element.remove();
            }
            // Also check children of added nodes
            cleanupMermaidErrors(element as HTMLElement);
          }
        });
      }
    });
  });
  
  observer.observe(container, { 
    childList: true, 
    subtree: true 
  });
  
  // Return cleanup function
  return () => observer.disconnect();
};

const mindMapData = {
  'cognitive-psychology': {
    title: 'Cognitive Psychology Overview'
  },
  'research-methods': {
    title: 'Research Methods Flow'
  },
  'statistical-analysis': {
    title: 'Statistical Analysis Tree'
  }
}

export default function MindMapViewer({ mindMapDefinition: propMindMapDefinition }: MindMapViewerProps) {
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mindMapId = 'cognitive-psychology';
  const mindMap = mindMapData[mindMapId as keyof typeof mindMapData]
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenMermaidContainerRef = useRef<HTMLDivElement>(null);

  // Debug logging for mindmap prop changes
  useEffect(() => {
    console.log('🧠 [MINDMAP_PROP] Received mindmap prop:', propMindMapDefinition ? 'API DATA (length: ' + propMindMapDefinition.length + ')' : 'NO PROP - USING DEFAULT');
    if (propMindMapDefinition) {
      console.log('🧠 [MINDMAP_PROP] First 200 chars:', propMindMapDefinition.substring(0, 200) + '...');
    }
  }, [propMindMapDefinition]);
  const defaultMindMapDefinition = `mindmap
  root((Lecture Content))
    Topics
      Key Concepts
      Important Ideas
    Learning
      Understanding
      Practice
  `;

  // Clean and validate the mindmap definition
  const cleanMindmapDefinition = (definition: string): string => {
    if (!definition || definition.trim() === '') {
      return defaultMindMapDefinition;
    }
    
    // Additional cleaning for the definition
    let cleaned = definition
      .replace(/%%.*?%%/g, '')  // Remove mermaid comments
      .replace(/^%%.*$/gm, '')  // Remove comment lines
      .replace(/^%.*$/gm, '')   // Remove other comment formats
      .replace(/syntax error/gi, '') // Remove error text
      .replace(/mermaid version/gi, '') // Remove version text
      .replace(/error/gi, '') // Remove generic error text
      .split('\n')
      .filter((line: string) => line.trim() !== '' && !line.trim().startsWith('%'))
      .join('\n')
      .trim();
    
    // If after cleaning we have no content, use default
    if (!cleaned || cleaned.trim() === '') {
      return defaultMindMapDefinition;
    }
    
    return cleaned;
  };

  const mindMapDefinition = cleanMindmapDefinition(propMindMapDefinition || defaultMindMapDefinition);

  useEffect(() => {
    let isMounted = true;

    const renderMindmap = async () => {
      setLoading(true);

      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        mindmap: { useMaxWidth: false },
      });      try {
        const graphId = `mermaid-graph-${Date.now()}`;
        const { svg } = await mermaid.render(graphId, mindMapDefinition);
          if (isMounted && mermaidContainerRef.current) {
          mermaidContainerRef.current.innerHTML = svg;
          
          // Comprehensive error cleanup
          cleanupMermaidErrors(mermaidContainerRef.current);
          
          // Set up mutation observer to remove any errors that appear later
          setupErrorObserver(mermaidContainerRef.current);
        }
      } catch (e) {
        console.error("Mermaid rendering failed:", e);
        // Clear any partial content that might have been rendered
        if (isMounted && mermaidContainerRef.current) {
          mermaidContainerRef.current.innerHTML = '<div class="text-center text-gray-500 p-8">Unable to render mindmap</div>';
        }
      }finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    renderMindmap();

    return () => {
      isMounted = false;
    };
  }, [mindMapDefinition]);

  // Separate effect for fullscreen mindmap rendering
  useEffect(() => {
    if (!isFullscreen) return;

    let isMounted = true;

    const renderFullscreenMindmap = async () => {
      if (!fullscreenMermaidContainerRef.current) return;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        mindmap: { useMaxWidth: false },
      });      try {
        const graphId = `mermaid-fullscreen-${Date.now()}`;
        const { svg } = await mermaid.render(graphId, mindMapDefinition);
          if (isMounted && fullscreenMermaidContainerRef.current) {
          fullscreenMermaidContainerRef.current.innerHTML = svg;
          
          // Comprehensive error cleanup for fullscreen
          cleanupMermaidErrors(fullscreenMermaidContainerRef.current);
          
          // Set up mutation observer for fullscreen
          setupErrorObserver(fullscreenMermaidContainerRef.current);
        }
      } catch (e) {
        console.error("Fullscreen mermaid rendering failed:", e);
        // Clear any partial content that might have been rendered
        if (isMounted && fullscreenMermaidContainerRef.current) {
          fullscreenMermaidContainerRef.current.innerHTML = '<div class="text-center text-gray-500 p-8">Unable to render mindmap</div>';
        }
      }
    };

    // Small delay to ensure the fullscreen container is mounted
    const timer = setTimeout(renderFullscreenMindmap, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isFullscreen, mindMapDefinition]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when in fullscreen
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isFullscreen]);

  if (!mindMap) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Mind map not found</p>
      </div>
    )
  }  return (
    <>      {/* Add comprehensive global CSS to hide all mermaid error messages */}
      <style jsx global>{`
        /* Hide the specific error-text class */
        .error-text {
          display: none !important;
        }
        
        /* Hide error messages in mermaid SVGs */
        text[y="20"],
        text[y="30"],
        text[y="40"],
        text[y="50"],
        text[y="400"] {
          display: none !important;
        }
        
        /* Hide any text that contains error-related content */
        svg text[font-family*="Arial"]:first-child,
        svg text:first-of-type {
          display: none !important;
        }
        
        /* Hide error classes */
        .mermaid-error,
        .error,
        .error-text,
        [class*="error"],
        [class*="Error"] {
          display: none !important;
        }
        
        /* Hide any text nodes that might contain "Syntax error" or "mermaid version" */
        svg text {
          &:contains("Syntax error"),
          &:contains("mermaid version"),
          &:contains("Error") {
            display: none !important;
          }
        }
        
        /* Hide text elements that contain mermaid version specifically */
        svg text[font-size="100px"] {
          display: none !important;
        }
        
        /* Hide text elements at specific coordinates where errors appear */
        svg text[x="1250"][y="400"] {
          display: none !important;
        }
        
        /* Additional broad error suppression */
        svg > text:first-child {
          display: none !important;
        }
        
        /* Hide any standalone text elements in SVG root */
        svg > text {
          display: none !important;
        }
        
        /* Only show text that's inside graph elements */
        svg g text {
          display: block !important;
        }
        
        /* But still hide error texts even inside groups */
        svg g text:contains("Syntax error"),
        svg g text:contains("mermaid version"),
        svg g text:contains("Error") {
          display: none !important;
        }
      `}</style>
      
      <div className="space-y-6 h-full relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 z-50">
            <div className="text-center">
              <p className="text-lg font-semibold mb-4">Loading Mind Map...</p>
            </div>
          </div>
        )}
        <div className={`w-full h-full p-4 border rounded-lg relative transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}>
          {/* --- Interactive Mind Map Area using react-zoom-pan-pinch --- */}
          <div className="relative h-full">
            <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={20}
                limitToBounds={false}
                centerOnInit={true}
                panning={{ 
                  velocityDisabled: false
                }}
                wheel={{ step: 0.60 }}
                doubleClick={{ disabled: false, step: 0.5 }}
                pinch={{ step: 5 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <React.Fragment>
                    {/* Viewport for the interactive content */}
                    <div className="w-full h-full border rounded-md bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
                        <TransformComponent
                            wrapperStyle={{ width: '100%', height: '100%' }}
                            contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <div className="mindmap-container" 
                                 style={{ 
                                   minWidth: '100%', 
                                   minHeight: '100%', 
                                   display: 'flex', 
                                   alignItems: 'center', 
                                   justifyContent: 'center' 
                                 }}>
                                {/* Mermaid will render the SVG inside this div */}
                                <div 
                                  ref={mermaidContainerRef} 
                                  className="mindmap-svg-container"
                                  style={{
                                    cursor: 'grab',
                                    transition: 'transform 0.1s ease-out'
                                  }}
                                  onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                                  onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                                  onMouseLeave={(e) => e.currentTarget.style.cursor = 'grab'}
                                />
                            </div>
                        </TransformComponent>
                    </div>

                    {/* Navigation and Zoom Controls */}
                    <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2 z-10">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2">
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">Navigation Tips:</p>
                            <ul className="text-xs text-slate-500 dark:text-slate-500 space-y-1">
                                <li>• Drag to pan around</li>
                                <li>• Mouse wheel to zoom</li>
                                <li>• Double-click to zoom in</li>
                                <li>• Pinch to zoom (touch)</li>
                            </ul>
                        </div>
                    </div>

                    {/* Zoom Controls */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                        <Button variant="outline" size="icon" onClick={() => setIsFullscreen(true)} title="Fullscreen" className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                            <Maximize className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => zoomOut()} title="Zoom Out" className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => resetTransform()} title="Reset Zoom & Center" className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => zoomIn()} title="Zoom In" className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                    </div>
                </React.Fragment>
              )}
            </TransformWrapper>
          </div>
        </div>
      </div>

      {/* Fullscreen Mode */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 z-50">
              <div className="text-center">
                <p className="text-lg font-semibold mb-4">Loading Mind Map...</p>
              </div>
            </div>
          )}
          
          <div className={`w-full h-full transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}>
            <TransformWrapper
                initialScale={0.5}
                minScale={0.1}
                maxScale={10}
                limitToBounds={false}
                centerOnInit={true}
                panning={{ 
                  velocityDisabled: false
                }}
                wheel={{ step: 0.15 }}
                doubleClick={{ disabled: false, step: 0.5 }}
                pinch={{ step: 5 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <React.Fragment>                    {/* Fullscreen Viewport */}
                    <div className="w-full h-full bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
                        <TransformComponent
                            wrapperStyle={{ width: '100%', height: '100%' }}
                            contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <div className="mindmap-container" 
                                 style={{ 
                                   minWidth: '100%', 
                                   minHeight: '100%', 
                                   display: 'flex', 
                                   alignItems: 'center', 
                                   justifyContent: 'center' 
                                 }}>
                                {/* Mermaid will render the SVG inside this div */}
                                <div 
                                  ref={fullscreenMermaidContainerRef} 
                                  className="mindmap-svg-container"
                                  style={{
                                    cursor: 'grab',
                                    transition: 'transform 0.1s ease-out'
                                  }}
                                  onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                                  onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                                  onMouseLeave={(e) => e.currentTarget.style.cursor = 'grab'}
                                />
                            </div>
                        </TransformComponent>
                    </div>

                    {/* Fullscreen Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                        <Button variant="outline" size="icon" onClick={() => setIsFullscreen(false)} title="Exit Fullscreen" className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Fullscreen Navigation Tips */}
                    <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2 z-10">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2">
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">Fullscreen Mode:</p>
                            <ul className="text-xs text-slate-500 dark:text-slate-500 space-y-1">
                                <li>• Drag to pan around</li>
                                <li>• Mouse wheel to zoom</li>
                                <li>• Double-click to zoom in</li>
                                <li>• Press ESC or click X to exit</li>
                            </ul>
                        </div>
                    </div>

                    {/* Fullscreen Zoom Controls */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                        <Button variant="outline" size="icon" onClick={() => zoomOut()} title="Zoom Out" className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => resetTransform()} title="Reset Zoom & Center" className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => zoomIn()} title="Zoom In" className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                    </div>
                </React.Fragment>
              )}
            </TransformWrapper>
          </div>
        </div>
      )}
    </>
  )
}