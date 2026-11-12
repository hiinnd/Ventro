import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function DesignSystemPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { DesignSystemShowcase } = await import('../../../components/design-system/showcase');
  return <DesignSystemShowcase />;
}
