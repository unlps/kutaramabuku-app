import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { stripHtml } from "@/lib/utils";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  coverImage?: string;
  description?: string;
  genre?: string;
  price?: number;
  downloads?: number;
  pages?: number;
  formats?: string[];
  publishedAt?: string;
  rating?: number;
}

export const BookCard = ({
  id,
  title,
  author,
  coverImage,
  description,
  genre,
  price,
  downloads = 0,
  pages = 0,
  formats = ["PDF"],
  publishedAt,
  rating = 0,
}: BookCardProps) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div
          className="cursor-pointer group w-44 flex-shrink-0 bg-card rounded-xl shadow-md border border-border overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-300"
          onClick={() => navigate(`/book/${id}`)}
        >
          {/* Cover Image */}
          <div className="aspect-[2/3] relative overflow-hidden bg-muted">
            {coverImage && !imageError ? (
              <img
                src={coverImage}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-primary">
                <FileText className="h-12 w-12 text-white" />
              </div>
            )}
            {price === 0 && (
              <Badge className="absolute top-2 right-2 bg-primary text-xs shadow-sm">Grátis</Badge>
            )}
          </div>
          
          {/* Content */}
          <div className="p-3 space-y-1.5">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{stripHtml(title)}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{author}</p>
            <div className="flex items-center justify-between pt-1">
              {genre && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                  {genre}
                </Badge>
              )}
              {rating > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500 text-xs">★</span>
                  <span className="text-xs font-medium">{rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="right">
        <div className="space-y-3">
          <div>
            <h4 className="font-bold text-lg mb-1">{stripHtml(title)}</h4>
            <p className="text-sm text-muted-foreground">{author}</p>
          </div>
          
          {description && (
            <p className="text-sm leading-relaxed">
              {truncateText(description, 150)}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {publishedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(publishedAt), "dd MMM yyyy", { locale: ptBR })}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <span>{downloads} downloads</span>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{pages} páginas</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Formatos:</span>
              <span className="font-medium">{formats.join(", ")}</span>
            </div>
          </div>

          {price !== undefined && (
            <div className="pt-2 border-t">
              <span className="font-bold text-lg text-primary">
                {price === 0 ? "Grátis" : `${price.toFixed(2)} MT`}
              </span>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
