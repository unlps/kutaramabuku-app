interface CoverProps {
  title: string;
  author?: string | null;
  coverImage?: string | null;
  genre?: string | null;
}

export function MinimalCover({ title, author, coverImage, genre }: CoverProps) {
  return (
    <div 
      className="minimal-cover"
      style={{
        width: '100%',
        height: '100%',
        background: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Cover image area (if provided) */}
      {coverImage && (
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          right: '15%',
          height: '45%',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <img 
            src={coverImage} 
            alt="Capa"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
      )}

      {/* Content area */}
      <div style={{
        marginTop: coverImage ? 'auto' : '40%',
        padding: '10% 12%',
        paddingBottom: '15%'
      }}>
        {/* Genre */}
        {genre && (
          <p style={{
            fontSize: '0.6rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#888',
            marginBottom: '1rem'
          }}>
            {genre}
          </p>
        )}

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
          fontWeight: 600,
          color: '#1a1a1a',
          lineHeight: 1.2,
          marginBottom: '1rem',
          letterSpacing: '-0.02em'
        }}>
          {title}
        </h1>

        {/* Divider */}
        <div style={{
          width: '3rem',
          height: '3px',
          background: '#1a1a1a',
          marginBottom: '1rem'
        }} />

        {/* Author */}
        {author && (
          <p style={{
            fontSize: '0.9rem',
            color: '#666',
            fontWeight: 400
          }}>
            {author}
          </p>
        )}
      </div>

      {/* Subtle corner accent */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '30%',
        height: '8px',
        background: '#1a1a1a'
      }} />
    </div>
  );
}
