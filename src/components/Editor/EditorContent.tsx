import React, { useEffect, useRef, useState } from 'react';
import { EditorContent as TipTapEditorContent, Editor } from '@tiptap/react';
import { Loader2, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditorContentProps {
  editor: Editor | null;
  activeChapterTitle: string;
  isSaving: boolean;
}

const PAGE_WIDTH_PX = 816;
const PAGE_GAP_PX = 32;

const getWordCount = (html: string): number => {
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText || '';
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
};

const getCharCount = (html: string): number => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').length;
};

const EditorContentComponent: React.FC<EditorContentProps> = ({
  editor,
  activeChapterTitle,
  isSaving,
}) => {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const zoomPercent = Math.round(zoom * 100);

  const pagesVisible = zoomPercent < 50 ? 3 : zoomPercent < 70 ? 2 : 1;
  const surfaceWidth = pagesVisible * PAGE_WIDTH_PX + (pagesVisible - 1) * PAGE_GAP_PX;

  const applyZoom = (next: number) => {
    const clamped = Math.max(0.3, Math.min(2, next));
    setZoom(clamped);
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const step = event.deltaY < 0 ? 0.05 : -0.05;
      applyZoom(zoom + step);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [zoom]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando editor...</span>
      </div>
    );
  }

  const content = editor.getHTML();
  const wordCount = getWordCount(content);
  const charCount = getCharCount(content);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-4 border-b bg-card">
        <h2 className="text-2xl font-bold">{activeChapterTitle || 'Sem titulo'}</h2>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>{wordCount} palavras</span>
          <span>•</span>
          <span>{charCount} caracteres</span>

          <div className="ml-auto flex flex-col items-end gap-1">
            <span className="flex items-center gap-1">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  Salvo
                </>
              )}
            </span>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => applyZoom(zoom - 0.1)}
                title="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs min-w-[56px]"
                onClick={() => setZoom(1)}
                title="Reset zoom"
              >
                {zoomPercent}%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => applyZoom(zoom + 0.1)}
                title="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-8 bg-muted/30">
        <div className="min-w-max pb-8">
          <div className="mx-auto" style={{ zoom }}>
            <div className="editor-page-surface" style={{ width: `${surfaceWidth}px` }}>
              <TipTapEditorContent editor={editor} className="page-content editor-paginated-content" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorContentComponent;
