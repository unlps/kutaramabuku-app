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

const PAGE_CONTENT_HEIGHT_PX = 864; // 11in - 2in margins at 96dpi
const FIRST_PAGE_TITLE_RESERVED_PX = 150;
const CONTENT_WIDTH = '6.5in';

const createMeasureContainer = () => {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    width: CONTENT_WIDTH,
    visibility: 'hidden',
    pointerEvents: 'none',
    fontFamily: 'Calibri, Segoe UI, system-ui, sans-serif',
    fontSize: '12pt',
    lineHeight: '1.6',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
  });
  document.body.appendChild(el);
  return el;
};

const paginateChapterByHeight = (rawHtml: string): string[] => {
  const safeHtml = sanitizeHtml(rawHtml || '<p>Capitulo vazio</p>');

  if (typeof document === 'undefined') {
    return [safeHtml];
  }

  const source = document.createElement('div');
  source.innerHTML = safeHtml;

  const blocks = Array.from(source.childNodes).filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').trim().length > 0;
    return true;
  });

  if (blocks.length === 0) {
    return ['<p>Capitulo vazio</p>'];
  }

  const measure = createMeasureContainer();

  const fitsIn = (html: string, maxHeight: number) => {
    measure.innerHTML = html || '<p></p>';
    return measure.scrollHeight <= maxHeight;
  };

  const pages: string[] = [];
  let current = '';
  let pageLimit = PAGE_CONTENT_HEIGHT_PX - FIRST_PAGE_TITLE_RESERVED_PX;

  const pushCurrentPage = () => {
    if (current.trim()) {
      pages.push(current);
      current = '';
      pageLimit = PAGE_CONTENT_HEIGHT_PX;
    }
  };

  for (const node of blocks) {
    const blockHtml =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement).outerHTML
        : `<p>${(node.textContent || '').trim()}</p>`;

    const candidate = current ? `${current}${blockHtml}` : blockHtml;

    if (fitsIn(candidate, pageLimit)) {
      current = candidate;
      continue;
    }

    pushCurrentPage();

    if (fitsIn(blockHtml, pageLimit)) {
      current = blockHtml;
      continue;
    }

    const text = (node.textContent || '').trim();
    if (!text) continue;

    const words = text.split(/\s+/);
    let chunk = '';

    for (const word of words) {
      const nextChunk = chunk ? `${chunk} ${word}` : word;
      const wrapped = `<p>${nextChunk}</p>`;

      if (fitsIn(wrapped, pageLimit)) {
        chunk = nextChunk;
      } else {
        if (chunk) {
          pages.push(`<p>${chunk}</p>`);
          pageLimit = PAGE_CONTENT_HEIGHT_PX;
        }
        chunk = word;
      }
    }

    if (chunk) {
      current = `<p>${chunk}</p>`;
    }
  }

  if (current.trim()) {
    pages.push(current);
  }

  if (pages.length === 0) {
    pages.push('<p>Capitulo vazio</p>');
  }

  document.body.removeChild(measure);
  return pages;
};

const EditorPreview: React.FC<EditorPreviewProps> = ({
  title,
  author,
  genre,
  coverImage,
  coverTemplate,
  chapters,
}) => {
  const sortedChapters = [...chapters].sort((a, b) => a.chapter_order - b.chapter_order);

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
        paginateChapterByHeight(chapter.content || '').map((pageHtml, pageIndex) => (
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
