// Server-side deployment configuration. Client components receive explicit public props.
function origin() {
  const url = new URL(process.env.SITE_URL || 'http://127.0.0.1:3000');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('SITE_URL must be an HTTP(S) origin');
  return url.origin;
}
const email = process.env.CONTACT_EMAIL?.trim() || undefined;
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error('CONTACT_EMAIL must be a valid email address');
export const site = {
  name: 'VENTRO',
  origin: origin(),
  contactEmail: email,
  legalOperator: process.env.LEGAL_OPERATOR_NAME?.trim() || undefined,
  indexing: process.env.SEARCH_INDEXING_ENABLED === 'true' && origin().startsWith('https://'),
};
