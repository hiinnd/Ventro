import { Skeleton } from '@ventro/ui';
export default function Loading() {
  return (
    <div role="status" aria-label="VENTRO" className="mx-auto grid max-w-4xl gap-5 p-8">
      <Skeleton className="h-20" />
      <Skeleton className="h-72" />
    </div>
  );
}
