interface CoverProps {
  title: string;
  author?: string | null;
  coverImage?: string | null;
  genre?: string | null;
}

export function EducativoCover({ title, author, coverImage, genre }: CoverProps) {
  return (
    <div 
      className="relative w-full h-full flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%)',
        fontFamily: "'Georgia', serif"
      }}
    >
      {/* Top decorative bar */}
      <div className="h-3" style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #fcd34d)' }} />
      
      {/* Header section with icon */}
      <div className="flex justify-center pt-12 pb-6">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255, 255, 255, 0.15)', border: '3px solid rgba(255, 255, 255, 0.3)' }}
        >
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
          </svg>
        </div>
      </div>
      
      {/* Genre badge */}
      {genre && (
        <div className="flex justify-center mb-4">
          <span 
            className="px-4 py-1 text-xs uppercase tracking-widest"
            style={{ 
              background: 'rgba(245, 158, 11, 0.9)', 
              color: '#1e3a5f',
              borderRadius: '2px',
              fontWeight: 600
            }}
          >
            {genre}
          </span>
        </div>
      )}
      
      {/* Title */}
      <div className="flex-1 flex flex-col justify-center px-12 text-center">
        <h1 
          className="text-white leading-tight mb-6"
          style={{ 
            fontSize: '2.5rem', 
            fontWeight: 700,
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          {title}
        </h1>
        
        {/* Decorative line */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-1" style={{ background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)' }} />
        </div>
        
        {author && (
          <p 
            className="text-white/90"
            style={{ fontSize: '1.1rem', fontStyle: 'italic' }}
          >
            {author}
          </p>
        )}
      </div>
      
      {/* Cover image section */}
      {coverImage && (
        <div className="px-12 pb-8">
          <div 
            className="mx-auto overflow-hidden"
            style={{ 
              maxWidth: '280px',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}
          >
            <img 
              src={coverImage} 
              alt="Capa" 
              className="w-full h-auto object-cover"
              style={{ maxHeight: '200px' }}
            />
          </div>
        </div>
      )}
      
      {/* Bottom decorative element */}
      <div className="h-16 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className="w-2 h-2 rounded-full"
              style={{ background: i === 3 ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
