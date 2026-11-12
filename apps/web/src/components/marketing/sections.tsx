import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Locale } from '@ventro/types';
import { Badge, Button, Icon } from '@ventro/ui';
import photos from '../../../public/media/manifest.json';
import { faqItems, featureItems, plans } from '../../lib/marketing/content';
import { route, text } from '../../lib/marketing/site';
import { MarketingIcon } from './icon';
import { Reveal } from './motion';

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div className={'m-section-heading ' + (centered ? 'm-centered' : '')}>
      {eyebrow && <span className="m-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="m-page-intro">
      <div className="m-container">
        <span className="m-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </div>
    </section>
  );
}
export function CtaSection({ locale }: { locale: Locale }) {
  return (
    <section className="m-section">
      <div className="m-container">
        <Reveal>
          <div className="m-cta-panel">
            <div>
              <h2>
                {text(locale, 'Make the next moment mean more.', 'امنح اللحظة القادمة معنى أكبر.')}
              </h2>
              <p>
                {text(
                  locale,
                  'Bring us your idea. Help shape an event experience that feels connected from the very beginning.',
                  'شاركنا فكرتك، وساهم في تشكيل تجربة فعاليات تشعر بترابطها منذ البداية.',
                )}
              </p>
            </div>
            <div className="m-actions">
              <Button asChild className="m-light-button" size="lg">
                <Link href={route(locale, 'contact') + '?intent=organize'}>
                  {text(locale, 'Create Your Event', 'أنشئ فعاليتك')}
                  <span aria-hidden>↗</span>
                </Link>
              </Button>
              <p className="basis-full text-xs">
                {text(
                  locale,
                  'Creation opens at launch. This prepares an early-access inquiry.',
                  'يفتح إنشاء الفعاليات عند الإطلاق. هذا الإجراء يجهّز استفسار وصول مبكر.',
                )}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
export function FeatureGrid({ locale }: { locale: Locale }) {
  return (
    <div className="m-feature-grid">
      {featureItems(locale).map((feature, index) => (
        <Reveal key={feature.id} delay={(index % 3) * 0.06}>
          <article className="m-feature-card">
            <span className="m-icon-tile">
              <MarketingIcon name={feature.icon} />
            </span>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <Link
              href={route(locale, 'features') + '#' + feature.id}
              className="ui-focus m-text-link"
            >
              {text(locale, 'Explore the concept', 'استكشف التصوّر')}
              <span aria-hidden>↗</span>
            </Link>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
export function PricingCards({ locale }: { locale: Locale }) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  return (
    <div>
      <p className="m-pricing-disclosure">
        {t(
          'PROPOSED PACKAGES · No approved prices or purchase commitments. Final inclusions will be confirmed at launch.',
          'باقات مقترحة · لا توجد أسعار معتمدة أو التزامات شراء. سنؤكد المزايا النهائية عند الإطلاق.',
        )}
      </p>
      <div className="m-pricing-grid">
        {plans(locale).map((plan, index) => (
          <Reveal key={plan.id} delay={index * 0.06}>
            <article className={'m-pricing-card ' + (index === 1 ? 'm-pricing-highlight' : '')}>
              <span className="m-caption">{plan.for}</span>
              <h3 lang="en">{plan.name}</h3>
              <p>{plan.description}</p>
              <div className="m-pricing-value">
                {t('Announced at launch', 'تُعلن عند الإطلاق')}
                <span>{t('Proposed package', 'باقة مقترحة')}</span>
              </div>
              <ul>
                {plan.items.map((item) => (
                  <li key={item}>
                    <Icon name="check" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant={index === 1 ? 'default' : 'outline'} className="w-full">
                <Link href={route(locale, 'contact') + '?intent=pricing&plan=' + plan.id}>
                  {t('Discuss your needs', 'ناقش احتياجاتك')} ↗
                </Link>
              </Button>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
export function FAQSection({ locale, limit }: { locale: Locale; limit?: number }) {
  return (
    <div className="m-faq-list">
      {faqItems(locale)
        .slice(0, limit)
        .map((item) => (
          <details key={item.q} className="m-faq">
            <summary className="ui-focus">
              <span>{item.q}</span>
              <Icon name="down" />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
    </div>
  );
}
export function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="m-benefit-list">
      {items.map((item) => (
        <li key={item}>
          <Icon name="check" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
export function PhotoPanel({
  locale,
  file = 'venue.webp',
  caption,
}: {
  locale: Locale;
  file?: 'venue.webp' | 'gathering.webp';
  caption?: string;
}) {
  const photo = photos.find((photo) => photo.file === file)!;
  return (
    <div className="m-photo-panel">
      <Image
        src={'/media/' + file}
        alt={
          file === 'venue.webp'
            ? text(
                locale,
                'A prepared conference space with round tables and white chairs',
                'مساحة مؤتمرات مجهّزة بطاولات مستديرة وكراسٍ بيضاء',
              )
            : text(
                locale,
                'Confetti in the lights above an event audience',
                'قصاصات احتفال في الأضواء فوق جمهور فعالية',
              )
        }
        fill
        sizes="(max-width: 900px) 100vw, 50vw"
        quality={85}
        placeholder="blur"
        blurDataURL={photo.blurDataURL}
        style={{ objectFit: 'cover' }}
      />
      {caption && (
        <p className="m-photo-caption">
          {caption}
          <Badge variant="accent" className="ms-2">
            {text(locale, 'Illustrative photography', 'صورة توضيحية')}
          </Badge>
        </p>
      )}
    </div>
  );
}
