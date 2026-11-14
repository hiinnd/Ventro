import { notFound } from 'next/navigation';
import { authApiUrl } from '../../../../lib/auth/server';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const response = await fetch(new URL('/api/v1/passports/' + slug, authApiUrl('session')), {
    cache: 'no-store',
  });
  if (!response.ok) notFound();
  const passport = (await response.json()) as {
    name: string;
    learningHours: number | null;
    certificates: { eventTitle: string }[];
    completedEvents: { title: string }[];
  };
  return (
    <main className="container py-16">
      <p className="dash-eyebrow">VENTRO / EVENT PASSPORT</p>
      <h1>{passport.name}</h1>
      {passport.learningHours !== null && <p>{passport.learningHours} verified learning hours</p>}
      {passport.certificates.length > 0 && (
        <section>
          <h2>Verified certificates</h2>
          <ul>
            {passport.certificates.map((certificate, index) => (
              <li key={index}>{certificate.eventTitle}</li>
            ))}
          </ul>
        </section>
      )}
      {passport.completedEvents.length > 0 && (
        <section>
          <h2>Completed events</h2>
          <ul>
            {passport.completedEvents.map((event, index) => (
              <li key={index}>{event.title}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
