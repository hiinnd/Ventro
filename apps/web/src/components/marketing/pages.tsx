import Link from 'next/link';
import type { Locale } from '@ventro/types';
import {
  Badge,
  Icon,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ventro/ui';
import { faqItems, featureItems, pageContent } from '../../lib/marketing/content';
import { site } from '../../lib/marketing/config';
import { route, text, type PublicPage } from '../../lib/marketing/site';
import { ContactForm } from './contact-form';
import { FAQSearch } from './faq-search';
import { MarketingHome } from './home';
import { MarketingIcon } from './icon';
import { Reveal } from './motion';
import { EventGallery, PreviewBadge, ProductPreview } from './previews';
import {
  BenefitList,
  CtaSection,
  FeatureGrid,
  PageIntro,
  PhotoPanel,
  PricingCards,
  SectionHeading,
} from './sections';

export function MarketingPageContent({
  locale,
  page,
  intent,
  plan,
}: {
  locale: Locale;
  page: PublicPage;
  intent?: string;
  plan?: string;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const content = pageContent(locale, page);
  if (page === 'home') return <MarketingHome locale={locale} />;
  if (page === 'privacy' || page === 'terms') return <LegalPage locale={locale} page={page} />;
  return (
    <>
      <PageIntro
        eyebrow={
          page === 'about' ? 'VENTRO / JORDAN / MENA' : t('The VENTRO vision', 'رؤية VENTRO')
        }
        title={content.title}
        description={content.description}
      >
        {['features', 'solutions', 'pricing'].includes(page) && (
          <div className="mt-6">
            <PreviewBadge locale={locale} />
          </div>
        )}
      </PageIntro>
      {page === 'features' && (
        <>
          <section className="m-section pt-0">
            <div className="m-container">
              <h2 className="sr-only">
                {t('Planned feature collection', 'مجموعة المزايا المخططة')}
              </h2>
              <FeatureGrid locale={locale} />
            </div>
          </section>
          <section className="m-section m-section-soft">
            <div className="m-container">
              <SectionHeading
                eyebrow={t('Built around the journey', 'حول الرحلة بأكملها')}
                title={t(
                  'Consider the detail. Connect the experience.',
                  'اهتم بالتفصيل، واربط التجربة.',
                )}
                description={t(
                  'These are planned product capabilities. Explore the intent behind each one.',
                  'هذه مزايا مخططة للمنتج. استكشف الهدف من كل منها.',
                )}
              />
              <div className="m-feature-detail-list">
                {featureItems(locale).map((feature, index) => (
                  <Reveal key={feature.id}>
                    <article id={feature.id} className="m-feature-detail">
                      <div className="m-feature-detail-number" aria-hidden>
                        0{index + 1}
                      </div>
                      <span className="m-icon-tile">
                        <MarketingIcon name={feature.icon} />
                      </span>
                      <div>
                        <Badge variant="accent">{t('Planned capability', 'ميزة مخططة')}</Badge>
                        <h3>{feature.title}</h3>
                        <p>{feature.detail}</p>
                      </div>
                      <Link
                        href={route(locale, 'contact') + '?intent=early-access'}
                        className="ui-focus m-text-link"
                      >
                        {t('Discuss this idea', 'ناقش هذه الفكرة')} ↗
                      </Link>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
          <section id="product-preview" className="m-section">
            <div className="m-container">
              <SectionHeading
                centered
                title={t('A tangible glimpse of the vision.', 'لمحة ملموسة عن الرؤية.')}
                description={t(
                  'Explore the planning, arrival, and follow-up concepts. They do not create events or issue tickets.',
                  'استكشف تصوّرات التخطيط والوصول والمتابعة. لا تُنشئ هذه الواجهات فعاليات ولا تُصدر تذاكر.',
                )}
              />
              <ProductPreview locale={locale} />
            </div>
          </section>
          <CtaSection locale={locale} />
        </>
      )}
      {page === 'solutions' && (
        <>
          <section className="m-section pt-0">
            <div className="m-container">
              <div className="m-solution-grid">
                {[
                  [
                    'calendar',
                    t('Conferences & professional gatherings', 'المؤتمرات واللقاءات المهنية'),
                    t(
                      'A connected event story, from the invitation to the conversation that follows.',
                      'قصة فعالية مترابطة، من الدعوة إلى الحوار الذي يليها.',
                    ),
                  ],
                  [
                    'people',
                    t('Communities & campus', 'المجتمعات والجامعات'),
                    t(
                      'Thoughtful experiences for people who gather around a shared interest.',
                      'تجارب مدروسة لمن يجتمعون حول اهتمام مشترك.',
                    ),
                  ],
                  [
                    'passport',
                    t('Workshops & learning', 'ورش العمل والتعلّم'),
                    t(
                      'Clear schedules, considered participation, and a future place for the journey to continue.',
                      'برامج واضحة ومشاركة مدروسة ومساحة مستقبلية لاستمرار الرحلة.',
                    ),
                  ],
                  [
                    'connection',
                    t('Teams & organizations', 'الفرق والمؤسسات'),
                    t(
                      'An intended foundation for internal gatherings and broader event programs.',
                      'أساس مستهدف للقاءات الداخلية وبرامج الفعاليات الأوسع.',
                    ),
                  ],
                ].map(([icon, title, description]) => (
                  <Reveal key={title}>
                    <article className="m-solution-card">
                      <span className="m-icon-tile">
                        <MarketingIcon
                          name={icon as 'calendar' | 'people' | 'passport' | 'connection'}
                        />
                      </span>
                      <h2>{title}</h2>
                      <p>{description}</p>
                      <Link
                        className="ui-focus m-text-link"
                        href={route(locale, 'contact') + '?intent=organize'}
                      >
                        {t('Share your gathering', 'شاركنا فكرة لقائك')} ↗
                      </Link>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
          <section id="event-preview" className="m-section m-section-soft">
            <div className="m-container">
              <SectionHeading
                eyebrow={t('Explore Events', 'استكشف الفعاليات')}
                title={t('Imagine the possibilities.', 'تخيّل الإمكانات.')}
                description={t(
                  'A concept gallery for the kinds of gatherings VENTRO is being designed around. No live event listings are available yet.',
                  'معرض تصوّرات لأنواع اللقاءات التي نصمّم VENTRO حولها. لا تتوفر قوائم فعاليات فعلية بعد.',
                )}
              />
              <EventGallery locale={locale} />
            </div>
          </section>
          <CtaSection locale={locale} />
        </>
      )}
      {page === 'pricing' && (
        <>
          <section className="m-section pt-0">
            <div className="m-container">
              <h2 className="sr-only">{t('Proposed packages', 'الباقات المقترحة')}</h2>
              <PricingCards locale={locale} />
            </div>
          </section>
          <section className="m-section m-section-soft">
            <div className="m-container m-two-column">
              <SectionHeading
                eyebrow={t('Clear expectations', 'توقّعات واضحة')}
                title={t(
                  'A conversation first. A commitment later.',
                  'الحوار أولًا. والالتزام لاحقًا.',
                )}
                description={t(
                  'The proposed packages are a starting point for understanding organizer needs. There are no subscriptions, invoices, payment methods, or published prices in this preview.',
                  'الباقات المقترحة نقطة بداية لفهم احتياجات المنظمين. لا توجد اشتراكات أو فواتير أو وسائل دفع أو أسعار منشورة في هذه المعاينة.',
                )}
              />
              <BenefitList
                items={[
                  t('Prices will be announced when approved.', 'سنعلن الأسعار عند اعتمادها.'),
                  t(
                    'Final features and limits will be stated before any purchase.',
                    'سنوضح المزايا والحدود النهائية قبل أي شراء.',
                  ),
                  t(
                    'Preparing an inquiry creates no purchase or mailing-list commitment.',
                    'تجهيز استفسار لا ينشئ التزام شراء أو تسجيلًا بريديًا.',
                  ),
                ]}
              />
            </div>
          </section>
          <section className="m-section">
            <div className="m-container">
              <SectionHeading title={t('Before you choose a package.', 'قبل اختيار باقتك.')} />
              <Table scrollLabel={t('Package status', 'حالة الباقات')}>
                <TableCaption>
                  {t(
                    'Current public-preview status. This is not a list of live subscription entitlements.',
                    'حالة المعاينة العامة الحالية. ليست قائمة مزايا اشتراكات فعلية.',
                  )}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('What to know', 'ما تحتاج معرفته')}</TableHead>
                    <TableHead>Gather</TableHead>
                    <TableHead>Grow</TableHead>
                    <TableHead>Scale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    t('Published price', 'السعر المنشور'),
                    t('Final inclusions', 'المزايا النهائية'),
                    t('Purchasing', 'الشراء'),
                  ].map((label, index) => (
                    <TableRow key={label}>
                      <TableCell>{label}</TableCell>
                      {[0, 1, 2].map((column) => (
                        <TableCell key={column}>
                          {index === 2
                            ? t('Not available', 'غير متاح')
                            : t('To be announced', 'يُعلن لاحقًا')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
          <CtaSection locale={locale} />
        </>
      )}
      {page === 'about' && (
        <>
          <section className="m-section pt-0">
            <div className="m-container m-two-column">
              <PhotoPanel locale={locale} />
              <div>
                <span className="m-eyebrow">{t('Why VENTRO', 'لماذا VENTRO')}</span>
                <h2 className="m-about-statement">
                  {t(
                    'An event is a beginning, not a boundary.',
                    'الفعالية بداية، لا حدودًا للتجربة.',
                  )}
                </h2>
                <p className="m-body-copy mt-6">
                  {t(
                    'We are building around the moments that make a gathering matter: a considered invitation, a warm welcome, a useful conversation, and a connection worth continuing.',
                    'نبني حول اللحظات التي تمنح اللقاء قيمته: دعوة مدروسة، وترحيب دافئ، وحوار مفيد، وعلاقة تستحق الاستمرار.',
                  )}
                </p>
                <p className="m-body-copy mt-5">
                  {t(
                    'Our starting point is Jordan and the MENA region. Arabic and English belong at the heart of the experience, with interfaces that respect both directions of reading.',
                    'نقطة انطلاقنا الأردن والمنطقة. تنتمي العربية والإنجليزية إلى قلب التجربة، بواجهات تحترم اتجاهي القراءة.',
                  )}
                </p>
              </div>
            </div>
          </section>
          <section className="m-section m-section-soft">
            <div className="m-container">
              <SectionHeading
                eyebrow={t('What guides us', 'ما يوجّهنا')}
                title={t('Clarity. Care. Connection.', 'وضوح. اهتمام. تواصل.')}
              />
              <div className="m-feature-grid">
                {[
                  [
                    t('Clarity in the details', 'وضوح في التفاصيل'),
                    t(
                      'Information should help people move forward, not make them work harder to understand.',
                      'ينبغي للمعلومات أن تساعد الناس على التقدّم، لا أن تجعل فهمها عبئًا.',
                    ),
                  ],
                  [
                    t('Care in the experience', 'اهتمام في التجربة'),
                    t(
                      'Accessible, bilingual interfaces are a design responsibility, not an afterthought.',
                      'الواجهات سهلة الوصول وثنائية اللغة مسؤولية تصميمية، لا إضافة متأخرة.',
                    ),
                  ],
                  [
                    t('Connection beyond the day', 'تواصل يتجاوز اليوم'),
                    t(
                      'A meaningful gathering can open a door. We are designing for what comes after it.',
                      'قد يفتح اللقاء الهادف بابًا. نصمّم لما يأتي بعده.',
                    ),
                  ],
                ].map(([title, description], index) => (
                  <Reveal key={title} delay={index * 0.06}>
                    <article className="m-feature-card">
                      <span className="m-value-number">0{index + 1}</span>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
          <section className="m-section">
            <div className="m-container m-two-column">
              <SectionHeading
                title={t('An honest look at where we are.', 'صورة واضحة عن المرحلة الحالية.')}
                description={t(
                  'The technical foundation, brand system, public website, and secure personal accounts are in place. Event management and Event Passport remain on the product roadmap.',
                  'الأساس التقني وهوية العلامة والموقع العام والحسابات الشخصية الآمنة أصبحت موجودة. إدارة الفعاليات وجواز الفعاليات ما يزالان ضمن خارطة المنتج.',
                )}
              />
              <div className="m-about-roadmap">
                <div>
                  <Icon name="check" />
                  <span>{t('Foundation & bilingual design', 'الأساس والتصميم ثنائي اللغة')}</span>
                  <Badge variant="success">{t('In this preview', 'في هذه المعاينة')}</Badge>
                </div>
                <div>
                  <Icon name="check" />
                  <span>{t('Public product exploration', 'استكشاف المنتج العام')}</span>
                  <Badge variant="success">{t('In this preview', 'في هذه المعاينة')}</Badge>
                </div>
                <div>
                  <MarketingIcon name="connection" className="size-4" />
                  <span>{t('Event capabilities', 'مزايا الفعاليات')}</span>
                  <Badge variant="accent">{t('Planned', 'مخطط')}</Badge>
                </div>
              </div>
            </div>
          </section>
          <CtaSection locale={locale} />
        </>
      )}
      {page === 'contact' && (
        <section className="m-section pt-0">
          <div className="m-container m-contact-layout">
            <ContactForm
              key={locale + ':' + (intent ?? '') + ':' + (plan ?? '')}
              locale={locale}
              contactEmail={site.contactEmail}
              initialIntent={intent}
              plan={plan}
            />
            <aside className="m-contact-aside">
              <span className="m-icon-tile">
                <MarketingIcon name="connection" />
              </span>
              <h2>{t('A more considered conversation.', 'حوار أكثر اهتمامًا.')}</h2>
              <p>
                {t(
                  'Tell us about the people you hope to bring together, the experience you want to create, and the questions on your mind.',
                  'أخبرنا عن الناس الذين ترغب بجمعهم، والتجربة التي تريد صنعها، والأسئلة التي تشغلك.',
                )}
              </p>
              <BenefitList
                items={[
                  t(
                    'For organizers exploring a future event.',
                    'للمنظمين الذين يستكشفون فعالية قادمة.',
                  ),
                  t(
                    'For communities and potential collaborators.',
                    'للمجتمعات والمتعاونين المحتملين.',
                  ),
                  t('For questions about our product direction.', 'للأسئلة حول توجه المنتج.'),
                ]}
              />
              {site.contactEmail && (
                <a className="ui-focus m-text-link" href={'mailto:' + site.contactEmail}>
                  {site.contactEmail}
                </a>
              )}
              <div className="m-contact-small">
                <h3>{t('Looking for an answer?', 'تبحث عن إجابة؟')}</h3>
                <p>
                  {t(
                    'Our FAQ explains the current preview, planned capabilities, and proposed packages.',
                    'توضح الأسئلة الشائعة المعاينة الحالية والمزايا المخططة والباقات المقترحة.',
                  )}
                </p>
                <Link className="ui-focus m-text-link" href={route(locale, 'faq')}>
                  {t('Visit the FAQ', 'زر الأسئلة الشائعة')} ↗
                </Link>
              </div>
            </aside>
          </div>
        </section>
      )}
      {page === 'faq' && (
        <>
          <section className="m-section pt-0">
            <div className="m-container m-faq-page">
              <FAQSearch locale={locale} items={faqItems(locale)} />
            </div>
          </section>
          <CtaSection locale={locale} />
        </>
      )}
    </>
  );
}

function LegalPage({ locale, page }: { locale: Locale; page: 'privacy' | 'terms' }) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const content = pageContent(locale, page);
  const privacy = page === 'privacy';
  const sections = privacy
    ? [
        [
          t('Scope of this policy', 'نطاق هذه السياسة'),
          t(
            'This policy describes the current VENTRO public preview, not a live event-management or ticketing service. The operating-entity details and final production processing arrangements must be confirmed before a full public service launch.',
            'تصف هذه السياسة المعاينة العامة الحالية لـ VENTRO، وليست خدمة فعلية لإدارة الفعاليات أو التذاكر. يجب تأكيد بيانات الجهة المشغّلة وترتيبات المعالجة النهائية قبل إطلاق الخدمة العامة الكاملة.',
          ),
        ],
        [
          t('Preferences stored on your device', 'التفضيلات المخزّنة في جهازك'),
          t(
            'The website stores your theme and language preferences in local storage. These preferences support the experience and are not advertising identifiers. You can remove them through your browser settings. Local storage may be unavailable in private or restricted browsing; the site remains usable.',
            'يخزّن الموقع تفضيلات المظهر واللغة محليًا في المتصفح. تخدم هذه التفضيلات التجربة وليست معرّفات إعلانية. يمكنك إزالتها عبر إعدادات المتصفح. وقد لا يتوفر التخزين المحلي في التصفح الخاص أو المقيّد؛ ويبقى الموقع قابلًا للاستخدام.',
          ),
        ],
        [
          t('Account information and session cookies', 'معلومات الحساب وملفات ارتباط الجلسة'),
          t(
            'Creating an account stores your name, normalized email address, preferred email language, password hash, verification state, and account timestamps in PostgreSQL. Passwords use Argon2id hashing. An HTTP-only, SameSite session cookie identifies your session; it is Secure over HTTPS in production. Only a hash of its random value is stored on the server. Sessions expire after seven days unless renewed, with a thirty-day absolute limit. You can sign out, and resetting a password revokes all previous sessions.',
            'ينشئ الحساب سجلًا في PostgreSQL يتضمن اسمك وبريدك المنسّق ولغة البريد المفضّلة وبصمة كلمة المرور وحالة التأكيد والتواريخ. تُستخدم Argon2id لبصمة كلمة المرور. يعرّف ملف ارتباط HTTP-only وSameSite جلستك، ويُضاف Secure عبر HTTPS في الإنتاج. يحتفظ الخادم ببصمة الرمز العشوائي فقط. تنتهي الجلسات خلال سبعة أيام ما لم تُجدّد، وبحد أقصى ثلاثين يومًا. يمكنك تسجيل الخروج، وتلغي استعادة كلمة المرور الجلسات السابقة.',
          ),
        ],
        [
          t('Authentication email and security records', 'بريد المصادقة وسجلات الأمان'),
          t(
            'Verification and reset tokens are single use and stored as hashes, expiring after 24 hours and 30 minutes respectively. Delivery intent is stored in an encrypted email outbox and retried when SMTP is unavailable. Payload content is cleared after delivery. Development email is captured by local Mailpit; production SMTP must be configured separately. Security audits record event type, actor ID, request ID, and a keyed network identifier rather than a raw IP address. They exclude passwords and raw tokens. These are operational security records, not advertising analytics.',
            'تُستخدم رموز التأكيد والاستعادة مرة واحدة وتُخزّن كبصمات، وتنتهي خلال ٢٤ ساعة و٣٠ دقيقة بالترتيب. يُحفظ طلب الإرسال في صندوق بريد صادر مشفّر، وتُعاد المحاولة عند تعطل SMTP. يُمسح المحتوى بعد التسليم. يلتقط Mailpit المحلي بريد التطوير، ويُضبط بريد الإنتاج منفصلًا. تسجّل مراجعة الأمان نوع الحدث ومعرّف الفاعل والطلب ومعرّف شبكة مشتقًا بمفتاح بدل عنوان IP الخام، دون كلمات مرور أو رموز خام. هذه سجلات أمان تشغيلية وليست تحليلات إعلانية.',
          ),
        ],
        [
          t('Organization and team information', 'معلومات المؤسسة والفريق'),
          t(
            'Organization profiles, private logo images, role memberships, invitation recipient addresses, and invitation status are stored in PostgreSQL. Owners manage settings and team access. Event Managers can view the team directory, including member names and email addresses; Check-in Staff and Participants cannot view that directory. Invitation links expire after seven days and only the verified invited email can accept or decline. Your active organization is stored in your server-side session and is cleared when your membership is removed. Organization and invitation records remain until managed deletion. Do not upload personal or confidential material as a logo, and invite only people you are authorized to contact.',
            'تُحفظ ملفات المؤسسات وصور الشعارات الخاصة والعضويات والأدوار وعناوين مستلمي الدعوات وحالاتها في PostgreSQL. يدير المالكون الإعدادات وصلاحيات الفريق. يمكن لمديري الفعاليات الاطّلاع على أسماء أعضاء الفريق وبريدهم، ولا يمكن لموظفي الدخول أو المشاركين عرض هذا الدليل. تنتهي الدعوات بعد سبعة أيام، ولا يقبلها أو يرفضها إلا صاحب البريد المدعو المؤكّد. تُحفظ المؤسسة النشطة في جلسة الخادم وتُزال عند إنهاء العضوية. تبقى سجلات المؤسسات والدعوات حتى حذفها إداريًا. لا ترفع محتوى شخصيًا أو سريًا كشعار، ولا تدعُ أشخاصًا دون صلاحية للتواصل معهم.',
          ),
        ],
        [
          t('Retention and account choices', 'الاحتفاظ وخيارات الحساب'),
          t(
            'While the API is running, hourly maintenance removes sessions/tokens that expired or were consumed more than a day ago, completed email-outbox metadata after seven days, and audit records after ninety days. Sent email payloads are cleared immediately after confirmed SMTP handoff; failed payloads are cleared on expiration. Account records remain until managed deletion; a self-service account-deletion flow is not available in this phase. You can update your name and email-language preference or stop using the account. Final operator contact, hosting/provider retention, and data-request arrangements must be approved before public launch.',
            'أثناء تشغيل API، تزيل الصيانة كل ساعة الجلسات والرموز المنتهية أو المستهلكة منذ أكثر من يوم، وبيانات البريد الصادر المكتمل بعد سبعة أيام، وسجلات المراجعة بعد تسعين يومًا. يُمسح محتوى الرسائل بعد قبول SMTP، ومحتوى الرسائل الفاشلة عند انتهاء الصلاحية. تبقى سجلات الحساب حتى حذفها إداريًا؛ لا تتوفر خدمة حذف الحساب ذاتيًا في هذه المرحلة. يمكنك تعديل الاسم ولغة البريد أو التوقف عن استخدام الحساب. يجب اعتماد جهة التواصل وترتيبات الاستضافة والاحتفاظ لدى المزوّد وطلبات البيانات قبل الإطلاق العام.',
          ),
        ],
        [
          t('Contact briefs and email drafts', 'نبذات التواصل ومسودات البريد'),
          t(
            'Contact fields are held in page memory to prepare a brief. This preview does not submit or save those details to a VENTRO backend or enroll you in a mailing list. Copying the brief is a device action. If an official email channel is available and you choose to open an email draft, your email provider handles the draft and any message you decide to send.',
            'تُحتفظ حقول التواصل في ذاكرة الصفحة لتجهيز نبذة. لا ترسل هذه المعاينة تلك البيانات إلى خادم VENTRO ولا تحفظها فيه ولا تسجّلك في قائمة بريدية. نسخ النبذة إجراء على جهازك. وعند توفر بريد رسمي واختيار فتح مسودة، يتعامل مزوّد بريدك مع المسودة وأي رسالة تقرر إرسالها.',
          ),
        ],
        [
          t('Technical requests and third-party resources', 'الطلبات التقنية والموارد الخارجية'),
          t(
            'Your browser sends standard request information to deliver pages, images, and other resources. Any hosting access-log retention depends on deployment arrangements that must be disclosed before launch. Fonts and event photographs are served locally by this website. No advertising or visitor-analytics integration is installed in this preview. Following an external photo-credit link is your choice and takes you to another website.',
            'يرسل متصفحك معلومات طلب تقنية معتادة لتوفير الصفحات والصور والموارد. يعتمد الاحتفاظ بسجلات الاستضافة على ترتيبات النشر التي يجب الإفصاح عنها قبل الإطلاق. يقدّم الموقع الخطوط وصور الفعاليات محليًا. لا تتضمن هذه المعاينة تكاملًا للإعلانات أو تحليلات الزوّار. واتباع رابط خارجي لمصدر صورة قرار اختياري ينقلك إلى موقع آخر.',
          ),
        ],
        [
          t('Your choices', 'خياراتك'),
          t(
            'You can browse without preparing a contact brief, clear browser preferences, and choose not to send an email draft. Do not include sensitive personal information in a brief. A live participant service will require its own clearly stated data practices before it opens.',
            'يمكنك التصفح دون تجهيز نبذة، ومسح تفضيلات المتصفح، واختيار عدم إرسال مسودة بريد. لا تضف معلومات شخصية حساسة إلى النبذة. وستحتاج خدمة المشاركين الفعلية إلى ممارسات بيانات معلنة بوضوح قبل فتحها.',
          ),
        ],
        [
          t('Questions and future changes', 'الأسئلة والتغييرات القادمة'),
          t(
            'Use the Contact page to review the currently available communication options. Material changes to data collection or tracking will require an updated policy and the applicable launch arrangements; they are not enabled by this preview.',
            'استخدم صفحة التواصل للاطلاع على وسائل التواصل المتاحة حاليًا. تتطلب التغييرات الجوهرية في جمع البيانات أو التتبع سياسة محدّثة وترتيبات الإطلاق المناسبة؛ ولا تفعّلها هذه المعاينة.',
          ),
        ],
      ]
    : [
        [
          t('The public preview', 'المعاينة العامة'),
          t(
            'This website introduces VENTRO and provides real personal accounts with email verification, password recovery, and profile settings. Event screens are clearly labeled concepts. Live event creation, event registration, ticketing, payment, check-in, and verified Event Passport credentials remain unavailable.',
            'يعرّف الموقع بـ VENTRO ويقدّم حسابات شخصية فعلية مع تأكيد البريد واستعادة كلمة المرور وإعدادات الملف الشخصي. شاشات الفعاليات تصوّرات موسومة بوضوح. إنشاء الفعاليات والتسجيل فيها والتذاكر والدفع وتسجيل الحضور وبيانات اعتماد جواز الفعاليات ليست متاحة بعد.',
          ),
        ],
        [
          t('Illustrations and proposed packages', 'الرسوم التوضيحية والباقات المقترحة'),
          t(
            'Event cards, product screens, and passes are illustrative. No preview pass grants entry or proves attendance. Package names and inclusions are proposals, not a purchase offer. No prices, launch date, feature availability, or service levels are guaranteed by the preview.',
            'بطاقات الفعاليات وشاشات المنتج والبطاقات المعروضة توضيحية. لا تمنح أي بطاقة معاينة دخولًا ولا تثبت حضورًا. أسماء الباقات ومزاياها مقترحات وليست عرض شراء. لا تضمن المعاينة أسعارًا أو موعد إطلاق أو توفر مزايا أو مستويات خدمة.',
          ),
        ],
        [
          t('Responsible use', 'الاستخدام المسؤول'),
          t(
            'Use the website lawfully and do not attempt to disrupt it, bypass access restrictions, misrepresent preview credentials, or submit harmful material. A contact brief remains local until you choose to copy or send it through an available email channel.',
            'استخدم الموقع بصورة مشروعة، ولا تحاول تعطيله أو تجاوز قيود الوصول أو تقديم بيانات اعتماد المعاينة باعتبارها فعلية أو إرسال محتوى ضار. تبقى نبذة التواصل محلية إلى أن تختار نسخها أو إرسالها عبر بريد متاح.',
          ),
        ],
        [
          t('Brand and third-party content', 'العلامة ومحتوى الأطراف الأخرى'),
          t(
            'The VENTRO name and original visual identity are presented for this project. Access to an SVG file does not by itself grant trademark rights. Event photographs retain their respective Unsplash licenses, and local font packages retain their own licenses. Photo credits identify the contributors; stock imagery does not imply a VENTRO event, customer, or endorsement.',
            'يُعرض اسم VENTRO وهويته البصرية الأصلية لهذا المشروع. إتاحة ملف SVG لا تمنح بذاتها حقوقًا في العلامة. تحتفظ صور الفعاليات بتراخيص Unsplash الخاصة بها، والخطوط بتراخيصها. تحدد الاعتمادات المساهمين؛ ولا تعني الصور أن الفعاليات أو العملاء تابعون لـ VENTRO أو يؤيدونه.',
          ),
        ],
        [
          t('Future services and legal details', 'الخدمات المستقبلية والبيانات القانونية'),
          t(
            'Personal accounts are available for the current development/preview environment. Keep your password and email links private and use an address you control. The operating entity, final legal terms, hosting, and production email arrangements must be approved before public launch. Creating an account does not purchase an event service or enroll you in marketing email.',
            'تتوفر الحسابات الشخصية في بيئة التطوير والمعاينة الحالية. حافظ على خصوصية كلمة المرور وروابط البريد واستخدم عنوانًا تملكه. يجب اعتماد الجهة المشغّلة والشروط النهائية والاستضافة وترتيبات البريد قبل الإطلاق العام. إنشاء الحساب لا يشتري خدمة فعاليات ولا يسجّلك في رسائل تسويقية.',
          ),
        ],
        [
          t('Contact and updates', 'التواصل والتحديثات'),
          t(
            'The Contact page describes the available inquiry options. This preview document may change as the product and operator arrangements are finalized. Review the current version before using any future live service.',
            'توضح صفحة التواصل خيارات الاستفسار المتاحة. قد تتغير هذه الوثيقة مع اعتماد المنتج وترتيبات الجهة المشغّلة. راجع النسخة الحالية قبل استخدام أي خدمة فعلية مستقبلًا.',
          ),
        ],
      ];
  return (
    <>
      <PageIntro
        eyebrow={t('Public preview information', 'معلومات المعاينة العامة')}
        title={content.title}
        description={content.description}
      />
      <section className="m-section pt-0">
        <div className="m-container m-legal-layout">
          <aside>
            <Badge variant="warning">{t('Preview policy · Draft', 'سياسة المعاينة · مسودة')}</Badge>
            <p>{t('Updated November 13, 2026', 'حُدّثت في ١٣ نوفمبر ٢٠٢٦')}</p>
            <p>
              {site.legalOperator
                ? t('Operator: ', 'الجهة المشغّلة: ') + site.legalOperator
                : t(
                    'Operating-entity details are not yet confirmed.',
                    'لم تُؤكد بيانات الجهة المشغّلة بعد.',
                  )}
            </p>
            <Link
              href={route(locale, privacy ? 'terms' : 'privacy')}
              className="ui-focus m-text-link"
            >
              {privacy
                ? t('Read the Terms of Service', 'اقرأ شروط الاستخدام')
                : t('Read the Privacy Policy', 'اقرأ سياسة الخصوصية')}{' '}
              ↗
            </Link>
          </aside>
          <article className="m-legal-content">
            {sections.map(([title, body]) => (
              <section key={title}>
                <h2>{title}</h2>
                <p>{body}</p>
              </section>
            ))}
            <div className="m-legal-contact">
              <h2>{t('A question about this preview?', 'لديك سؤال حول المعاينة؟')}</h2>
              <Link href={route(locale, 'contact')} className="ui-focus m-text-link">
                {t('Visit Contact', 'زر صفحة التواصل')} ↗
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
