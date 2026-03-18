import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor as useTipTapEditor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import {
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  BackgroundColor,
} from '@tiptap/extension-text-style';
import { Chapter } from '@/types/editor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

// Validation schema
const chapterSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(500000),
});

const VerticalAlignTextStyle = Extension.create({
  name: 'verticalAlignTextStyle',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          verticalAlign: {
            default: null,
            parseHTML: (element) => element.style.verticalAlign || null,
            renderHTML: (attributes) => {
              if (!attributes.verticalAlign) return {};
              return {
                style: `vertical-align: ${attributes.verticalAlign}; font-size: 0.75em`,
              };
            },
          },
        },
      },
    ];
  },
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getFirstBlockElement = (root: HTMLElement): HTMLElement | null =>
  Array.from(root.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement
  ) || null;

const ensureChapterDocument = (title: string, content: string) => {
  const trimmedTitle = title.trim() || 'Novo Capitulo';
  const safeTitle = escapeHtml(trimmedTitle);
  const normalizedContent = (content || '').trim();

  if (!normalizedContent) {
    return `<h1 style="text-align: center;">${safeTitle}</h1><p></p>`;
  }

  if (typeof document === 'undefined') {
    return normalizedContent.includes('<h1')
      ? normalizedContent
      : `<h1 style="text-align: center;">${safeTitle}</h1>${normalizedContent}`;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(normalizedContent, 'text/html');
  const firstBlock = getFirstBlockElement(doc.body);

  if (!firstBlock) {
    return `<h1 style="text-align: center;">${safeTitle}</h1><p></p>`;
  }

  if (firstBlock.tagName.toLowerCase() === 'h1') {
    return doc.body.innerHTML;
  }

  const titleNode = doc.createElement('h1');
  titleNode.textContent = trimmedTitle;
  titleNode.style.textAlign = 'center';
  doc.body.insertBefore(titleNode, firstBlock);
  return doc.body.innerHTML;
};

const extractChapterState = (fallbackTitle: string, rawHtml: string) => {
  const normalizedContent = ensureChapterDocument(fallbackTitle, rawHtml);

  if (typeof document === 'undefined') {
    return {
      title: fallbackTitle.trim() || 'Novo Capitulo',
      content: normalizedContent,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(normalizedContent, 'text/html');
  const firstBlock = getFirstBlockElement(doc.body);

  return {
    title: firstBlock?.textContent?.trim() || fallbackTitle.trim() || 'Novo Capitulo',
    content: doc.body.innerHTML,
  };
};

const replaceFirstBlockText = (rawHtml: string, nextTitle: string) => {
  const trimmedTitle = nextTitle.trim() || 'Novo Capitulo';
  const normalizedContent = ensureChapterDocument(trimmedTitle, rawHtml);

  if (typeof document === 'undefined') {
    return normalizedContent.replace(
      /<h1[^>]*>.*?<\/h1>/i,
      `<h1 style="text-align: center;">${escapeHtml(trimmedTitle)}</h1>`
    );
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(normalizedContent, 'text/html');
  const firstBlock = getFirstBlockElement(doc.body);

  if (firstBlock) {
    firstBlock.textContent = trimmedTitle;
  }

  return doc.body.innerHTML;
};

export const useRobustEditor = (ebookId: string, isEditable = true) => {
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
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      BackgroundColor,
      VerticalAlignTextStyle,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg max-w-none focus:outline-none',
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
        content: ensureChapterDocument(ch.title, ch.content || ''),
        chapter_order: ch.chapter_order,
        created_at: ch.created_at,
        updated_at: ch.updated_at,
      }));

      setChapters(typedChapters);

      // Only set active chapter on initial load
      setActiveChapterId((prev) => {
        if (!prev && typedChapters.length > 0) {
          return typedChapters[0].id;
        }
        return prev;
      });
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
  }, [ebookId, toast]);

  useEffect(() => {
    if (ebookId) {
      loadChapters();
    }
  }, [ebookId, loadChapters]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditable);
    }
  }, [editor, isEditable]);

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

      const currentChapter = chapters.find((ch) => ch.id === activeChapterId);
      const nextChapterState = extractChapterState(
        currentChapter?.title || 'Novo Capitulo',
        newContent
      );

      // Update local state immediately
      setChapters((prev) =>
        prev.map((ch) =>
          ch.id === activeChapterId
            ? {
                ...ch,
                title: nextChapterState.title,
                content: nextChapterState.content,
              }
            : ch
        )
      );

      // Debounce save
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          const result = chapterSchema.safeParse({
            title: nextChapterState.title,
            content: nextChapterState.content,
          });

          if (result.success) {
            const { error } = await supabase
              .from('chapters')
              .update({
                title: nextChapterState.title,
                content: nextChapterState.content,
                updated_at: new Date().toISOString(),
              })
              .eq('id', activeChapterId);

            if (error) throw error;
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

      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      const currentChapter = chapters.find((ch) => ch.id === activeChapterId);
      if (!currentChapter) return;

      const nextContent = replaceFirstBlockText(currentChapter.content, trimmedTitle);

      setChapters((prev) =>
        prev.map((ch) =>
          ch.id === activeChapterId
            ? { ...ch, title: trimmedTitle, content: nextContent }
            : ch
        )
      );

      if (editor) {
        editor.commands.setContent(nextContent, { emitUpdate: false });
      }

      try {
        const { error } = await supabase
          .from('chapters')
          .update({
            title: trimmedTitle,
            content: nextContent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeChapterId);

        if (error) throw error;
      } catch (error) {
        toast({
          title: 'Erro ao atualizar título',
          variant: 'destructive',
        });
      }
    },
    [activeChapterId, chapters, editor, toast]
  );

  // Update chapter title by id (used by sidebar inline rename)
  const updateChapterTitleById = useCallback(
    async (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      const currentChapter = chapters.find((ch) => ch.id === id);
      if (!currentChapter) return;

      const nextContent = replaceFirstBlockText(currentChapter.content, trimmed);

      setChapters((prev) =>
        prev.map((ch) => (ch.id === id ? { ...ch, title: trimmed, content: nextContent } : ch))
      );

      if (editor && activeChapterId === id) {
        editor.commands.setContent(nextContent, { emitUpdate: false });
      }

      try {
        const { error } = await supabase
          .from('chapters')
          .update({
            title: trimmed,
            content: nextContent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        toast({
          title: 'Erro ao atualizar título',
          variant: 'destructive',
        });
      }
    },
    [activeChapterId, chapters, editor, toast]
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
          content: `<h1 style="text-align: center;">Capítulo ${newOrder + 1}</h1><p>Algum texto</p>`,
          chapter_order: newOrder,
        })
        .select()
        .single();

      if (error) throw error;

      const newChapter: Chapter = {
        id: data.id,
        ebook_id: data.ebook_id,
        title: data.title,
        content: ensureChapterDocument(data.title, data.content || ''),
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
    updateChapterTitleById,
    addChapter,
    deleteChapter,
    reorderChapters,
  };
};
