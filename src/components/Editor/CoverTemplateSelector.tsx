import React from 'react';
import { coverTemplates, CoverTemplate } from '@/components/templates/covers';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import CoverPreview from '@/components/CoverPreview';

interface CoverTemplateSelectorProps {
  selectedTemplate: CoverTemplate;
  onSelectTemplate: (template: CoverTemplate) => void;
  title: string;
  author?: string | null;
  coverImage?: string | null;
  genre?: string | null;
}

const CoverTemplateSelector: React.FC<CoverTemplateSelectorProps> = ({
  selectedTemplate,
  onSelectTemplate,
  title,
  author,
  coverImage,
  genre,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Template de Capa</h3>
        <span className="text-xs text-muted-foreground">
          {coverTemplates.find(t => t.id === selectedTemplate)?.name}
        </span>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-4">
          {coverTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className={cn(
                'flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200',
                'border-2 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring',
                selectedTemplate === template.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border'
              )}
              title={template.description}
            >
              <div className="w-20 h-28 relative">
                <div 
                  className="absolute inset-0 transform scale-[0.1] origin-top-left"
                  style={{ 
                    width: '8.5in', 
                    height: '11in',
                  }}
                >
                  <CoverPreview
                    template={template.id}
                    title={title || 'Título'}
                    author={author}
                    coverImage={coverImage}
                    genre={genre}
                  />
                </div>
              </div>
              <div className="p-1.5 bg-card border-t border-border">
                <p className="text-[10px] font-medium text-foreground truncate text-center">
                  {template.name}
                </p>
              </div>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default CoverTemplateSelector;
