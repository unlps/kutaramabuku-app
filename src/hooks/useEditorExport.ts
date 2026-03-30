import { useCallback } from 'react';
import { Chapter } from '@/types/editor';
import { exportToPDF, exportToDOCX, sanitizeFilename } from '@/services/exportService';
import { useToast } from '@/hooks/use-toast';
import { CoverTemplate } from '@/components/templates/covers';
import { supabase } from '@/integrations/supabase/client';

interface UseEditorExportOptions {
  ebookId: string;
  title: string;
  author?: string | null;
  genre?: string | null;
  coverImage?: string | null;
  coverTemplate: CoverTemplate;
  chapters: Chapter[];
}

export const useEditorExport = ({
  ebookId,
  title,
  author,
  genre,
  coverImage,
  coverTemplate,
  chapters,
}: UseEditorExportOptions) => {
  const { toast } = useToast();

  const uploadExport = useCallback(
    async (format: 'pdf' | 'docx', blob: Blob) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        throw new Error('Sessao invalida para guardar o ficheiro.');
      }

      if (!ebookId) {
        throw new Error('Ebook invalido para exportacao.');
      }

      const filePath = `${session.user.id}/${ebookId}/exports/latest.${format}`;
      const contentType =
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const { error: uploadError } = await supabase.storage
        .from('ebook-uploads')
        .upload(filePath, blob, {
          upsert: true,
          contentType,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedUrl, error: signedUrlError } = await supabase.storage
        .from('ebook-uploads')
        .createSignedUrl(filePath, 60 * 60);

      if (signedUrlError || !signedUrl?.signedUrl) {
        throw signedUrlError || new Error('Nao foi possivel abrir o ficheiro exportado.');
      }

      const { data: currentEbook } = await supabase
        .from('ebooks')
        .select('formats')
        .eq('id', ebookId)
        .maybeSingle();

      const mergedFormats = Array.from(
        new Set([...(currentEbook?.formats || []), format.toUpperCase()])
      );

      await supabase
        .from('ebooks')
        .update({
          formats: mergedFormats,
          file_size: `${Math.max(blob.size / 1024, 1).toFixed(1)} KB`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ebookId);

      return {
        fileName: `${sanitizeFilename(title)}.${format}`,
        url: signedUrl.signedUrl,
      };
    },
    [ebookId, title]
  );

  const getCombinedContent = useCallback((): string => {
    if (chapters.length === 0) return '';

    return [...chapters]
      .sort((a, b) => a.chapter_order - b.chapter_order)
      .map((chapter, index) => {
        const chapterBreak = index > 0 ? '<div data-page-break="chapter"></div>' : '';
        const content =
          (chapter.content || '').trim() ||
          `<h1 style="text-align: center;">${chapter.title}</h1><p>Capitulo vazio</p>`;
        return `${chapterBreak}\n${content}`;
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

      const blob = await exportToPDF({
        title,
        author,
        content,
        coverElement: coverEl,
        hasCoverPage: true,
        coverImage,
        genre,
      });

      const { url } = await uploadExport('pdf', blob);
      window.open(url, '_blank', 'noopener,noreferrer');

      toast({
        title: 'PDF guardado no aplicativo!',
        description: 'O ficheiro foi exportado para a biblioteca do aplicativo.',
      });
    } catch (error) {
      console.error('Export PDF error:', error);
      toast({
        title: 'Erro ao gerar PDF',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [chapters, getCombinedContent, title, author, coverImage, genre, toast, uploadExport]);

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

      const blob = await exportToDOCX({
        title,
        author,
        content,
        coverElement: coverEl,
        hasCoverPage: true,
        coverImage,
        genre,
      });

      const { url } = await uploadExport('docx', blob);
      window.open(url, '_blank', 'noopener,noreferrer');

      toast({
        title: 'DOCX guardado no aplicativo!',
        description: 'O ficheiro foi exportado para a biblioteca do aplicativo.',
      });
    } catch (error) {
      console.error('Export DOCX error:', error);
      toast({
        title: 'Erro ao gerar DOCX',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [chapters, getCombinedContent, title, author, coverImage, genre, toast, uploadExport]);

  return {
    getCombinedContent,
    handleExportPDF,
    handleExportDOCX,
  };
};
