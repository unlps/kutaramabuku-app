import React, { useState } from 'react';
import EditorToolbar from './EditorToolbar';
import EditorContentComponent from './EditorContent';
import ChapterSidebar from './ChapterSidebar';
import { PanelLeftClose, PanelLeftOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Chapter } from '@/types/editor';
import { Editor } from '@tiptap/react';

interface RobustEditorProps {
  editorState: {
    editor: Editor | null;
    chapters: Chapter[];
    activeChapter: Chapter | null;
    activeChapterId: string | null;
    isSaving: boolean;
    isLoading: boolean;
    selectChapter: (id: string) => void;
    updateChapterTitleById: (id: string, title: string) => void;
    addChapter: () => void;
    deleteChapter: (id: string) => void;
    reorderChapters: (chapters: Chapter[]) => void;
  };
}

const RobustEditor: React.FC<RobustEditorProps> = ({ editorState }) => {
  const {
    editor,
    chapters,
    activeChapter,
    activeChapterId,
    isSaving,
    isLoading,
    selectChapter,
    updateChapterTitleById,
    addChapter,
    deleteChapter,
    reorderChapters,
  } = editorState;

  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando editor...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out flex-shrink-0',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}
      >
        <ChapterSidebar
          chapters={chapters}
          activeChapterId={activeChapterId}
          onSelect={selectChapter}
          onReorder={reorderChapters}
          onAdd={addChapter}
          onDelete={deleteChapter}
          onRename={updateChapterTitleById}
        />
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toggle & Toolbar */}
        <div className="flex items-center border-b bg-card">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="m-1"
            title={sidebarOpen ? 'Fechar sidebar' : 'Abrir sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1">
            <EditorToolbar editor={editor} />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeChapter ? (
            <EditorContentComponent
              editor={editor}
              activeChapterTitle={activeChapter.title}
              isSaving={isSaving}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Nenhum Capítulo Selecionado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Selecione um capítulo na barra lateral ou crie um novo para começar a escrever.
                </p>
                <Button onClick={addChapter}>Criar Primeiro Capítulo</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RobustEditor;
