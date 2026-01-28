import { 
  ClassicCover, 
  ModernCover, 
  MinimalCover, 
  BoldCover, 
  EducativoCover,
  CorporateCover,
  RomanceCover,
  CoverTemplate 
} from './templates/covers';

interface CoverPreviewProps {
  template: CoverTemplate;
  title: string;
  author?: string | null;
  coverImage?: string | null;
  genre?: string | null;
}

export default function CoverPreview({ template, title, author, coverImage, genre }: CoverPreviewProps) {
  const coverProps = { title, author, coverImage, genre };

  const renderCover = () => {
    switch (template) {
      case 'none':
      default:
        // Just display the cover image without any template styling - this is the default
        return (
          <div className="w-full h-full bg-background flex items-center justify-center">
            {coverImage ? (
              <img src={coverImage} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-muted-foreground p-8 flex flex-col items-center justify-center h-full">
                <p className="text-lg font-medium">{title}</p>
                {author && <p className="text-sm mt-2">{author}</p>}
              </div>
            )}
          </div>
        );
      case 'classic':
        return <ClassicCover {...coverProps} />;
      case 'modern':
        return <ModernCover {...coverProps} />;
      case 'minimal':
        return <MinimalCover {...coverProps} />;
      case 'bold':
        return <BoldCover {...coverProps} />;
      case 'educativo':
        return <EducativoCover {...coverProps} />;
      case 'corporate':
        return <CorporateCover {...coverProps} />;
      case 'romance':
        return <RomanceCover {...coverProps} />;
    }
  };

  return (
    <div 
      className="cover-preview-container"
      style={{
        width: '8.5in',
        height: '11in',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        margin: '0 auto 2rem',
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      {renderCover()}
    </div>
  );
}
