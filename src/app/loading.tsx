import { Skeleton } from "@/components/ui/skeleton";

export default function PageLoading() {
  return (
    <div className="space-y-8">
      {/* Category Filter Skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-3" />
        <div className="flex space-x-2 p-2 border rounded-md">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
      </div>

      {/* Article Grid Skeleton */}
      <div>
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex flex-col space-y-3 p-4 border rounded-lg bg-card">
              <Skeleton className="h-48 w-full rounded-md" />
              <Skeleton className="h-4 w-20 mt-2" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex justify-between items-center pt-2 mt-auto">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
