'use client';
import { Button, ErrorState } from '@ventro/ui';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <ErrorState
        title="VENTRO"
        description="Organizer workspace temporarily unavailable. مساحة المنظّم غير متاحة مؤقتًا."
        action={<Button onClick={reset}>Try again / حاول مجددًا</Button>}
      />
    </div>
  );
}
