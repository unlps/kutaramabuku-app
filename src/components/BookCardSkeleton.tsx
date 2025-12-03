import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const BookCardSkeleton = () => {
  return (
    <Card className="w-[180px] flex-shrink-0 overflow-hidden">
      <CardContent className="p-0">
        {/* Cover image skeleton with book-like aspect ratio */}
        <div className="relative">
          <Skeleton className="aspect-[3/4] w-full rounded-t-lg rounded-b-none" />
          {/* Price badge skeleton */}
          <Skeleton className="absolute top-2 right-2 h-5 w-12 rounded-full" />
        </div>
        
        {/* Content skeleton */}
        <div className="p-3 space-y-2">
          {/* Title */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          
          {/* Author */}
          <Skeleton className="h-3 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
};
