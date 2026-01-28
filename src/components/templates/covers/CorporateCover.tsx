interface CoverProps {
  title: string;
  author?: string | null;
  coverImage?: string | null;
  genre?: string | null;
}

export function CorporateCover({ title, author, coverImage, genre }: CoverProps) {
  return (
    <div 
      className="relative w-full h-full flex flex-col"
      style={{
        background: '#ffffff',
        fontFamily: "'Helvetica Neue', Arial, sans-serif"
      }}
    >
      {/* Top accent bar */}
      <div className="h-2" style={{ background: 'linear-gradient(90deg, #1f2937, #374151, #4b5563)' }} />
      
      {/* Header with logo placeholder */}
      <div className="px-12 pt-10 pb-6 flex justify-between items-center">
        <div 
          className="w-12 h-12 flex items-center justify-center"
          style={{ 
            background: '#1f2937',
            borderRadius: '4px'
          }}
        >
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
          </svg>
        </div>
        
        {genre && (
          <span 
            className="text-xs uppercase tracking-widest px-3 py-1"
            style={{ 
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              borderRadius: '2px'
            }}
          >
            {genre}
          </span>
        )}
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col justify-center px-12">
        {/* Geometric accent */}
        <div className="mb-8">
          <div className="flex gap-1">
            <div className="w-16 h-1" style={{ background: '#3b82f6' }} />
            <div className="w-8 h-1" style={{ background: '#1f2937' }} />
            <div className="w-4 h-1" style={{ background: '#9ca3af' }} />
          </div>
        </div>
        
        {/* Title */}
        <h1 
          className="leading-tight mb-6"
          style={{ 
            fontSize: '2.8rem', 
            fontWeight: 700,
            color: '#1f2937',
            letterSpacing: '-0.02em'
          }}
        >
          {title}
        </h1>
        
        {/* Subtitle/Author */}
        {author && (
          <div className="mb-8">
            <p 
              className="uppercase tracking-widest mb-1"
              style={{ fontSize: '0.7rem', color: '#9ca3af' }}
            >
              Autor
            </p>
            <p style={{ fontSize: '1.2rem', color: '#374151', fontWeight: 500 }}>
              {author}
            </p>
          </div>
        )}
        
        {/* Cover image */}
        {coverImage && (
          <div 
            className="overflow-hidden"
            style={{ 
              maxWidth: '320px',
              border: '1px solid #e5e7eb'
            }}
          >
            <img 
              src={coverImage} 
              alt="Capa" 
              className="w-full h-auto object-cover"
              style={{ maxHeight: '180px' }}
            />
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div 
        className="px-12 py-8 flex justify-between items-end"
        style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}
      >
        <div>
          <p style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Documento Profissional
          </p>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8" style={{ background: '#1f2937' }} />
          <div className="w-8 h-8" style={{ background: '#3b82f6' }} />
        </div>
      </div>
    </div>
  );
}
