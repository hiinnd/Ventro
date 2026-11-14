import { notFound } from 'next/navigation';
import { authApiUrl } from '../../../../../lib/auth/server';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ verificationId: string }> }) {
  const { verificationId } = await params;
  const response = await fetch(
    new URL('/api/v1/certificates/verify/' + verificationId, authApiUrl('session')),
    { cache: 'no-store' },
  );
  if (!response.ok) notFound();
  const certificate = (await response.json()) as {
    valid: boolean;
    recipientName: string;
    eventTitle: string;
    organizationName: string;
    issuedAt: string | null;
    revokedAt: string | null;
  };
  return (
    <main className="container py-16">
      <p className="dash-eyebrow">VENTRO / CERTIFICATE VERIFICATION</p>
      <h1>{certificate.valid ? 'Valid certificate' : 'Certificate is not valid'}</h1>
      <p>
        {certificate.recipientName} · {certificate.eventTitle}
      </p>
      <p>{certificate.organizationName}</p>
      <p>
        {certificate.valid ? 'Issued ' + certificate.issuedAt : 'Revoked ' + certificate.revokedAt}
      </p>
    </main>
  );
}
