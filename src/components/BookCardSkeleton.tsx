import { Skeleton } from "@/components/ui/skeleton";

export const BookCardSkeleton = () => {
  return (
    <div className="w-44 flex-shrink-0 bg-card rounded-xl shadow-md border border-border overflow-hidden">
      {/* Cover image skeleton */}
      <div className="relative">
        <Skeleton className="aspect-[2/3] w-full rounded-none" />
        <Skeleton className="absolute top-2 right-2 h-5 w-12 rounded-full" />
      </div>
      
      {/* Content skeleton */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
    </div>
  );
};
