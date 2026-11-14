'use client';
import { useEffect, useState } from 'react';
import { Button } from '@ventro/ui';

type Passport = {
  slug: string;
  name: string;
  learningHours: number;
  certificates: {
    id: string;
    eventTitle: string;
    verificationId: string;
    issuedAt: string | null;
  }[];
  completedEvents: { title: string; completedAt: string }[];
  settings: Record<string, boolean>;
};
export function PassportPanel() {
  const [passport, setPassport] = useState<Passport | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = () =>
    fetch('/api/certificates/certificates/me/passport')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPassport)
      .catch(() => setError('Unable to load your Event Passport.'));
  useEffect(() => {
    void load();
  }, []);
  async function save() {
    if (!passport) return;
    setSaving(true);
    setError('');
    const response = await fetch('/api/certificates/certificates/me/passport', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Ventro-CSRF': '1' },
      body: JSON.stringify(passport.settings),
    });
    setSaving(false);
    if (!response.ok) return setError('Unable to save visibility.');
    setPassport(await response.json());
  }
  if (!passport)
    return (
      <section className="dash-panel">
        <h2>Event Passport</h2>
        <p>{error || 'Loading your verified history…'}</p>
      </section>
    );
  return (
    <section className="grid gap-5">
      <div className="dash-panel">
        <p className="dash-eyebrow">VENTRO / PASSPORT</p>
        <h2>{passport.name}</h2>
        <p>
          Shareable profile: <code>/passports/{passport.slug}</code>
        </p>
        <p>
          {passport.learningHours} verified learning hours · {passport.completedEvents.length}{' '}
          completed events
        </p>
      </div>
      <div className="dash-panel">
        <h3>Privacy controls</h3>
        {Object.keys(passport.settings).map((key) => (
          <label className="block mt-3" key={key}>
            <input
              type="checkbox"
              checked={passport.settings[key]}
              onChange={(event) =>
                setPassport({
                  ...passport,
                  settings: { ...passport.settings, [key]: event.target.checked },
                })
              }
            />{' '}
            {key.replace(/([A-Z])/g, ' $1')}
          </label>
        ))}
        <Button className="mt-4" disabled={saving} onClick={() => void save()}>
          Save visibility
        </Button>
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="dash-panel">
        <h3>Verified certificates</h3>
        {passport.certificates.length ? (
          <ul>
            {passport.certificates.map((certificate) => (
              <li key={certificate.id}>
                <strong>{certificate.eventTitle}</strong> ·{' '}
                <a href={'/en/certificates/verify/' + certificate.verificationId}>Verify</a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No verified certificates yet.</p>
        )}
      </div>
    </section>
  );
}
