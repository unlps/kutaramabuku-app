import React from 'react';
import { Chapter } from '@/types/editor';
import CoverPreview from '@/components/CoverPreview';
import { CoverTemplate } from '@/components/templates/covers';
import { sanitizeHtml } from '@/lib/utils';

interface EditorPreviewProps {
  title: string;
  author?: string | null;
  genre?: string | null;
  coverImage?: string | null;
  coverTemplate: CoverTemplate;
  chapters: Chapter[];
}

const EditorPreview: React.FC<EditorPreviewProps> = ({
  title,
  author,
  genre,
  coverImage,
  coverTemplate,
  chapters,
}) => {
  const sortedChapters = [...chapters].sort((a, b) => a.chapter_order - b.chapter_order);

  const paginateChapter = (rawHtml: string): string[] => {
    const safeHtml = sanitizeHtml(rawHtml || '<p>Capitulo vazio</p>');
    const container = document.createElement('div');
    container.innerHTML = safeHtml;

    const nodes = Array.from(container.childNodes);
    const pages: string[] = [];
    const maxCharsPerPage = 2600;
    let currentHtml = '';
    let currentSize = 0;

    for (const node of nodes) {
      const nodeHtml =
        node.nodeType === Node.ELEMENT_NODE
          ? (node as HTMLElement).outerHTML
          : (node.textContent || '');
      const nodeTextSize = (node.textContent || '').trim().length;

      if (currentSize > 0 && currentSize + nodeTextSize > maxCharsPerPage) {
        pages.push(currentHtml || '<p>Capitulo vazio</p>');
        currentHtml = nodeHtml;
        currentSize = nodeTextSize;
      } else {
        currentHtml += nodeHtml;
        currentSize += nodeTextSize;
      }
    }

    if (currentHtml.trim()) {
      pages.push(currentHtml);
    }

    if (pages.length === 0) {
      pages.push('<p>Capitulo vazio</p>');
    }

    return pages;
  };

  return (
    <div className="paged-preview-container">
      <div className="cover-preview-wrapper" style={{ marginBottom: '2rem' }}>
        <CoverPreview
          template={coverTemplate}
          title={title}
          author={author}
          coverImage={coverImage}
          genre={genre}
        />
      </div>

      {sortedChapters.flatMap((chapter, chapterIndex) =>
        paginateChapter(chapter.content || '').map((pageHtml, pageIndex) => (
          <div
            key={`${chapter.id}-page-${pageIndex}`}
            className="a4-page rich-text-content"
            style={{
              pageBreakBefore: chapterIndex === 0 && pageIndex === 0 ? 'auto' : 'always',
            }}
          >
            {pageIndex === 0 && (
              <h1
                style={{
                  textAlign: 'center',
                  marginBottom: '2em',
                  fontSize: '24pt',
                  fontWeight: 'bold',
                  color: '#1a1a1a',
                  borderBottom: '1px solid #e5e5e5',
                  paddingBottom: '0.5em',
                }}
              >
                {chapter.title}
              </h1>
            )}

            <div
              className="chapter-content"
              dangerouslySetInnerHTML={{
                __html: pageHtml,
              }}
            />
          </div>
        ))
      )}

      {sortedChapters.length === 0 && (
        <div className="a4-page flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Nenhum capitulo criado</p>
            <p className="text-sm mt-2">Adicione capitulos para visualizar a previa</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPreview;
