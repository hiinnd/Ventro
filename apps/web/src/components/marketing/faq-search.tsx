'use client';
import { useState } from 'react';
import type { Locale } from '@ventro/types';
import { Button, EmptyState, FormField, Icon, Input } from '@ventro/ui';
import { text } from '../../lib/marketing/site';

export function FAQSearch({
  locale,
  items,
}: {
  locale: Locale;
  items: { q: string; a: string }[];
}) {
  const [query, setQuery] = useState('');
  const filtered = items.filter((item) =>
    (item.q + ' ' + item.a).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <div>
      <div className="m-faq-search">
        <FormField label={text(locale, 'Find an answer', 'ابحث عن إجابة')}>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text(
              locale,
              'Search pricing, languages, or the product preview…',
              'ابحث عن الباقات أو اللغات أو معاينة المنتج…',
            )}
          />
        </FormField>
      </div>
      <div className="m-faq-list" aria-live="polite">
        {filtered.map((item) => (
          <details key={item.q} className="m-faq">
            <summary className="ui-focus">
              <span>{item.q}</span>
              <Icon name="down" />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
        {filtered.length === 0 && (
          <EmptyState
            title={text(locale, 'No matching questions', 'لا توجد أسئلة مطابقة')}
            description={text(
              locale,
              'Try another phrase or browse all the answers.',
              'جرّب عبارة أخرى أو تصفّح جميع الإجابات.',
            )}
            action={
              <Button variant="outline" onClick={() => setQuery('')}>
                {text(locale, 'Show all questions', 'اعرض كل الأسئلة')}
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
