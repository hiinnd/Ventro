import { notFound } from 'next/navigation';
import { Foundation } from '../../../components/foundation';
export const metadata = { robots: { index: false, follow: false } };
export default function FoundationPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <Foundation />;
}
