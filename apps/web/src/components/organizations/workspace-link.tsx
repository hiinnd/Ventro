import Link from 'next/link';
import type { ComponentProps } from 'react';
// Protected routes validate live membership. Speculative navigation would spend session
// rate limits and fetch private data before the user chooses a destination.
export function WorkspaceLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} prefetch={false} />;
}
