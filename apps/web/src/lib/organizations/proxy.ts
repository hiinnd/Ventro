import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authSessionSchema,
  invitationListSchema,
  invitationSchema,
  memberListSchema,
  organizationListSchema,
  organizationSchema,
  platformOrganizationListSchema,
} from '@ventro/types';
import { authApiUrl } from '../auth/server';
import { authCookieHeader, isSafeAuthMutation } from '../auth/routes';
const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';
const message = z.object({ message: z.string() });
export function organizationProxyTarget(resource: string, segments: string[], method: string) {
  if (segments.some((part) => !/^[a-z0-9-]+$/.test(part))) return;
  const path = segments.join('/');
  if (resource === 'platform')
    return path === 'organizations' && method === 'GET'
      ? {
          path: 'platform/organizations',
          schema: platformOrganizationListSchema,
          logo: false,
          upload: false,
        }
      : undefined;
  if (resource !== 'organizations') return;
  const route = (schema: z.ZodType, logo = false, upload = false) => ({
    path: 'organizations' + (path ? '/' + path : ''),
    schema,
    logo,
    upload,
  });
  if (!path && ['GET', 'POST'].includes(method))
    return route(method === 'GET' ? organizationListSchema : organizationSchema);
  if (path === 'invitations' && method === 'GET') return route(invitationListSchema);
  if (path === 'invitations/resolve' && method === 'POST') return route(invitationSchema);
  if (new RegExp('^invitations/' + uuid + '/(accept|reject)$').test(path) && method === 'POST')
    return route(message);
  if (new RegExp('^' + uuid + '$').test(path) && ['GET', 'PATCH'].includes(method))
    return route(organizationSchema);
  if (new RegExp('^' + uuid + '/activate$').test(path) && method === 'POST')
    return route(authSessionSchema);
  if (new RegExp('^' + uuid + '/members$').test(path) && method === 'GET')
    return route(memberListSchema);
  if (
    new RegExp('^' + uuid + '/members/' + uuid + '$').test(path) &&
    ['PATCH', 'DELETE'].includes(method)
  )
    return route(message);
  if (new RegExp('^' + uuid + '/invitations$').test(path) && ['GET', 'POST'].includes(method))
    return route(method === 'GET' ? invitationListSchema : invitationSchema);
  if (new RegExp('^' + uuid + '/invitations/' + uuid + '$').test(path) && method === 'DELETE')
    return route(message);
  if (new RegExp('^' + uuid + '/logo$').test(path) && ['GET', 'POST', 'DELETE'].includes(method))
    return route(message, method === 'GET', method === 'POST');
}
const failure = (status: number, message: string) =>
  NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
async function bodyBuffer(request: Request, max: number) {
  if (Number(request.headers.get('content-length')) > max) return;
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      return;
    }
    parts.push(value);
  }
  return new Uint8Array(Buffer.concat(parts));
}
export async function proxyOrganization(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
  resource: 'organizations' | 'platform',
) {
  const route = organizationProxyTarget(
    resource,
    (await context.params).path ?? [],
    request.method,
  );
  if (!route) return failure(404, 'Resource unavailable');
  const incoming = new URL(request.url);
  const url = new URL('/api/v1/' + route.path, authApiUrl('session'));
  for (const [key, value] of incoming.searchParams) {
    if (key === 'v' && route.logo && /^[a-f0-9]{64}$/.test(value)) continue;
    if (key !== 'page' || !/^[1-9][0-9]{0,3}$/.test(value)) return failure(400, 'Invalid page');
    url.searchParams.set(key, value);
  }
  const headers = new Headers({ Cookie: authCookieHeader(request.headers.get('cookie')) });
  let body: Uint8Array<ArrayBuffer> | undefined;
  if (request.method !== 'GET') {
    const allowed = (process.env.WEB_ORIGINS ?? 'http://127.0.0.1:3000,http://localhost:3000')
      .split(',')
      .map((value) => value.trim());
    if (
      !isSafeAuthMutation(
        request,
        allowed,
        route.upload ? 'multipart/form-data' : 'application/json',
      )
    )
      return failure(403, 'Request origin is not allowed');
    try {
      const bytes = await bodyBuffer(request, route.upload ? 3 * 1024 * 1024 : 16384);
      if (!bytes) return failure(413, 'Request too large');
      body = bytes;
      if (!route.upload) {
        const parsed: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
          return failure(400, 'Invalid request');
      }
    } catch {
      return failure(400, 'Invalid request');
    }
    headers.set('Content-Type', request.headers.get('content-type')!);
    headers.set('Origin', request.headers.get('origin')!);
    headers.set('X-Ventro-CSRF', '1');
  }
  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    const outgoing = new Headers({ 'Cache-Control': 'no-store' });
    const retry = response.headers.get('retry-after');
    if (retry && /^\d+$/.test(retry)) outgoing.set('Retry-After', retry);
    if (!response.ok) {
      const known = new Set([
        'Keep at least one active organization owner',
        'This address is already a member',
        'Choose a different organization slug',
        'Invitation unavailable. It may have expired or been replaced.',
        'Choose a valid, static PNG, JPEG or WebP image',
        'Membership limit reached',
        'Pending invitation limit reached',
        'Organization limit reached',
      ]);
      const error = (await response.json().catch(() => ({}))) as { message?: unknown };
      const safe =
        typeof error.message === 'string' && known.has(error.message)
          ? error.message
          : response.status === 401
            ? 'Sign in to continue'
            : response.status === 403
              ? 'Access is not allowed. Check your membership and verified email.'
              : response.status === 429
                ? 'Too many attempts. Please try again later.'
                : response.status >= 500
                  ? 'Organizations temporarily unavailable'
                  : 'Request could not be completed. Check your input.';
      return NextResponse.json({ message: safe }, { status: response.status, headers: outgoing });
    }
    if (route.logo) {
      const bytes = await response.arrayBuffer();
      if (
        response.headers.get('content-type')?.split(';')[0] !== 'image/png' ||
        bytes.byteLength > 524288
      )
        throw new Error('Invalid image');
      outgoing.set('Content-Type', 'image/png');
      outgoing.set('X-Content-Type-Options', 'nosniff');
      return new NextResponse(bytes, { headers: outgoing });
    }
    const data = route.schema.parse(await response.json());
    return NextResponse.json(data, { status: response.status, headers: outgoing });
  } catch {
    return failure(502, 'Organizations temporarily unavailable. Please try again.');
  }
}
