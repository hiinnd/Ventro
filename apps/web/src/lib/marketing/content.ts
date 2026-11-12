import type { Locale } from '@ventro/types';
import { text, type PublicPage } from './site';

export function pageContent(locale: Locale, page: PublicPage) {
  const content = {
    home: [
      text(locale, 'Every Event. Beyond the Moment.', 'لكل فعالية. أثر يتجاوز اللحظة.'),
      text(
        locale,
        'Meet VENTRO: a connected event experience being built for organizers and participants in Jordan and the MENA region.',
        'تعرّف إلى VENTRO: تجربة فعاليات مترابطة نبنيها للمنظمين والمشاركين في الأردن والمنطقة.',
      ),
    ],
    features: [
      text(locale, 'Everything connects.', 'كل التفاصيل مترابطة.'),
      text(
        locale,
        'Explore the product vision, from the first invitation to the connections that stay with you.',
        'استكشف رؤيتنا للمنتج، من الدعوة الأولى إلى العلاقات التي تبقى معك.',
      ),
    ],
    solutions: [
      text(locale, 'Different gatherings. Shared possibilities.', 'لقاءات متنوعة. إمكانات مشتركة.'),
      text(
        locale,
        'A thoughtful foundation for conferences, learning communities, campus experiences, and teams.',
        'أساس مدروس للمؤتمرات ومجتمعات التعلّم واللقاءات الجامعية وفرق العمل.',
      ),
    ],
    pricing: [
      text(locale, 'Room for every kind of gathering.', 'مساحة لكل نوع من اللقاءات.'),
      text(
        locale,
        'Explore our proposed packages. Prices and final inclusions will be announced at launch.',
        'استكشف الباقات المقترحة. سنعلن الأسعار والمزايا النهائية عند الإطلاق.',
      ),
    ],
    about: [
      text(locale, 'Built around the people who bring us together.', 'نبني لمن يجمعوننا.'),
      text(
        locale,
        'VENTRO is taking shape in Jordan with a simple belief: a meaningful event should create a lasting connection.',
        'تتشكّل VENTRO في الأردن انطلاقًا من فكرة بسيطة: الفعالية الهادفة تصنع علاقة تدوم.',
      ),
    ],
    contact: [
      text(locale, 'Your next gathering starts with a conversation.', 'لقاؤك القادم يبدأ بحوار.'),
      text(
        locale,
        'Tell us what you have in mind. Prepare a brief for the VENTRO team and explore early-access possibilities.',
        'أخبرنا بما تفكّر فيه. جهّز نبذة لفريق VENTRO واستكشف فرص الوصول المبكر.',
      ),
    ],
    faq: [
      text(locale, 'A little clarity, before we begin.', 'إجابات واضحة قبل البداية.'),
      text(
        locale,
        'The essentials about VENTRO, our public preview, and what comes next.',
        'ما تحتاج معرفته عن VENTRO والمعاينة العامة والخطوات القادمة.',
      ),
    ],
    privacy: [
      text(locale, 'Privacy Policy', 'سياسة الخصوصية'),
      text(
        locale,
        'How this public preview handles preferences, contact drafts, and technical requests.',
        'كيف تتعامل هذه المعاينة العامة مع التفضيلات ومسودات التواصل والطلبات التقنية.',
      ),
    ],
    terms: [
      text(locale, 'Terms of Service', 'شروط الاستخدام'),
      text(
        locale,
        'The scope and conditions of the VENTRO public preview.',
        'نطاق المعاينة العامة لـ VENTRO وشروط استخدامها.',
      ),
    ],
  } satisfies Record<PublicPage, string[]>;
  return { title: content[page][0]!, description: content[page][1]! };
}

export function navItems(locale: Locale) {
  return [
    ['features', text(locale, 'Features', 'المزايا')],
    ['solutions', text(locale, 'Solutions', 'الحلول')],
    ['pricing', text(locale, 'Pricing', 'الباقات')],
    ['about', text(locale, 'About', 'عن VENTRO')],
    ['faq', text(locale, 'FAQ', 'الأسئلة الشائعة')],
    ['contact', text(locale, 'Contact', 'تواصل معنا')],
  ] as const;
}

