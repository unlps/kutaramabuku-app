import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor as useTipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Chapter } from '@/types/editor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

// Validation schema
const chapterSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(500000),
});

export const useRobustEditor = (ebookId: string) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  // Initialize TipTap Editor
  const editor = useTipTapEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
    ],
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base lg:prose-lg max-w-none focus:outline-none min-h-[600px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      if (activeChapterId) {
        handleContentChange(editor.getHTML());
      }
    },
  });

  // Fetch chapters from Supabase
  const loadChapters = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('ebook_id', ebookId)
        .order('chapter_order', { ascending: true });

      if (error) throw error;

      const typedChapters: Chapter[] = (data || []).map((ch) => ({
        id: ch.id,
        ebook_id: ch.ebook_id,
        title: ch.title,
        content: ch.content || '',
        chapter_order: ch.chapter_order,
        created_at: ch.created_at,
        updated_at: ch.updated_at,
      }));

      setChapters(typedChapters);

      if (typedChapters.length > 0 && !activeChapterId) {
        setActiveChapterId(typedChapters[0].id);
      }
    } catch (error) {
      console.error('Failed to load chapters:', error);
      toast({
        title: 'Erro ao carregar capítulos',
        description: 'Não foi possível carregar os capítulos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [ebookId, activeChapterId, toast]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  // Sync editor content when active chapter changes
  useEffect(() => {
    if (editor && activeChapterId) {
      const chapter = chapters.find((c) => c.id === activeChapterId);
      if (chapter) {
        const currentContent = editor.getHTML();
        if (currentContent !== chapter.content) {
          editor.commands.setContent(chapter.content || '');
        }
      }
    }
  }, [activeChapterId, editor, chapters]);

  // Handle content changes with debounced save
  const handleContentChange = useCallback(
    (newContent: string) => {
      if (!activeChapterId) return;

      // Update local state immediately
      setChapters((prev) =>
        prev.map((ch) => (ch.id === activeChapterId ? { ...ch, content: newContent } : ch))
      );

      // Debounce save
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          const currentChapter = chapters.find((c) => c.id === activeChapterId);
          if (currentChapter) {
            const result = chapterSchema.safeParse({
              title: currentChapter.title,
              content: newContent,
            });

            if (result.success) {
              const { error } = await supabase
                .from('chapters')
                .update({ content: newContent, updated_at: new Date().toISOString() })
                .eq('id', activeChapterId);

              if (error) throw error;
            }
          }
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setIsSaving(false);
        }
      }, 1500);
    },
    [activeChapterId, chapters]
  );

  // Select chapter
  const selectChapter = useCallback((id: string) => {
    setActiveChapterId(id);
  }, []);

  // Update chapter title
  const updateChapterTitle = useCallback(
    async (title: string) => {
      if (!activeChapterId) return;

      setChapters((prev) =>
        prev.map((ch) => (ch.id === activeChapterId ? { ...ch, title } : ch))
      );

      try {
        const { error } = await supabase
          .from('chapters')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', activeChapterId);

        if (error) throw error;
      } catch (error) {
        toast({
          title: 'Erro ao atualizar título',
          variant: 'destructive',
        });
      }
    },
    [activeChapterId, toast]
  );

  // Add new chapter
  const addChapter = useCallback(async () => {
    try {
      const newOrder = chapters.length;
      const { data, error } = await supabase
        .from('chapters')
        .insert({
          ebook_id: ebookId,
          title: `Capítulo ${newOrder + 1}`,
          content: '',
          chapter_order: newOrder,
        })
        .select()
        .single();

      if (error) throw error;

      const newChapter: Chapter = {
        id: data.id,
        ebook_id: data.ebook_id,
        title: data.title,
        content: data.content || '',
        chapter_order: data.chapter_order,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setChapters((prev) => [...prev, newChapter]);
      setActiveChapterId(newChapter.id);

      toast({ title: 'Capítulo criado!' });
    } catch (error) {
      toast({
        title: 'Erro ao criar capítulo',
        variant: 'destructive',
      });
    }
  }, [chapters.length, ebookId, toast]);

  // Delete chapter
  const deleteChapter = useCallback(
    async (id: string) => {
      if (!confirm('Tem certeza que deseja excluir este capítulo?')) return;

      try {
        const { error } = await supabase.from('chapters').delete().eq('id', id);

        if (error) throw error;

        setChapters((prev) => prev.filter((c) => c.id !== id));

        if (activeChapterId === id) {
          const remaining = chapters.filter((c) => c.id !== id);
          setActiveChapterId(remaining.length > 0 ? remaining[0].id : null);
        }

        toast({ title: 'Capítulo excluído!' });
      } catch (error) {
        toast({
          title: 'Erro ao excluir capítulo',
          variant: 'destructive',
        });
      }
    },
    [activeChapterId, chapters, toast]
  );

  // Reorder chapters
  const reorderChapters = useCallback(
    async (reorderedChapters: Chapter[]) => {
      // Update local state immediately
      setChapters(reorderedChapters);

      // Batch update to database
      try {
        const updates = reorderedChapters.map((ch, index) =>
          supabase.from('chapters').update({ chapter_order: index }).eq('id', ch.id)
        );

        await Promise.all(updates);
      } catch (error) {
        console.error('Failed to reorder chapters:', error);
        toast({
          title: 'Erro ao reordenar capítulos',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const activeChapter = chapters.find((c) => c.id === activeChapterId) || null;

  return {
    editor,
    chapters,
    activeChapter,
    activeChapterId,
    isSaving,
    isLoading,
    selectChapter,
    updateChapterTitle,
    addChapter,
    deleteChapter,
    reorderChapters,
  };
};
