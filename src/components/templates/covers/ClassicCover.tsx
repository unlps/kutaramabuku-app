interface CoverProps {
  title: string;
  author?: string | null;
  coverImage?: string | null;
  genre?: string | null;
}

export function ClassicCover({ title, author, coverImage, genre }: CoverProps) {
  return (
    <div 
      className="classic-cover"
      style={{
        width: '100%',
        height: '100%',
        background: coverImage 
          ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${coverImage}) center/cover`
          : 'linear-gradient(145deg, #2c1810 0%, #4a2c2a 50%, #1a0f0a 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '15%',
        boxSizing: 'border-box',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: '#f5e6d3'
      }}
    >
      {/* Top ornament */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '60%',
          height: '2px',
          background: 'linear-gradient(to right, transparent, #c9a227, transparent)',
          margin: '0 auto 1rem'
        }} />
        {genre && (
          <span style={{
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#c9a227'
          }}>
            {genre}
          </span>
        )}
      </div>

      {/* Title and Author */}
      <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          fontWeight: 'normal',
          marginBottom: '1.5rem',
          lineHeight: 1.2,
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>
          {title}
        </h1>
        
        {author && (
          <>
            <div style={{
              width: '30%',
              height: '1px',
              background: '#c9a227',
              margin: '0 auto 1rem'
            }} />
            <p style={{
              fontSize: '1rem',
              fontStyle: 'italic',
              color: '#e8d4b8'
            }}>
              {author}
            </p>
          </>
        )}
      </div>

      {/* Bottom ornament */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40%',
          height: '2px',
          background: 'linear-gradient(to right, transparent, #c9a227, transparent)',
          margin: '0 auto'
        }} />
      </div>
    </div>
  );
}
