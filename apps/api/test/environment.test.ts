import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireCompiled = createRequire(import.meta.url);
const { validateEnvironment } = requireCompiled(
  '../dist/config/environment.js',
) as typeof import('../dist/config/environment.js');

const valid = {
  AUTH_SECRET: '01'.repeat(32),
  AUTH_APP_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://user:secret@localhost:5432/ventro',
  REDIS_URL: 'redis://localhost:6379',
  WEB_ORIGINS: 'http://localhost:3000',
};
describe('environment boundary', () => {
  it('accepts exact development origins', () => {
    expect(validateEnvironment(valid).WEB_ORIGINS).toEqual(['http://localhost:3000']);
  });
  it.each(['*', 'http://localhost:3000/path', 'javascript:alert(1)', ''])(
    'rejects unsafe origin %s',
    (origin) => {
      expect(() => validateEnvironment({ ...valid, WEB_ORIGINS: origin })).toThrow('WEB_ORIGINS');
    },
  );
  it('requires HTTPS origins in production', () => {
    expect(() => validateEnvironment({ ...valid, NODE_ENV: 'production' })).toThrow('HTTPS');
  });
  it('rejects invalid ports and protocols', () => {
    expect(() => validateEnvironment({ ...valid, API_PORT: 0 })).toThrow('API_PORT');
    expect(() => validateEnvironment({ ...valid, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      'PostgreSQL',
    );
    expect(() => validateEnvironment({ ...valid, REDIS_URL: 'https://localhost' })).toThrow(
      'Redis',
    );
  });
  it('does not echo credentials from invalid configuration', () => {
    try {
      validateEnvironment({ ...valid, DATABASE_URL: 'super-secret-not-a-url' });
    } catch (error) {
      expect(String(error)).not.toContain('super-secret-not-a-url');
    }
  });
});
