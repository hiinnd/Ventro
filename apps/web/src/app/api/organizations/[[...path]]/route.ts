import { proxyOrganization } from '../../../../lib/organizations/proxy';
export const dynamic = 'force-dynamic';
const handle = (request: Request, context: { params: Promise<{ path?: string[] }> }) =>
  proxyOrganization(request, context, 'organizations');
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
