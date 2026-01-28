interface CoverProps {
  title: string;
  author?: string | null;
  coverImage?: string | null;
  genre?: string | null;
}

export function RomanceCover({ title, author, coverImage, genre }: CoverProps) {
  return (
    <div 
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #fdf2f8 0%, #fce7f3 30%, #fbcfe8 70%, #f9a8d4 100%)',
        fontFamily: "'Playfair Display', Georgia, serif"
      }}
    >
      {/* Decorative circles */}
      <div 
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full"
        style={{ background: 'rgba(244, 114, 182, 0.15)' }}
      />
      <div 
        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full"
        style={{ background: 'rgba(236, 72, 153, 0.1)' }}
      />
      
      {/* Top decorative flourish */}
      <div className="flex justify-center pt-12">
        <svg className="w-32 h-8" viewBox="0 0 120 30" fill="none">
          <path 
            d="M10 15 Q30 5 60 15 Q90 25 110 15" 
            stroke="#be185d" 
            strokeWidth="1.5" 
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="60" cy="15" r="4" fill="#be185d" />
        </svg>
      </div>
      
      {/* Genre tag */}
      {genre && (
        <div className="flex justify-center mt-6">
          <span 
            className="px-6 py-2 text-xs uppercase tracking-[0.2em]"
            style={{ 
              color: '#be185d',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500
            }}
          >
            {genre}
          </span>
        </div>
      )}
      
      {/* Cover image - large and centered */}
      {coverImage && (
        <div className="flex justify-center mt-6 px-8">
          <div 
            className="overflow-hidden"
            style={{ 
              maxWidth: '280px',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(190, 24, 93, 0.2)',
              border: '4px solid rgba(255, 255, 255, 0.8)'
            }}
          >
            <img 
              src={coverImage} 
              alt="Capa" 
              className="w-full object-cover"
              style={{ height: '300px' }}
            />
          </div>
        </div>
      )}
      
      {/* Title section */}
      <div className="flex-1 flex flex-col justify-center px-10 text-center relative z-10">
        <h1 
          className="leading-tight mb-4"
          style={{ 
            fontSize: coverImage ? '2rem' : '2.8rem', 
            fontWeight: 700,
            color: '#831843',
            fontStyle: 'italic'
          }}
        >
          {title}
        </h1>
        
        {/* Heart divider */}
        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="w-12 h-px" style={{ background: 'linear-gradient(90deg, transparent, #ec4899)' }} />
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#ec4899">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <div className="w-12 h-px" style={{ background: 'linear-gradient(90deg, #ec4899, transparent)' }} />
        </div>
        
        {author && (
          <p 
            style={{ 
              fontSize: '1.1rem', 
              color: '#9d174d',
              fontStyle: 'normal',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400
            }}
          >
            {author}
          </p>
        )}
      </div>
      
      {/* Bottom flourish */}
      <div className="flex justify-center pb-10">
        <svg className="w-24 h-6" viewBox="0 0 100 24" fill="none">
          <path 
            d="M5 12 Q25 20 50 12 Q75 4 95 12" 
            stroke="#f472b6" 
            strokeWidth="1" 
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
