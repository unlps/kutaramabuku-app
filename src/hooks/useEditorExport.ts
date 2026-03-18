import { useCallback } from 'react';
import { Chapter } from '@/types/editor';
import { exportToPDF, exportToDOCX } from '@/services/exportService';
import { useToast } from '@/hooks/use-toast';
import { CoverTemplate } from '@/components/templates/covers';

interface UseEditorExportOptions {
  title: string;
  author?: string | null;
  genre?: string | null;
  coverImage?: string | null;
  coverTemplate: CoverTemplate;
  chapters: Chapter[];
}

export const useEditorExport = ({
  title,
  author,
  genre,
  coverImage,
  coverTemplate,
  chapters,
}: UseEditorExportOptions) => {
  const { toast } = useToast();

  const getCombinedContent = useCallback((): string => {
    if (chapters.length === 0) return '';

    return chapters
      .sort((a, b) => a.chapter_order - b.chapter_order)
      .map((chapter, index) => {
        const chapterBreak = index > 0 ? '<div data-page-break="chapter"></div>' : '';
        const chapterTitle = `<h1 style="text-align: center; margin-top: 2em;">${chapter.title}</h1>`;
        const content = chapter.content || '';
        return `${chapterBreak}\n${chapterTitle}\n${content}`;
      })
      .join('\n\n');
  }, [chapters]);

  const handleExportPDF = useCallback(async () => {
    if (chapters.length === 0) {
      toast({
        title: 'Sem conteudo',
        description: 'Adicione pelo menos um capitulo antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const coverEl = document.querySelector('.export-cover-container') as HTMLElement | null;
      const content = getCombinedContent();

      await exportToPDF({
        title,
        author,
        content,
        coverElement: coverEl,
        hasCoverPage: true,
        coverImage,
        genre,
      });

      toast({
        title: 'PDF gerado!',
        description: 'O download foi iniciado.',
      });
    } catch (error) {
      console.error('Export PDF error:', error);
      toast({
        title: 'Erro ao gerar PDF',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [chapters, getCombinedContent, title, author, coverImage, genre, toast]);

  const handleExportDOCX = useCallback(async () => {
    if (chapters.length === 0) {
      toast({
        title: 'Sem conteudo',
        description: 'Adicione pelo menos um capitulo antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const coverEl = document.querySelector('.export-cover-container') as HTMLElement | null;
      const content = getCombinedContent();

      await exportToDOCX({
        title,
        author,
        content,
        coverElement: coverEl,
        hasCoverPage: true,
        coverImage,
        genre,
      });

      toast({
        title: 'DOCX gerado!',
        description: 'O download foi iniciado.',
      });
    } catch (error) {
      console.error('Export DOCX error:', error);
      toast({
        title: 'Erro ao gerar DOCX',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [chapters, getCombinedContent, title, author, coverImage, genre, toast]);

  return {
    getCombinedContent,
    handleExportPDF,
    handleExportDOCX,
  };
};
