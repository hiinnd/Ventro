import { Skeleton } from '@ventro/ui';
export default function Loading() {
  return (
    <div role="status" aria-label="VENTRO" className="mx-auto grid max-w-6xl gap-5 p-8">
      <Skeleton className="h-16" />
      <div className="grid grid-cols-2 gap-5">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
