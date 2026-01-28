import { Editor } from '@tiptap/react';

export interface Chapter {
  id: string;
  ebook_id: string;
  title: string;
  content: string;
  chapter_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Ebook {
  id: string;
  title: string;
  description: string;
  cover_image: string | null;
  author: string | null;
  genre: string | null;
  price: number;
  user_id: string;
  template_id?: string | null;
  chapters?: Chapter[];
}

export interface EditorContextType {
  editor: Editor | null;
  activeChapter: Chapter | null;
  chapters: Chapter[];
  isSaving: boolean;
  
  selectChapter: (chapterId: string) => void;
  updateChapterContent: (content: string) => void;
  updateChapterTitle: (title: string) => void;
  addChapter: () => void;
  deleteChapter: (chapterId: string) => void;
  reorderChapters: (chapters: Chapter[]) => void;
}

export interface ToolbarProps {
  editor: Editor | null;
}
