export function workspacePage(
  slug: string[],
): 'organizations' | 'new' | 'settings' | 'team' | 'invitations' | 'platform' | undefined {
  if (slug.length === 1 && ['organizations', 'invitations', 'platform'].includes(slug[0]!))
    return slug[0] as 'organizations' | 'invitations' | 'platform';
  if (slug[0] !== 'organizations') return;
  if (slug.length === 2 && slug[1] === 'new') return 'new';
  if (
    slug.length === 3 &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(slug[1]!) &&
    ['settings', 'team'].includes(slug[2]!)
  )
    return slug[2] as 'settings' | 'team';
}