export function featureItems(locale: Locale) {
  return [
    {
      id: 'planning',
      icon: 'calendar',
      title: text(locale, 'Start with a shared plan.', 'ابدأ بخطة مشتركة.'),
      description: text(
        locale,
        'A proposed workspace for the agenda, team, and decisions that make an event feel considered.',
        'مساحة عمل مقترحة تجمع البرنامج والفريق والقرارات التي تمنح الفعالية اهتمامها بالتفاصيل.',
      ),
      detail: text(
        locale,
        'Bring the event story, schedule, and responsibilities into one clear view. Planning tools are part of the product roadmap.',
        'اجمع قصة الفعالية وجدولها والمسؤوليات في رؤية واضحة. أدوات التخطيط جزء من خارطة تطوير المنتج.',
      ),
    },
    {
      id: 'registration',
      icon: 'ticket',
      title: text(locale, 'Make the first step welcoming.', 'اجعل الخطوة الأولى مرحّبة.'),
      description: text(
        locale,
        'Registration experiences designed to carry your event’s identity, in Arabic and English.',
        'تجارب تسجيل مخططة تحمل هوية فعاليتك بالعربية والإنجليزية.',
      ),
      detail: text(
        locale,
        'We are shaping a straightforward participant journey from discovery to confirmation. Live registration is not open in this preview.',
        'نصمّم رحلة واضحة للمشارك، من اكتشاف الفعالية إلى التأكيد. التسجيل الفعلي غير متاح في هذه المعاينة.',
      ),
    },
    {
      id: 'arrival',
      icon: 'scan',
      title: text(locale, 'Let the welcome flow.', 'امنح الاستقبال انسيابيته.'),
      description: text(
        locale,
        'A concept for clear arrival information and a calmer check-in experience.',
        'تصوّر لمعلومات وصول واضحة وتجربة تسجيل حضور أكثر هدوءًا.',
      ),
      detail: text(
        locale,
        'Arrival and check-in screens shown here are UI concepts. They do not scan credentials or issue admission.',
        'شاشات الوصول وتسجيل الحضور المعروضة هنا تصوّرات للواجهة. لا تفحص بيانات اعتماد ولا تمنح دخولًا.',
      ),
    },
    {
      id: 'engagement',
      icon: 'people',
      title: text(locale, 'Give every participant a place.', 'امنح كل مشارك مساحته.'),
      description: text(
        locale,
        'An accessible, bilingual experience for the information and interactions that matter.',
        'تجربة ثنائية اللغة وسهلة الوصول للمعلومات والتفاعلات المهمة.',
      ),
      detail: text(
        locale,
        'Our participant experience is being designed around clear schedules, relevant updates, and purposeful connection.',
        'نصمّم تجربة المشارك حول برامج واضحة وتحديثات مناسبة وعلاقات ذات معنى.',
      ),
    },
    {
      id: 'passport',
      icon: 'passport',
      title: text(locale, 'Keep more than a ticket.', 'احتفظ بما يتجاوز التذكرة.'),
      description: text(
        locale,
        'The Event Passport vision: a considered way to carry your event journey beyond the day itself.',
        'رؤية جواز الفعاليات: طريقة مدروسة للاحتفاظ برحلتك بعد انتهاء اليوم.',
      ),
      detail: text(
        locale,
        'Event Passport is a planned capability. The illustrative pass is not a ticket, certificate, or verified attendance record.',
        'جواز الفعاليات ميزة مخططة. البطاقة التوضيحية ليست تذكرة أو شهادة أو سجل حضور موثّقًا.',
      ),
    },
    {
      id: 'follow-through',
      icon: 'connection',
      title: text(locale, 'Let the next chapter happen.', 'افتح المجال للفصل القادم.'),
      description: text(
        locale,
        'A future home for thoughtful follow-up and the relationships an event begins.',
        'مساحة مستقبلية للمتابعة الهادفة والعلاقات التي تبدأها الفعالية.',
      ),
      detail: text(
        locale,
        'The roadmap includes considered post-event communication. No messages, participant analytics, or business metrics are generated by this preview.',
        'تتضمن الخارطة تواصلًا مدروسًا بعد الفعالية. لا تُنشئ هذه المعاينة رسائل أو تحليلات مشاركين أو مؤشرات أعمال.',
      ),
    },
  ] as const;
}

