import { describe, expect, it } from 'vitest';
import { organizationProxyTarget } from '../src/lib/organizations/proxy';
import { safeLoginDestination, isSafeAuthMutation } from '../src/lib/auth/routes';
const id = '62558231-0b7b-4074-b22a-29308af7e707';
describe('organization proxy and redirect security boundaries', () => {
  it('allows only explicit organization resources and method combinations', () => {
    expect(organizationProxyTarget('organizations', [id, 'logo'], 'POST')?.upload).toBe(true);
    expect(organizationProxyTarget('organizations', [id, 'logo'], 'GET')?.logo).toBe(true);
    expect(organizationProxyTarget('organizations', [id, 'members', id], 'PATCH')?.path).toBe(
      'organizations/' + id + '/members/' + id,
    );
    for (const path of [
      ['..', 'auth', 'session'],
      ['https:', 'attacker.example'],
      [id, 'members', id, 'anything'],
      ['%2e%2e'],
      [id, 'archive'],
    ])
      expect(organizationProxyTarget('organizations', path, 'POST')).toBeUndefined();
    expect(organizationProxyTarget('organizations', [id], 'DELETE')).toBeUndefined();
    expect(organizationProxyTarget('platform', ['organizations'], 'GET')).toBeDefined();
    expect(organizationProxyTarget('platform', ['organizations'], 'POST')).toBeUndefined();
  });
  it('never accepts external, encoded, foreign-locale or unapproved login destinations', () => {
    expect(safeLoginDestination('/en/organizations/' + id + '/team', 'en')).toBe(
      '/en/organizations/' + id + '/team',
    );
    expect(safeLoginDestination('/ar/invitations', 'ar')).toBe('/ar/invitations');
    expect(safeLoginDestination('/en/events/future-of-events/live', 'en')).toBe(
      '/en/events/future-of-events/live',
    );
    expect(safeLoginDestination('/en/events/future-of-events/presenter', 'en')).toBe(
      '/en/events/future-of-events/presenter',
    );
    for (const path of [
      '//evil.test',
      'https://evil.test',
      '/en/../api',
      '/en/%2f%2fevil.test',
      '/ar/platform',
      '/en/organizations?next=https://evil.test',
      '/en\\evil.test',
      '/en/unknown',
    ])
      expect(safeLoginDestination(path, 'en')).toBe('/en/account');
  });
  it('requires explicit multipart opt-in while retaining the origin, Host and CSRF checks', () => {
    const origin = 'http://127.0.0.1:3000';
    const request = new Request(origin, {
      method: 'POST',
      headers: {
        Host: '127.0.0.1:3000',
        Origin: origin,
        'X-Ventro-CSRF': '1',
        'Content-Type': 'multipart/form-data; boundary=test',
      },
    });
    expect(isSafeAuthMutation(request, [origin])).toBe(false);
    expect(isSafeAuthMutation(request, [origin], 'multipart/form-data')).toBe(true);
    request.headers.set('Host', 'attacker.example');
    expect(isSafeAuthMutation(request, [origin], 'multipart/form-data')).toBe(false);
  });
});
