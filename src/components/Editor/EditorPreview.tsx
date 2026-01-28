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

  return (
    <div className="paged-preview-container">
      {/* Cover Page */}
      <div className="cover-preview-wrapper" style={{ marginBottom: '2rem' }}>
        <CoverPreview
          template={coverTemplate}
          title={title}
          author={author}
          coverImage={coverImage}
          genre={genre}
        />
      </div>

      {/* Chapter Pages */}
      {sortedChapters.map((chapter, index) => (
        <div 
          key={chapter.id} 
          className="a4-page rich-text-content"
          style={{ 
            pageBreakBefore: index === 0 ? 'auto' : 'always',
          }}
        >
          {/* Chapter Title */}
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

          {/* Chapter Content */}
          <div 
            className="chapter-content"
            dangerouslySetInnerHTML={{ 
              __html: sanitizeHtml(chapter.content || '<p>Capítulo vazio</p>') 
            }}
          />
        </div>
      ))}

      {/* Empty state */}
      {sortedChapters.length === 0 && (
        <div className="a4-page flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Nenhum capítulo criado</p>
            <p className="text-sm mt-2">Adicione capítulos para visualizar a prévia</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPreview;
