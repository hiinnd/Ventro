'use client';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useAnimate } from 'motion/react-mini';
import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@ventro/types';
import {
  Badge,
  BrandLogo,
  Button,
  Icon,
  Modal,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ventro/ui';
import { route, text } from '../../lib/marketing/site';
import type { featureItems } from '../../lib/marketing/content';
import { MarketingIcon } from './icon';

export function PreviewBadge({ locale }: { locale: Locale }) {
  return (
    <span className="m-preview-tag">
      {text(locale, 'Illustrative product preview', 'معاينة توضيحية للمنتج')}
    </span>
  );
}

export function PassportPreview({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  return (
    <div className={'m-passport ' + (compact ? 'm-passport-compact' : '')}>
      <div className="m-passport-top">
        <BrandLogo variant="symbol" decorative className="size-8" />
        <span>EVENT PASSPORT</span>
        <MarketingIcon name="passport" className="size-5" />
      </div>
      <div className="m-passport-portrait" aria-hidden>
        <span>V</span>
        <i />
      </div>
      <p className="m-passport-title">
        {t('Your journey, carried forward.', 'رحلتك، إلى ما بعدها.')}
      </p>
      <p className="m-passport-subtitle">
        {t('Sample experience · Product concept', 'تجربة توضيحية · تصوّر للمنتج')}
      </p>
      <div className="m-passport-details">
        <div>
          <span>{t('Gathering', 'اللقاء')}</span>
          <strong>{t('The Next Gathering', 'اللقاء القادم')}</strong>
        </div>
        <div>
          <span>{t('Experience', 'التجربة')}</span>
          <strong>{t('Connection & discovery', 'التواصل والاكتشاف')}</strong>
        </div>
      </div>
      <div className="m-passport-bottom">
        <svg viewBox="0 0 52 52" className="m-passport-pattern" aria-hidden="true">
          {Array.from(
            { length: 36 },
            (_, index) =>
              index % 3 !== 1 && (
                <rect
                  key={index}
                  x={(index % 6) * 8 + 2}
                  y={Math.floor(index / 6) * 8 + 2}
                  width="5"
                  height="5"
                  fill="currentColor"
                />
              ),
          )}
        </svg>
        <p>
          {t('PREVIEW ONLY', 'للمعاينة فقط')}
          <span>
            {t('Not valid for entry or proof of attendance.', 'غير صالح للدخول أو لإثبات الحضور.')}
          </span>
        </p>
      </div>
    </div>
  );
}

export function ProductPreview({ locale }: { locale: Locale }) {
  const [stage, setStage] = useState('plan');
  const [scope, animate] = useAnimate();
  const reduced = useReducedMotion();
  const previousStage = useRef(stage);
  useEffect(() => {
    if (previousStage.current === stage) return;
    previousStage.current = stage;
    if (reduced) return;
    const animation = animate(
      scope.current,
      { transform: ['translateY(6px)', 'translateY(0px)'] },
      { duration: 0.22 },
    );
    return () => animation.cancel();
  }, [stage, reduced, animate, scope]);
  const t = (en: string, ar: string) => text(locale, en, ar);
  const stages = [
    ['plan', t('Plan the moment', 'خطّط للحظة'), 'calendar'],
    ['welcome', t('Welcome people', 'رحّب بالمشاركين'), 'people'],
    ['beyond', t('Carry it forward', 'واصل الأثر'), 'passport'],
  ] as const;
  return (
    <div className="m-product-frame" data-testid="product-preview">
      <div className="m-product-chrome">
        <span aria-hidden className="m-window-dots">
          <i />
          <i />
          <i />
        </span>
        <span>{t('VENTRO / Organizer workspace', 'VENTRO / مساحة المنظّم')}</span>
        <Badge variant="accent">{t('Concept', 'تصوّر')}</Badge>
      </div>
      <Tabs value={stage} onValueChange={setStage}>
        <div className="m-product-toolbar">
          <div>
            <span className="m-caption">{t('SAMPLE EVENT', 'فعالية توضيحية')}</span>
            <h3>{t('The Next Gathering', 'اللقاء القادم')}</h3>
          </div>
          <TabsList aria-label={t('Product preview views', 'واجهات معاينة المنتج')}>
            {stages.map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="m-product-body">
          <aside aria-label={t('Preview workflow', 'مسار المعاينة')} className="m-product-sidebar">
            <BrandLogo decorative className="h-6 w-auto" />
            {stages.map(([value, label, icon]) => (
              <button
                key={value}
                className="ui-focus"
                aria-pressed={stage === value}
                onClick={() => setStage(value)}
              >
                <MarketingIcon name={icon} className="size-4" />
                {label}
              </button>
            ))}
            <p>{t('Designed for the whole journey.', 'مصمّم للرحلة بأكملها.')}</p>
          </aside>
          <div ref={scope} className="m-product-content">
            <TabsContent value="plan" className="mt-0">
              <div className="m-preview-intro">
                <h4>
                  {t('A little clarity, before the doors open.', 'وضوح أكبر، قبل فتح الأبواب.')}
                </h4>
                <p>
                  {t(
                    'Illustrative planning view — no event is created.',
                    'واجهة تخطيط توضيحية؛ لا تُنشئ فعالية.',
                  )}
                </p>
              </div>
              <div className="m-preview-plan">
                <div className="m-preview-agenda">
                  <span className="m-caption">{t('AGENDA CONCEPT', 'تصوّر البرنامج')}</span>
                  {[
                    t('A warm welcome', 'استقبال دافئ'),
                    t('A shared conversation', 'حوار مشترك'),
                    t('A meaningful next step', 'خطوة قادمة هادفة'),
                  ].map((label, index) => (
                    <div key={label} className="m-agenda-row">
                      <span aria-hidden className="m-agenda-marker">
                        0{index + 1}
                      </span>
                      <p>
                        {label}
                        <small>{t('Sample session', 'جلسة توضيحية')}</small>
                      </p>
                      <Badge>{t('Draft', 'مسودة')}</Badge>
                    </div>
                  ))}
                </div>
                <div className="m-preview-note">
                  <MarketingIcon name="connection" className="size-8" />
                  <h5>{t('Bring the details together.', 'اجمع التفاصيل في مكان واحد.')}</h5>
                  <p>
                    {t(
                      'Agenda. People. Purpose. A workspace concept built around the moments that connect them.',
                      'البرنامج والناس والهدف. تصوّر لمساحة عمل تتمحور حول اللحظات التي تجمعها.',
                    )}
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="welcome" className="mt-0">
              <div className="m-preview-intro">
                <h4>{t('Every welcome is part of the experience.', 'كل ترحيب جزء من التجربة.')}</h4>
                <p>
                  {t(
                    'Arrival and check-in concepts, not live admission tools.',
                    'تصوّرات للوصول وتسجيل الحضور، وليست أدوات دخول فعلية.',
                  )}
                </p>
              </div>
              <div className="m-preview-welcome">
                <div>
                  <span className="m-icon-tile">
                    <MarketingIcon name="scan" />
                  </span>
                  <h5>{t('A clearer arrival.', 'وصول أوضح.')}</h5>
                  <p>
                    {t(
                      'The right details, easy to find. A proposed participant view for a calmer event day.',
                      'التفاصيل المناسبة، ويسهل العثور عليها. واجهة مقترحة للمشارك ليوم أكثر هدوءًا.',
                    )}
                  </p>
                  <Badge variant="accent">{t('Planned capability', 'ميزة مخططة')}</Badge>
                </div>
                <PassportPreview locale={locale} compact />
              </div>
            </TabsContent>
            <TabsContent value="beyond" className="mt-0">
              <div className="m-preview-intro">
                <h4>
                  {t(
                    'The event ends. The possibility continues.',
                    'تنتهي الفعالية، وتستمر الإمكانات.',
                  )}
                </h4>
                <p>
                  {t('A concept for a lasting event journey.', 'تصوّر لرحلة فعاليات يستمر أثرها.')}
                </p>
              </div>
              <div className="m-beyond-cards">
                {[
                  t('Remember what mattered.', 'تذكّر ما كان مهمًا.'),
                  t('Keep the conversation open.', 'أبقِ الحوار مفتوحًا.'),
                  t('Discover your next gathering.', 'اكتشف لقاءك القادم.'),
                ].map((label) => (
                  <div key={label}>
                    <Icon name="check" />
                    <span>{label}</span>
                    <Badge>{t('Concept', 'تصوّر')}</Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
      <div className="m-product-footer">
        <span className="m-status-dot" aria-hidden />
        <p>
          {t(
            'Illustrative interface. Nothing is saved, sent, booked, or measured.',
            'واجهة توضيحية. لا يتم حفظ شيء أو إرساله أو حجزه أو قياسه.',
          )}
        </p>
      </div>
    </div>
  );
}

type Feature = ReturnType<typeof featureItems>[number];
export function FeatureShowcase({
  locale,
  features,
}: {
  locale: Locale;
  features: readonly Feature[];
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  return (
    <Tabs defaultValue={features[0]!.id} orientation="vertical" className="m-interactive-features">
      <TabsList
        aria-label={t('Explore planned features', 'استكشف المزايا المخططة')}
        className="m-feature-choices"
      >
        {features.map((feature) => (
          <TabsTrigger key={feature.id} value={feature.id} className="m-feature-choice">
            <span className="m-icon-tile">
              <MarketingIcon name={feature.icon} />
            </span>
            <span>
              <strong>{feature.title}</strong>
              <small>{feature.description}</small>
            </span>
            <Icon name="next" className="rtl:rotate-180" />
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="m-feature-stage">
        {features.map((feature) => (
          <TabsContent key={feature.id} value={feature.id} className="m-feature-panel">
            <div className="m-feature-visual" aria-hidden>
              <span className="m-feature-orbit" />
              <span className="m-feature-orbit m-feature-orbit-small" />
              <div className="m-feature-visual-symbol">
                <MarketingIcon name={feature.icon} />
              </div>
              <span className="m-feature-visual-pill">VENTRO / {feature.id.toUpperCase()}</span>
            </div>
            <div className="m-feature-panel-copy">
              <PreviewBadge locale={locale} />
              <h3>{feature.title}</h3>
              <p>{feature.detail}</p>
              <Link
                className="ui-focus m-text-link"
                href={route(locale, 'features') + '#' + feature.id}
              >
                {t('Explore the vision', 'استكشف الرؤية')} ↗
              </Link>
            </div>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}

export function LifecyclePreview({ locale }: { locale: Locale }) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const steps = [
    {
      id: 'discover',
      title: t('Discover', 'اكتشف'),
      detail: t(
        'A meaningful first impression. An event story that helps people understand why this gathering matters.',
        'انطباع أول هادف. قصة فعالية تساعد الناس على فهم أهمية هذا اللقاء.',
      ),
      icon: 'connection',
    },
    {
      id: 'register',
      title: t('Join', 'انضم'),
      detail: t(
        'A proposed registration journey that connects the invitation to a clear next step.',
        'رحلة تسجيل مقترحة تربط الدعوة بخطوة تالية واضحة.',
      ),
      icon: 'ticket',
    },
    {
      id: 'arrive',
      title: t('Arrive', 'احضر'),
      detail: t(
        'The information participants need to feel expected, prepared, and welcome.',
        'المعلومات التي يحتاجها المشارك ليشعر بأنه متوقّع ومستعد ومرحب به.',
      ),
      icon: 'scan',
    },
    {
      id: 'engage',
      title: t('Connect', 'تواصل'),
      detail: t(
        'Room for relevant sessions, useful encounters, and the conversations an event brings to life.',
        'مساحة لجلسات مناسبة ولقاءات مفيدة وحوارات تمنح الفعالية حياتها.',
      ),
      icon: 'people',
    },
    {
      id: 'beyond',
      title: t('Continue', 'واصل'),
      detail: t(
        'The Event Passport vision and considered follow-up, so the story can move beyond one day.',
        'رؤية جواز الفعاليات والمتابعة المدروسة، لتتجاوز القصة يومًا واحدًا.',
      ),
      icon: 'passport',
    },
  ] as const;
  return (
    <Tabs defaultValue="discover">
      <TabsList
        aria-label={t('Event lifecycle preview', 'معاينة دورة حياة الفعالية')}
        className="m-lifecycle-list"
      >
        {steps.map((step, index) => (
          <TabsTrigger key={step.id} value={step.id} className="m-lifecycle-step">
            <span aria-hidden>0{index + 1}</span>
            <strong>{step.title}</strong>
          </TabsTrigger>
        ))}
      </TabsList>
      {steps.map((step) => (
        <TabsContent key={step.id} value={step.id} className="m-lifecycle-detail">
          <div className="m-icon-tile">
            <MarketingIcon name={step.icon} />
          </div>
          <div>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
          </div>
          <Badge variant="accent">{t('Product vision', 'رؤية المنتج')}</Badge>
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function EventGallery({ locale }: { locale: Locale }) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [filter, setFilter] = useState('all');
  const events = [
    {
      id: 'conference',
      group: 'organizations',
      name: t('A conversation that moves things forward.', 'حوار يدفع الأمور إلى الأمام.'),
      type: t('Conference concept', 'تصوّر مؤتمر'),
      image: 'venue.webp',
    },
    {
      id: 'community',
      group: 'community',
      name: t('A shared moment, a stronger community.', 'لحظة مشتركة، ومجتمع أقرب.'),
      type: t('Community concept', 'تصوّر لقاء مجتمعي'),
      image: 'gathering.webp',
    },
    {
      id: 'workshop',
      group: 'learning',
      name: t('New ideas deserve a place to meet.', 'الأفكار الجديدة تستحق مكانًا للقاء.'),
      type: t('Workshop concept', 'تصوّر ورشة عمل'),
      image: 'venue.webp',
    },
  ];
  const filters = [
    ['all', t('All concepts', 'كل التصوّرات')],
    ['organizations', t('Organizations', 'المؤسسات')],
    ['community', t('Community', 'المجتمع')],
    ['learning', t('Learning', 'التعلّم')],
  ];
  return (
    <div>
      <div
        className="m-gallery-filters"
        aria-label={t('Filter event concepts', 'تصفية تصوّرات الفعاليات')}
      >
        {filters.map(([value, label]) => (
          <Button
            key={value}
            variant={filter === value ? 'default' : 'outline'}
            aria-pressed={filter === value}
            onClick={() => setFilter(value!)}
          >
            {label}
          </Button>
        ))}
      </div>
      <p className="m-caption mb-6">
        {t(
          'Concept gallery only. There are no live listings, dates, bookings, or registrations.',
          'معرض تصوّرات فقط. لا توجد فعاليات أو مواعيد أو حجوزات أو تسجيلات فعلية.',
        )}
      </p>
      <div className="m-event-grid">
        {events
          .filter((event) => filter === 'all' || event.group === filter)
          .map((event) => (
            <article key={event.id} className="m-event-card">
              <div className="m-event-image">
                <Image
                  src={'/media/' + event.image}
                  alt={t('Illustrative event atmosphere', 'أجواء فعالية توضيحية')}
                  fill
                  sizes="(max-width: 700px) 100vw, 33vw"
                />
                <span>{t('Concept · Not bookable', 'تصوّر · غير قابل للحجز')}</span>
              </div>
              <div className="m-event-copy">
                <span className="m-caption">{event.type}</span>
                <h3>{event.name}</h3>
                <Modal
                  title={event.type}
                  description={t(
                    'An illustrative participant journey. This is not a real event or a registration service.',
                    'رحلة مشارك توضيحية. ليست هذه فعالية حقيقية أو خدمة تسجيل.',
                  )}
                  closeLabel={t('Close preview', 'إغلاق المعاينة')}
                  trigger={
                    <Button variant="outline">{t('Preview the journey', 'عاين الرحلة')} ↗</Button>
                  }
                >
                  <p className="m-body-copy">
                    {t(
                      'Discover the idea, understand the gathering, and imagine a considered welcome. Real event discovery will come in a later product phase.',
                      'اكتشف الفكرة وتعرّف إلى اللقاء وتخيّل استقبالًا مدروسًا. سيأتي اكتشاف الفعاليات الفعلية في مرحلة لاحقة من المنتج.',
                    )}
                  </p>
                  <Button asChild className="mt-6">
                    <Link href={route(locale, 'contact') + '?intent=explore'}>
                      {t('Prepare an early-access inquiry', 'جهّز استفسار وصول مبكر')}
                    </Link>
                  </Button>
                </Modal>
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}
