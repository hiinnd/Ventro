import { describe, expect, it } from 'vitest';
import { authCookieHeader, isSafeAuthMutation } from '../src/lib/auth/routes';
const origin = 'http://127.0.0.1:3000';
function request(overrides: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      Origin: origin,
      Host: '127.0.0.1:3000',
      'Content-Type': 'application/json',
      'X-Ventro-CSRF': '1',
      'Sec-Fetch-Site': 'same-origin',
      ...overrides,
    },
  });
}
describe('same-origin authentication boundary', () => {
  it('uses the allowed browser-facing Host even when the framework canonicalizes its internal URL', () => {
    expect(isSafeAuthMutation(request(), [origin])).toBe(true);
    expect(isSafeAuthMutation(request({ Host: 'attacker.example' }), [origin])).toBe(false);
    expect(isSafeAuthMutation(request({ Origin: 'https://attacker.example' }), [origin])).toBe(
      false,
    );
    expect(isSafeAuthMutation(request({ 'Sec-Fetch-Site': 'cross-site' }), [origin])).toBe(false);
    expect(isSafeAuthMutation(request({ 'X-Ventro-CSRF': '' }), [origin])).toBe(false);
    expect(isSafeAuthMutation(request({ 'Content-Type': 'text/plain' }), [origin])).toBe(false);
  });
  it('forwards only well-formed opaque auth cookies and rejects duplicates', () => {
    const cookie = 'ventro_session=' + 'a'.repeat(64);
    expect(authCookieHeader('theme=dark; ' + cookie)).toBe(cookie);
    expect(authCookieHeader(cookie + '; ' + cookie)).toBe('');
    expect(authCookieHeader('ventro_session=malformed')).toBe('');
    expect(authCookieHeader('theme=dark')).toBe('');
  });
});
