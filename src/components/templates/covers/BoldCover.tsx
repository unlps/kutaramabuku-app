interface CoverProps {
  title: string;
  author?: string | null;
  coverImage?: string | null;
  genre?: string | null;
}

export function BoldCover({ title, author, coverImage, genre }: CoverProps) {
  return (
    <div 
      className="bold-cover"
      style={{
        width: '100%',
        height: '100%',
        background: coverImage
          ? `url(${coverImage}) center/cover`
          : '#0a0a0a',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Impact', 'Arial Black', sans-serif",
        overflow: 'hidden'
      }}
    >
      {/* Color overlay strips */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40%',
        background: 'linear-gradient(to bottom, #ff6b35 0%, transparent 100%)',
        opacity: 0.9
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: 'linear-gradient(to top, #0a0a0a 0%, transparent 100%)'
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '8%',
        justifyContent: 'space-between'
      }}>
        {/* Top - Genre */}
        {genre && (
          <div style={{
            background: '#fff',
            color: '#0a0a0a',
            padding: '0.4rem 1rem',
            alignSelf: 'flex-start',
            transform: 'skewX(-5deg)'
          }}>
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: "'Arial', sans-serif"
            }}>
              {genre}
            </span>
          </div>
        )}

        {/* Center - Title */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 8vw, 4rem)',
            fontWeight: 900,
            color: '#fff',
            lineHeight: 0.95,
            textTransform: 'uppercase',
            textShadow: '4px 4px 0 #ff6b35, 8px 8px 0 rgba(0,0,0,0.3)',
            letterSpacing: '-0.02em'
          }}>
            {title}
          </h1>
        </div>

        {/* Bottom - Author */}
        {author && (
          <div style={{ 
            textAlign: 'right',
            borderTop: '3px solid #ff6b35',
            paddingTop: '1rem'
          }}>
            <p style={{
              fontSize: '1rem',
              color: '#fff',
              fontFamily: "'Arial', sans-serif",
              fontWeight: 400,
              letterSpacing: '0.05em'
            }}>
              {author}
            </p>
          </div>
        )}
      </div>

      {/* Decorative elements */}
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '-5%',
        width: '40%',
        height: '40%',
        border: '8px solid rgba(255,107,53,0.3)',
        transform: 'rotate(15deg)'
      }} />
    </div>
  );
}
