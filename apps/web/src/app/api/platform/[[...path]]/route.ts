import { proxyOrganization } from '../../../../lib/organizations/proxy';
export const dynamic = 'force-dynamic';
export const GET = (request: Request, context: { params: Promise<{ path?: string[] }> }) =>
  proxyOrganization(request, context, 'platform');
