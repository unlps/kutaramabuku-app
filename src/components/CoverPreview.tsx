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
      default:
        return <ClassicCover {...coverProps} />;
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
