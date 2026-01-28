import React from 'react';
import { EditorContent as TipTapEditorContent, Editor } from '@tiptap/react';
import { Input } from '@/components/ui/input';
import { Loader2, Check } from 'lucide-react';

interface EditorContentProps {
  editor: Editor | null;
  activeChapterTitle: string;
  onTitleChange: (title: string) => void;
  isSaving: boolean;
}

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
  onTitleChange,
  isSaving,
}) => {
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
      {/* Title Input Area */}
      <div className="px-8 py-4 border-b bg-card">
        <Input
          value={activeChapterTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Título do Capítulo"
          className="text-2xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent"
        />
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>{wordCount} palavras</span>
          <span>•</span>
          <span>{charCount} caracteres</span>
          <span className="ml-auto flex items-center gap-1">
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
        </div>
      </div>

      {/* A4 Paper Container */}
      <div className="flex-1 overflow-auto p-8 bg-muted/30">
        <div className="a4-page mx-auto bg-background shadow-lg rounded-sm">
          <TipTapEditorContent editor={editor} className="page-content" />
        </div>
      </div>
    </div>
  );
};

export default EditorContentComponent;
