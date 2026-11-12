import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@ventro/types';
import { Button } from '@ventro/ui';
import { featureItems } from '../../lib/marketing/content';
import { route, text } from '../../lib/marketing/site';
import { HeroAtmosphere, Reveal } from './motion';
import {
  FeatureShowcase,
  LifecyclePreview,
  PassportPreview,
  PreviewBadge,
  ProductPreview,
} from './previews';
import {
  BenefitList,
  CtaSection,
  FAQSection,
  PhotoPanel,
  PricingCards,
  SectionHeading,
} from './sections';

export function MarketingHome({ locale }: { locale: Locale }) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  return (
    <>
      <section className="m-hero">
        <HeroAtmosphere />
        <div className="m-container">
          <div className="m-hero-layout">
            <div className="m-hero-copy">
              <span className="m-eyebrow">
                {t('For the people who bring us together', 'لمن يجمعوننا')}
              </span>
              <h1>
                <span className="block">{t('Every Event.', 'لكل فعالية.')}</span>{' '}
                <span className="m-title-accent">
                  {t('Beyond the Moment.', 'أثر يتجاوز اللحظة.')}
                </span>
              </h1>
              <p className="m-lead">
                {t(
                  'Some moments deserve more than a date on the calendar. We’re building VENTRO to connect the planning, the people, and everything an event makes possible.',
                  'بعض اللحظات تستحق أكثر من موعد على التقويم. نبني VENTRO لنجمع التخطيط والناس وكل ما تفتحه الفعالية من إمكانات.',
                )}
              </p>
              <div className="m-actions">
                <Button asChild size="lg">
                  <Link href={route(locale, 'contact') + '?intent=organize'}>
                    {t('Create Your Event', 'أنشئ فعاليتك')}
                    <span aria-hidden>↗</span>
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href={route(locale, 'solutions') + '#event-preview'}>
                    {t('Explore Events', 'استكشف الفعاليات')}
                    <span aria-hidden>↗</span>
                  </Link>
                </Button>
              </div>
              <p className="m-caption m-hero-note">
                {t(
                  'Public product preview. Event creation and discovery open in a later phase; these links explore early access and concepts.',
                  'معاينة عامة للمنتج. سيُتاح إنشاء الفعاليات واكتشافها في مرحلة لاحقة؛ تستكشف هذه الروابط الوصول المبكر والتصوّرات.',
                )}
              </p>
            </div>
            <div className="m-hero-photo">
              <Image
                src="/media/gathering.webp"
                alt={t(
                  'Confetti and light above a shared event moment',
                  'قصاصات احتفال وأضواء فوق لحظة مشتركة في فعالية',
                )}
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 900px) 100vw, 45vw"
                quality={75}
                style={{ objectFit: 'cover', objectPosition: '55% 30%' }}
              />
              <span className="m-hero-photo-chip">
                <span className="m-status-dot" aria-hidden />
                {t('CONNECTION / EXPERIENCE / POSSIBILITY', 'تواصل / تجربة / إمكانات')}
              </span>
              <div className="m-photo-label">
                <p>
                  {t(
                    'The moment matters. So does everything around it.',
                    'اللحظة مهمة، وكذلك كل ما يحيط بها.',
                  )}
                </p>
                <span>
                  {t(
                    'Illustrative event photography · Not a VENTRO event',
                    'صورة فعالية توضيحية · ليست فعالية لـ VENTRO',
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="m-audiences">
            <p>{t('A product vision for', 'رؤية منتج من أجل')}</p>
            <ul aria-label={t('Intended event communities', 'مجتمعات الفعاليات المستهدفة')}>
              <li>{t('Conferences', 'المؤتمرات')}</li>
              <li>{t('Communities', 'المجتمعات')}</li>
              <li>{t('Campus', 'الجامعات')}</li>
              <li>{t('Teams', 'فرق العمل')}</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="product-preview" className="m-section">
        <div className="m-container">
          <SectionHeading
            centered
            eyebrow={t('The product vision', 'رؤية المنتج')}
            title={t('Your event. One connected canvas.', 'فعاليتك. صورة واحدة مترابطة.')}
            description={t(
              'A glimpse of the experience we’re shaping. Explore the views below; they are interactive UI concepts, with no live event data.',
              'لمحة عن التجربة التي نصمّمها. استكشف الواجهات أدناه؛ هي تصوّرات تفاعلية دون بيانات فعاليات فعلية.',
            )}
          />
          <Reveal>
            <ProductPreview locale={locale} />
          </Reveal>
        </div>
      </section>

      <section className="m-section m-section-soft">
        <div className="m-container m-two-column">
          <Reveal>
            <SectionHeading
              eyebrow={t('Less friction. More meaning.', 'تعقيد أقل. معنى أكبر.')}
              title={t(
                'A memorable event shouldn’t begin with scattered details.',
                'الفعالية التي تبقى في الذاكرة لا ينبغي أن تبدأ بتفاصيل مبعثرة.',
              )}
              description={t(
                'Invitations in one place. Schedules in another. Important context lost between them. We see an opportunity to bring the journey together.',
                'دعوات في مكان، وبرامج في آخر، وسياق مهم يضيع بينهما. نرى فرصة لجمع الرحلة في تجربة واحدة.',
              )}
            />
            <Link href={route(locale, 'about')} className="ui-focus m-text-link">
              {t('Meet the idea behind VENTRO', 'تعرّف إلى فكرة VENTRO')} ↗
            </Link>
          </Reveal>
          <div className="m-problem-list">
            {[
              [
                t('From scattered to considered', 'من التبعثر إلى الوضوح'),
                t(
                  'A shared context for the planning, the welcome, and the follow-up.',
                  'سياق مشترك للتخطيط والترحيب والمتابعة.',
                ),
              ],
              [
                t('From attendance to participation', 'من الحضور إلى المشاركة'),
                t(
                  'A participant experience designed around clarity, relevance, and connection.',
                  'تجربة مشارك تُصمّم حول الوضوح والملاءمة والتواصل.',
                ),
              ],
              [
                t('From one day to a next chapter', 'من يوم واحد إلى فصل قادم'),
                t(
                  'A vision that gives the event’s story somewhere to continue.',
                  'رؤية تمنح قصة الفعالية مساحة للاستمرار.',
                ),
              ],
            ].map(([title, description], index) => (
              <Reveal key={title} delay={index * 0.06}>
                <div className="m-problem-card">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow={t('Considered at every step', 'اهتمام في كل خطوة')}
            title={t('Explore how the pieces connect.', 'استكشف ترابط التفاصيل.')}
            description={t(
              'Choose a part of the planned experience. Each concept has one purpose: help people arrive prepared and leave with something meaningful.',
              'اختر جزءًا من التجربة المخططة. لكل تصوّر هدف: مساعدة الناس على الحضور باستعداد والمغادرة بأثر.',
            )}
          />
          <Reveal>
            <FeatureShowcase
              locale={locale}
              features={featureItems(locale).filter((feature) =>
                ['planning', 'arrival', 'passport'].includes(feature.id),
              )}
            />
          </Reveal>
        </div>
      </section>

      <section className="m-section m-section-soft">
        <div className="m-container">
          <SectionHeading
            centered
            eyebrow={t('The whole event journey', 'رحلة الفعالية بأكملها')}
            title={t('Before. During. Beyond.', 'قبل اللحظة. خلالها. وبعدها.')}
            description={t(
              'An event is a sequence of human moments. Explore the lifecycle we’re designing around.',
              'الفعالية سلسلة من لحظات إنسانية. استكشف دورة الحياة التي نصمّم تجربتنا حولها.',
            )}
          />
          <Reveal>
            <LifecyclePreview locale={locale} />
          </Reveal>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-two-column">
          <Reveal>
            <PhotoPanel
              locale={locale}
              caption={t(
                'The space is ready. Now, imagine the experience around it.',
                'المكان جاهز. تخيّل الآن التجربة التي تحيط به.',
              )}
            />
          </Reveal>
          <Reveal>
            <SectionHeading
              eyebrow={t('For organizers', 'للمنظمين')}
              title={t(
                'More presence. Less pulling the pieces together.',
                'حضور أكبر. وانشغال أقل بجمع التفاصيل.',
              )}
              description={t(
                'The organizer workspace is being shaped to make preparation clearer and the event day feel more intentional.',
                'نصمّم مساحة المنظّم لتمنح التحضير وضوحًا أكبر ويوم الفعالية اهتمامًا أدق.',
              )}
            />
            <BenefitList
              items={[
                t(
                  'A shared view of the event story and schedule.',
                  'رؤية مشتركة لقصة الفعالية وبرنامجها.',
                ),
                t('A participant journey that carries your identity.', 'رحلة مشارك تحمل هويتك.'),
                t(
                  'A foundation for thoughtful follow-up, not another loose end.',
                  'أساس لمتابعة مدروسة، لا لتفاصيل أخرى معلّقة.',
                ),
              ]}
            />
            <Link href={route(locale, 'solutions')} className="ui-focus m-text-link">
              {t('Find your gathering', 'اعثر على تصوّر لقائك')} ↗
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="m-section m-section-soft">
        <div className="m-container m-two-column">
          <Reveal>
            <SectionHeading
              eyebrow={t('For participants', 'للمشاركين')}
              title={t('Less guessing. More being there.', 'تخمين أقل. وحضور أعمق.')}
              description={t(
                'A better experience begins before you arrive. We’re designing for the details that help every participant feel part of the moment.',
                'تبدأ التجربة الأفضل قبل الوصول. نصمّم للتفاصيل التي تساعد كل مشارك على أن يشعر بأنه جزء من اللحظة.',
              )}
            />
            <BenefitList
              items={[
                t(
                  'Clear information in Arabic and English.',
                  'معلومات واضحة بالعربية والإنجليزية.',
                ),
                t(
                  'A considered welcome and relevant next steps.',
                  'ترحيب مدروس وخطوات تالية مناسبة.',
                ),
                t(
                  'A future home for the experiences you choose to carry forward.',
                  'مساحة مستقبلية للتجارب التي تختار الاحتفاظ بأثرها.',
                ),
              ]}
            />
          </Reveal>
          <Reveal>
            <div className="m-participant-story">
              <span className="m-preview-tag">
                {t('Participant experience concept', 'تصوّر تجربة المشارك')}
              </span>
              <div className="m-story-line">
                <span>01</span>
                <div>
                  <h3>{t('Know what to expect.', 'اعرف ما ينتظرك.')}</h3>
                  <p>
                    {t('A clear event story and useful context.', 'قصة واضحة للفعالية وسياق مفيد.')}
                  </p>
                </div>
              </div>
              <div className="m-story-line">
                <span>02</span>
                <div>
                  <h3>{t('Feel part of the gathering.', 'كن جزءًا من اللقاء.')}</h3>
                  <p>{t('A journey designed around people.', 'رحلة تُصمّم حول الناس.')}</p>
                </div>
              </div>
              <div className="m-story-line">
                <span>03</span>
                <div>
                  <h3>{t('Take the meaning with you.', 'خذ المعنى معك.')}</h3>
                  <p>{t('More than a day on your calendar.', 'أكثر من يوم على تقويمك.')}</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="m-section m-section-dark">
        <div className="m-container m-two-column">
          <Reveal>
            <SectionHeading
              eyebrow="Event Passport"
              title={t('Keep the moment. Continue the journey.', 'احتفظ باللحظة. وواصل الرحلة.')}
              description={t(
                'Event Passport is our vision for a participant experience that reaches beyond a single gathering. A considered place for the story you’re building, one event at a time.',
                'جواز الفعاليات هو رؤيتنا لتجربة مشارك تتجاوز لقاءً واحدًا؛ مساحة مدروسة للقصة التي تبنيها، فعالية بعد أخرى.',
              )}
            />
            <PreviewBadge locale={locale} />
            <p className="mt-5 max-w-lg text-sm leading-8 text-[#bbc5da]">
              {t(
                'This is a planned capability. The sample pass is decorative and is not a valid ticket, certificate, or attendance credential.',
                'هذه ميزة مخططة. البطاقة التوضيحية ليست تذكرة أو شهادة أو إثبات حضور صالحًا.',
              )}
            </p>
            <Button asChild variant="secondary" className="mt-7">
              <Link href={route(locale, 'features') + '#passport'}>
                {t('Explore Event Passport', 'استكشف جواز الفعاليات')} ↗
              </Link>
            </Button>
          </Reveal>
          <Reveal className="m-passport-display">
            <PassportPreview locale={locale} />
          </Reveal>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            centered
            eyebrow={t('A considered starting point', 'نقطة بداية مدروسة')}
            title={t('A plan for the way you gather.', 'خطة تناسب طريقة لقائك.')}
            description={t(
              'Our package structure is being shaped around different organizer needs. Pricing has not been approved or announced.',
              'نصمّم هيكل الباقات حول احتياجات المنظمين المختلفة. لم تُعتمد الأسعار أو تُعلن بعد.',
            )}
          />
          <PricingCards locale={locale} />
          <div className="text-center">
            <Link href={route(locale, 'pricing')} className="ui-focus m-text-link">
              {t('Explore the proposed packages', 'استكشف الباقات المقترحة')} ↗
            </Link>
          </div>
        </div>
      </section>

      <section className="m-section m-section-soft">
        <div className="m-container m-faq-layout">
          <SectionHeading
            eyebrow={t('A few things worth knowing', 'أمور تستحق المعرفة')}
            title={t('Questions, answered.', 'أسئلة، وإجابات واضحة.')}
            description={t(
              'Clear expectations matter, from the first visit.',
              'توقّعات واضحة، منذ الزيارة الأولى.',
            )}
          />
          <div>
            <FAQSection locale={locale} limit={5} />
            <Link href={route(locale, 'faq')} className="ui-focus m-text-link">
              {t('See all questions', 'اطّلع على كل الأسئلة')} ↗
            </Link>
          </div>
        </div>
      </section>
      <CtaSection locale={locale} />
    </>
  );
}