export function faqItems(locale: Locale) {
  return [
    {
      q: text(locale, 'What can I use today?', 'ما الذي يمكنني استخدامه اليوم؟'),
      a: text(
        locale,
        'You can create an account, verify your email, sign in, and manage your profile. You can also explore the public product concepts and prepare a contact brief. Event creation, event registration, ticketing, and check-in are not live.',
        'يمكنك إنشاء حساب وتأكيد البريد وتسجيل الدخول وإدارة ملفك الشخصي. ويمكنك استكشاف تصوّرات المنتج وتجهيز نبذة للتواصل. إنشاء الفعاليات والتسجيل فيها والتذاكر وتسجيل الحضور ليست متاحة فعليًا.',
      ),
    },
    {
      q: text(locale, 'Who is VENTRO being built for?', 'لمن نبني VENTRO؟'),
      a: text(
        locale,
        'Organizers and participants in Jordan and the MENA region, including conferences, workshops, campus communities, and organizational gatherings. These are intended use cases, not customer claims.',
        'للمنظمين والمشاركين في الأردن والمنطقة، بما يشمل المؤتمرات وورش العمل والمجتمعات الجامعية ولقاءات المؤسسات. هذه استخدامات مستهدفة وليست ادعاءات عن عملاء حاليين.',
      ),
    },
    {
      q: text(
        locale,
        'Does VENTRO support Arabic and English?',
        'هل تدعم VENTRO العربية والإنجليزية؟',
      ),
      a: text(
        locale,
        'Yes. This website and its component previews support Arabic RTL and English LTR. Bilingual experiences are also a core part of the product direction.',
        'نعم. يدعم هذا الموقع ومعاينات مكوناته العربية من اليمين إلى اليسار والإنجليزية من اليسار إلى اليمين. التجربة ثنائية اللغة جزء أساسي من توجه المنتج أيضًا.',
      ),
    },
    {
      q: text(locale, 'When will pricing be available?', 'متى ستُعلن الأسعار؟'),
      a: text(
        locale,
        'There are no approved prices yet. The packages shown are proposals, with final prices and inclusions to be announced at launch. No checkout or payment is available.',
        'لا توجد أسعار معتمدة بعد. الباقات المعروضة مقترحة، وسنعلن الأسعار والمزايا النهائية عند الإطلاق. لا تتوفر عمليات شراء أو دفع.',
      ),
    },
    {
      q: text(locale, 'What is an Event Passport?', 'ما هو جواز الفعاليات؟'),
      a: text(
        locale,
        'A planned way to bring your event journey together in one participant experience. Its preview is illustrative and cannot be used for admission or as proof of attendance.',
        'طريقة مخططة لجمع رحلة فعالياتك ضمن تجربة واحدة للمشارك. معاينته توضيحية ولا تصلح للدخول أو لإثبات الحضور.',
      ),
    },
    {
      q: text(
        locale,
        'Can I discover or register for real events here?',
        'هل يمكنني اكتشاف فعاليات حقيقية أو التسجيل فيها هنا؟',
      ),
      a: text(
        locale,
        'Not yet. Explore Events opens a clearly labeled concept gallery. Every event card is illustrative, and none accepts a booking or registration.',
        'ليس بعد. يفتح زر استكشاف الفعاليات معرضًا واضحًا لتصوّرات مقترحة. جميع البطاقات توضيحية ولا تقبل حجزًا أو تسجيلًا.',
      ),
    },
    {
      q: text(locale, 'What happens to a contact brief?', 'ماذا يحدث لنبذة التواصل؟'),
      a: text(
        locale,
        'The brief is prepared in your browser. It is not saved to our backend. You can copy it, or open an email draft when an official contact address is configured; sending remains your choice.',
        'تُجهّز النبذة داخل متصفحك ولا تُحفظ في خادمنا. يمكنك نسخها أو فتح مسودة بريد عندما يُضبط عنوان تواصل رسمي؛ ويبقى الإرسال قرارك.',
      ),
    },
    {
      q: text(locale, 'How can I follow the next steps?', 'كيف أتابع الخطوات القادمة؟'),
      a: text(
        locale,
        'Visit the Contact page to prepare an early-access inquiry. The public preview does not enroll you in a mailing list or claim a launch date.',
        'زر صفحة التواصل لتجهيز استفسار عن الوصول المبكر. لا تسجّلك المعاينة العامة في قائمة بريدية ولا تعلن موعد إطلاق غير معتمد.',
      ),
    },
  ];
}

export function plans(locale: Locale) {
  return [
    {
      id: 'gather',
      name: 'Gather',
      for: text(locale, 'For a focused first gathering', 'للقاء أول واضح الهدف'),
      description: text(
        locale,
        'A proposed starting point for independent organizers.',
        'نقطة بداية مقترحة للمنظمين المستقلين.',
      ),
      items: [
        text(locale, 'A clear event identity', 'هوية واضحة للفعالية'),
        text(locale, 'A considered registration journey', 'رحلة تسجيل مدروسة'),
        text(locale, 'Essential participant information', 'معلومات المشارك الأساسية'),
      ],
    },
    {
      id: 'grow',
      name: 'Grow',
      for: text(locale, 'For teams bringing people together', 'للفرق التي تجمع الناس'),
      description: text(
        locale,
        'A proposed workspace for connected event programs.',
        'مساحة عمل مقترحة لبرامج فعاليات مترابطة.',
      ),
      items: [
        text(locale, 'Collaborative planning concepts', 'تصوّرات للتخطيط التعاوني'),
        text(locale, 'Arrival and engagement experiences', 'تجارب الوصول والتفاعل'),
        text(locale, 'Thoughtful post-event follow-up', 'متابعة مدروسة بعد الفعالية'),
      ],
    },
    {
      id: 'scale',
      name: 'Scale',
      for: text(locale, 'For a wider event ecosystem', 'لمنظومة فعاليات أوسع'),
      description: text(
        locale,
        'A conversation about larger organizational needs.',
        'حوار حول احتياجات المؤسسات الأوسع.',
      ),
      items: [
        text(locale, 'Tailored workflow discussions', 'مناقشة مسارات عمل مخصصة'),
        text(locale, 'Organizational requirements review', 'مراجعة متطلبات المؤسسة'),
        text(locale, 'A considered rollout approach', 'منهج مدروس للإطلاق'),
      ],
    },
  ];
}
