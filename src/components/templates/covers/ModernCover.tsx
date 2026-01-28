interface CoverProps {
  title: string;
  author?: string | null;
  coverImage?: string | null;
  genre?: string | null;
}

export function ModernCover({ title, author, coverImage, genre }: CoverProps) {
  return (
    <div 
      className="modern-cover"
      style={{
        width: '100%',
        height: '100%',
        background: coverImage
          ? `url(${coverImage}) center/cover`
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Helvetica Neue', Arial, sans-serif"
      }}
    >
      {/* Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: coverImage 
          ? 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)'
          : 'transparent'
      }} />
      
      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '10%'
      }}>
        {/* Genre tag */}
        {genre && (
          <div style={{
            alignSelf: 'flex-start',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            padding: '0.5rem 1rem',
            borderRadius: '2rem',
            marginBottom: 'auto'
          }}>
            <span style={{
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'white',
              fontWeight: 500
            }}>
              {genre}
            </span>
          </div>
        )}

        {/* Title area - bottom */}
        <div style={{ marginTop: 'auto' }}>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 6vw, 3rem)',
            fontWeight: 700,
            color: 'white',
            lineHeight: 1.1,
            marginBottom: '1rem',
            textShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            {title}
          </h1>
          
          {author && (
            <p style={{
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 300
            }}>
              {author}
            </p>
          )}
        </div>
      </div>
      
      {/* Decorative element */}
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '-10%',
        width: '50%',
        height: '50%',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        filter: 'blur(40px)'
      }} />
    </div>
  );
}
