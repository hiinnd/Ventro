'use client';
import { Button, ErrorState } from '@ventro/ui';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <ErrorState
        title="VENTRO"
        description="Organizations temporarily unavailable. المؤسسات غير متاحة مؤقتًا."
        action={<Button onClick={reset}>Try again / حاول مجددًا</Button>}
      />
    </div>
  );
}
