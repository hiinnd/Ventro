'use client';
import { Button } from '@ventro/ui';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-2xl font-semibold">Something went wrong / حدث خطأ</h1>
      <p className="my-5 text-muted-foreground">Please try again. / يرجى إعادة المحاولة.</p>
      <Button onClick={reset}>Try again / إعادة المحاولة</Button>
    </main>
  );
}
