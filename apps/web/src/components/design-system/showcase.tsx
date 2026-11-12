'use client';
import { useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  BrandLogo,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  FormField,
  Icon,
  Input,
  Label,
  Modal,
  MotionSurface,
  Navigation,
  Pagination,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarLink,
  Skeleton,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useToast,
} from '@ventro/ui';
import { useLocale } from '../locale-provider';

function Section({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id + '-title'}
      className="grid min-w-0 gap-6 border-b border-border pb-[var(--section-gap)] last:border-0"
    >
      <div className="flex items-start gap-4">
        <span aria-hidden className="pt-1 font-mono text-xs text-muted-foreground">
          {number}
        </span>
        <div>
          <h2 id={id + '-title'} className="text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const palette = [
  ['Navy', '#101B35'],
  ['Lavender', '#9B8CFF'],
  ['Mint', '#5CE1C6'],
  ['White', '#F6F7FB'],
  ['Slate', '#252B42'],
] as const;
const inventory = [
  ['Button', 'Actions', 'إجراءات'],
  ['Input', 'Forms', 'نماذج'],
  ['Select', 'Forms', 'نماذج'],
  ['Dialog', 'Overlays', 'نوافذ'],
  ['Toast', 'Feedback', 'إشعارات'],
  ['Pagination', 'Navigation', 'تنقّل'],
] as const;

export function DesignSystemShowcase() {
  const { locale, setLocale } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const { notify } = useToast();
  const t = (en: string, ar: string) => (locale === 'ar' ? ar : en);
  const [activeSection, setActiveSection] = useState('brand');
  const [email, setEmail] = useState('preview@ventro.test');
  const [submitted, setSubmitted] = useState(false);
  const [density, setDensity] = useState('comfortable');
  const [radio, setRadio] = useState('standard');
  const [modalOpen, setModalOpen] = useState(false);
  const [previewName, setPreviewName] = useState('VENTRO');
  const [emptyFilled, setEmptyFilled] = useState(false);
  const [errorRecovered, setErrorRecovered] = useState(false);
  const [page, setPage] = useState(1);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const nav = [
    ['brand', t('Brand identity', 'هوية العلامة')],
    ['foundations', t('Foundations', 'الأسس')],
    ['buttons', t('Buttons & badges', 'الأزرار والشارات')],
    ['forms', t('Form controls', 'عناصر النماذج')],
    ['overlays', t('Overlays & tabs', 'النوافذ والتبويبات')],
    ['navigation', t('Navigation', 'التنقّل')],
    ['feedback', t('Feedback & states', 'الإشعارات والحالات')],
    ['data', t('Tables & pagination', 'الجداول والصفحات')],
  ];
  const announce = () =>
    notify({
      title: t('Component activated', 'تم تفعيل العنصر'),
      description: t('This is a local design preview.', 'هذه معاينة محلية للتصميم.'),
    });
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#design-system-main"
        className="ui-focus fixed start-4 top-4 z-[90] -translate-y-24 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:translate-y-0"
      >
        {t('Skip to content', 'انتقل إلى المحتوى')}
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-[var(--page-gutter)] py-4">
          <a href="/" aria-label={t('VENTRO home', 'الرئيسية VENTRO')} className="ui-focus rounded">
            <BrandLogo decorative className="h-8 w-auto sm:h-9" />
          </a>
          <nav
            aria-label={t('Display preferences', 'تفضيلات العرض')}
            className="flex items-center gap-2"
          >
            <Badge className="hidden sm:inline-flex">{t('Development only', 'للتطوير فقط')}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
              lang={locale === 'en' ? 'ar' : 'en'}
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t('Change color theme', 'تغيير مظهر الألوان')}
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              <Icon name="theme" />
            </Button>
          </nav>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] gap-10 px-[var(--page-gutter)] py-8 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-12">
        <Sidebar
          aria-label={t('Design system sidebar', 'الشريط الجانبي لنظام التصميم')}
          className="sticky top-28 hidden h-fit w-full lg:flex"
        >
          <SidebarHeader>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground">
              VENTRO / UI
            </p>
            <p className="mt-2 font-display text-sm font-semibold">
              {t('Interface library', 'مكتبة الواجهات')}
            </p>
          </SidebarHeader>
          <SidebarContent>
            <nav aria-label={t('Component sections', 'أقسام المكونات')}>
              <ul className="grid gap-1">
                {nav.map(([id, label]) => (
                  <li key={id}>
                    <SidebarLink
                      href={'#' + id}
                      active={activeSection === id}
                      aria-current={activeSection === id ? 'location' : undefined}
                      onClick={() => setActiveSection(id!)}
                    >
                      {label}
                    </SidebarLink>
                  </li>
                ))}
              </ul>
            </nav>
          </SidebarContent>
          <SidebarFooter>
            {t('Shared components. Consistent experiences.', 'مكونات مشتركة، وتجارب متناسقة.')}
          </SidebarFooter>
        </Sidebar>
        <main id="design-system-main" className="grid min-w-0 gap-[var(--section-gap)]">
          <div>
            <Breadcrumbs
              label={t('Breadcrumb', 'مسار التنقّل')}
              items={[
                { label: 'VENTRO', href: '/' },
                { label: t('Development', 'التطوير'), href: '/dev/design-system' },
                { label: t('Design system', 'نظام التصميم') },
              ]}
            />
            <div className="mt-6 flex items-center gap-3">
              <span aria-hidden className="h-px w-8 bg-accent" />
              <p className="text-xs font-semibold tracking-[0.15em] text-accent-foreground">
                VENTRO DESIGN SYSTEM
              </p>
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {t('One language. Every interface.', 'لغة واحدة لكل واجهة.')}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground">
              {t(
                'The visual foundations and reusable components of VENTRO. All examples on this page are local interface demonstrations, with no customer or event data.',
                'الأسس البصرية والمكونات القابلة لإعادة الاستخدام في VENTRO. كل الأمثلة هنا معاينات محلية للواجهة، دون بيانات عملاء أو فعاليات.',
              )}
            </p>
            <details className="mt-6 rounded-xl border border-border bg-card p-4 lg:hidden">
              <summary className="ui-focus cursor-pointer rounded text-sm font-medium">
                {t('Browse components', 'تصفّح المكونات')}
              </summary>
              <Navigation
                className="mt-3"
                label={t('Mobile component sections', 'أقسام المكونات للموبايل')}
                items={nav.map(([id, label]) => ({ href: '#' + id, label: label! }))}
              />
            </details>
          </div>

          <Section
            id="brand"
            number="01"
            title={t('Brand identity', 'هوية العلامة')}
            description={t(
              'An original geometric V. Two paths connect at a shared point; a forward fragment carries the movement beyond it.',
              'حرف V هندسي أصلي. مساران يلتقيان في نقطة مشتركة، وجزء متقدّم يحمل الحركة إلى ما بعدها.',
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border bg-white p-8 text-[#101B35]">
                <BrandLogo className="h-auto w-full max-w-80" label="VENTRO — light surface" />
              </div>
              <div className="flex min-h-48 items-center justify-center rounded-2xl bg-[#101B35] p-8 text-[#F6F7FB]">
                <BrandLogo className="h-auto w-full max-w-80" label="VENTRO — dark surface" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-card p-6">
              <BrandLogo variant="symbol" className="size-16" />
              <img
                src="/brand/app-icon.svg"
                alt={t('VENTRO app icon', 'أيقونة تطبيق VENTRO')}
                width={64}
                height={64}
              />
              <div>
                <p lang="en" dir="ltr" className="font-display font-semibold">
                  Every Event. Beyond the Moment.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(
                    'Original vector assets. No font dependency in the wordmark.',
                    'ملفات متجهة أصلية. رسم اسم العلامة لا يعتمد على توفر الخطوط.',
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['logo-on-light.svg', t('Horizontal · light', 'أفقي · فاتح')],
                ['logo-on-dark.svg', t('Horizontal · dark', 'أفقي · داكن')],
                ['symbol-on-light.svg', t('Symbol', 'الرمز')],
                ['favicon.svg', t('Favicon', 'أيقونة المتصفح')],
                ['app-icon.svg', t('App icon', 'أيقونة التطبيق')],
              ].map(([file, label]) => (
                <Button asChild variant="outline" size="sm" key={file}>
                  <a href={'/brand/' + file} download>
                    {label}
                    <span aria-hidden>↓</span>
                  </a>
                </Button>
              ))}
            </div>
          </Section>

          <Section
            id="foundations"
            number="02"
            title={t('Foundations', 'الأسس')}
            description={t(
              'Brand colors stay constant. Semantic colors adapt to the theme and preserve readable text and visible controls.',
              'ألوان العلامة ثابتة. تتكيّف الألوان الدلالية مع المظهر لتحافظ على وضوح النصوص وعناصر التحكم.',
            )}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {palette.map(([name, hex]) => (
                <div key={name} className="overflow-hidden rounded-xl border border-border bg-card">
                  <div aria-hidden className="h-20" style={{ background: hex }} />
                  <div className="p-3">
                    <p className="text-xs font-semibold">{name}</p>
                    <p dir="ltr" className="mt-1 font-mono text-xs text-muted-foreground">
                      {hex}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Plus Jakarta Sans', 'var(--font-heading-family)', 'Every event.'],
                ['Inter', "'Inter Variable', sans-serif", 'Clear by design.'],
                [
                  'IBM Plex Sans Arabic',
                  "'IBM Plex Sans Arabic', sans-serif",
                  'أثر يتجاوز اللحظة.',
                ],
              ].map(([name, family, sample]) => (
                <Card key={name}>
                  <CardHeader>
                    <CardDescription>{name}</CardDescription>
                    <p
                      className="text-2xl font-semibold leading-relaxed"
                      style={{ fontFamily: family }}
                      lang={name === 'IBM Plex Sans Arabic' ? 'ar' : 'en'}
                    >
                      {sample}
                    </p>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t('Space, shape, and focus', 'المساحة والشكل والتركيز')}</CardTitle>
                <CardDescription>
                  {t(
                    'A 4px spacing rhythm, responsive page gutters, three-pixel focus outlines, and restrained elevation. Motion follows the user’s reduced-motion preference.',
                    'إيقاع مسافات أساسه ٤ بكسل، وهوامش متجاوبة، وحدود تركيز بسماكة ٣ بكسل، وظلال هادئة. تتبع الحركة تفضيل المستخدم لتقليلها.',
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  {[1, 2, 3, 4, 6, 8].map((value) => (
                    <div key={value} className="grid justify-items-center gap-2">
                      <span
                        aria-hidden
                        className="rounded bg-accent/30"
                        style={{ width: value * 4, height: value * 4 }}
                      />
                      <span className="font-mono text-xs text-muted-foreground">{value * 4}px</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="buttons"
            number="03"
            title={t('Buttons & badges', 'الأزرار والشارات')}
            description={t(
              'Clear hierarchy, visible focus, and disabled states. Try each action to send a preview notification.',
              'تسلسل واضح، وتركيز مرئي، وحالات تعطيل. جرّب كل إجراء لإرسال إشعار معاينة.',
            )}
          >
            <Card>
              <CardContent className="grid gap-6 pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  {(
                    ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const
                  ).map((variant) => (
                    <MotionSurface className="inline-flex" key={variant}>
                      <Button variant={variant} onClick={announce}>
                        {
                          {
                            default: t('Primary', 'أساسي'),
                            secondary: t('Secondary', 'ثانوي'),
                            outline: t('Outline', 'محدد'),
                            ghost: t('Ghost', 'هادئ'),
                            destructive: t('Destructive', 'تحذيري'),
                            link: t('Link', 'رابط'),
                          }[variant]
                        }
                      </Button>
                    </MotionSurface>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" onClick={announce}>
                    {t('Small', 'صغير')}
                  </Button>
                  <Button size="lg" onClick={announce}>
                    {t('Large', 'كبير')}
                  </Button>
                  <Button variant="outline" disabled>
                    {t('Disabled', 'معطّل')}
                  </Button>
                  <Button disabled aria-busy="true">
                    {t('Loading…', 'جارٍ التحميل…')}
                  </Button>
                  <Button id="focus-demo" variant="outline" onClick={announce}>
                    {t('Keyboard focus', 'تركيز لوحة المفاتيح')}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{t('Neutral', 'محايد')}</Badge>
                  <Badge variant="accent">{t('Accent', 'مميّز')}</Badge>
                  <Badge variant="success">{t('Success', 'نجاح')}</Badge>
                  <Badge variant="warning">{t('Warning', 'تنبيه')}</Badge>
                  <Badge variant="danger">{t('Error', 'خطأ')}</Badge>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="forms"
            number="04"
            title={t('Form controls', 'عناصر النماذج')}
            description={t(
              'Labels, helper text, and validation messages stay connected to their controls. These examples validate locally and never submit data to a server.',
              'ترتبط التسميات والنصوص المساعدة ورسائل التحقق بعناصرها. تتحقق هذه الأمثلة محليًا ولا ترسل بيانات إلى خادم.',
            )}
          >
            <div className="grid gap-5 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('Inputs & field wrappers', 'المدخلات وأغلفة الحقول')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    noValidate
                    className="grid gap-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setSubmitted(true);
                      if (emailValid)
                        notify({
                          title: t('Example validated locally', 'تم التحقق من المثال محليًا'),
                          description: t('No data was sent.', 'لم يتم إرسال بيانات.'),
                          variant: 'success',
                        });
                    }}
                  >
                    <FormField
                      label={t('Preview email', 'بريد المعاينة')}
                      description={t(
                        'Used only to demonstrate field validation.',
                        'يُستخدم فقط لإظهار التحقق من الحقول.',
                      )}
                      error={
                        submitted && !emailValid
                          ? t('Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صالحًا.')
                          : undefined
                      }
                      required
                    >
                      <Input
                        type="email"
                        autoComplete="off"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </FormField>
                    <FormField label={t('Preview notes', 'ملاحظات المعاينة')}>
                      <Textarea placeholder={t('Write a sample note…', 'اكتب ملاحظة تجريبية…')} />
                    </FormField>
                    <FormField label={t('Disabled input', 'حقل معطّل')}>
                      <Input
                        value={t('Read-only preview', 'معاينة غير قابلة للتعديل')}
                        disabled
                        readOnly
                      />
                    </FormField>
                    <Button type="submit" className="justify-self-start">
                      {t('Validate example', 'تحقّق من المثال')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('Selection controls', 'عناصر الاختيار')}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <Select value={density} onValueChange={setDensity}>
                    <FormField
                      label={t('Spacing preference', 'تفضيل المسافات')}
                      description={t(
                        'Changes the table’s row spacing below.',
                        'يغيّر مسافات صفوف الجدول أدناه.',
                      )}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormField>
                    <SelectContent>
                      <SelectItem value="comfortable">{t('Comfortable', 'مريح')}</SelectItem>
                      <SelectItem value="compact">{t('Compact', 'مضغوط')}</SelectItem>
                      <SelectItem value="unavailable" disabled>
                        {t('Unavailable option', 'خيار غير متاح')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="grid gap-4">
                    <div className="flex min-h-8 items-center gap-3">
                      <Checkbox id="preview-checkbox" defaultChecked />
                      <Label htmlFor="preview-checkbox">
                        {t('Enable example preference', 'تفعيل تفضيل تجريبي')}
                      </Label>
                    </div>
                    <div className="flex min-h-8 items-center gap-3">
                      <Checkbox id="preview-mixed" checked="indeterminate" />
                      <Label htmlFor="preview-mixed">
                        {t('Mixed selection example', 'مثال اختيار جزئي')}
                      </Label>
                    </div>
                    <div className="flex min-h-8 items-center gap-3">
                      <Checkbox id="preview-disabled" disabled />
                      <Label htmlFor="preview-disabled" className="text-muted-foreground">
                        {t('Disabled checkbox', 'مربع اختيار معطّل')}
                      </Label>
                    </div>
                  </div>
                  <fieldset className="grid gap-3">
                    <legend className="mb-3 text-sm font-medium">
                      {t('Interface style', 'أسلوب الواجهة')}
                    </legend>
                    <RadioGroup
                      value={radio}
                      onValueChange={setRadio}
                      aria-label={t('Interface style', 'أسلوب الواجهة')}
                    >
                      {[
                        ['standard', t('Standard', 'قياسي')],
                        ['minimal', t('Minimal', 'مبسّط')],
                      ].map(([value, label]) => (
                        <div key={value} className="flex min-h-8 items-center gap-3">
                          <RadioGroupItem value={value!} id={'radio-' + value} />
                          <Label htmlFor={'radio-' + value}>{label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </fieldset>
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section
            id="overlays"
            number="05"
            title={t('Overlays & tabs', 'النوافذ والتبويبات')}
            description={t(
              'Focus is contained in modal windows and returned to the trigger on close. Menus, selects, and tabs support the keyboard and reading direction.',
              'يبقى التركيز داخل النوافذ المنبثقة ويعود إلى زر فتحها عند الإغلاق. تدعم القوائم والاختيارات والتبويبات لوحة المفاتيح واتجاه القراءة.',
            )}
          >
            <Card>
              <CardContent className="flex flex-wrap items-center gap-3 pt-6">
                <Modal
                  open={modalOpen}
                  onOpenChange={setModalOpen}
                  title={t('Example modal', 'نافذة تجريبية')}
                  description={t(
                    'Edit a local preview label. No backend action is performed.',
                    'عدّل تسمية معاينة محلية. لا يتم تنفيذ إجراء على الخادم.',
                  )}
                  closeLabel={t('Close modal', 'إغلاق النافذة')}
                  trigger={<Button>{t('Open modal', 'فتح نافذة')}</Button>}
                  footer={
                    <>
                      <Button variant="outline" onClick={() => setModalOpen(false)}>
                        {t('Cancel', 'إلغاء')}
                      </Button>
                      <Button
                        onClick={() => {
                          setModalOpen(false);
                          notify({
                            title: t('Local example updated', 'تم تحديث المثال محليًا'),
                            description: previewName,
                            variant: 'success',
                          });
                        }}
                      >
                        {t('Apply preview', 'تطبيق المعاينة')}
                      </Button>
                    </>
                  }
                >
                  <FormField label={t('Preview name', 'اسم المعاينة')}>
                    <Input
                      value={previewName}
                      onChange={(event) => setPreviewName(event.target.value)}
                    />
                  </FormField>
                </Modal>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">{t('Open dialog', 'فتح حوار')}</Button>
                  </DialogTrigger>
                  <DialogContent closeLabel={t('Close dialog', 'إغلاق الحوار')}>
                    <DialogHeader>
                      <DialogTitle>{t('Dialog anatomy', 'بنية الحوار')}</DialogTitle>
                      <DialogDescription>
                        {t(
                          'A title, description, content, and clear closing action.',
                          'عنوان ووصف ومحتوى وإجراء واضح للإغلاق.',
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <p className="text-sm leading-7">
                      {t(
                        'Press Escape to close, or use the button below.',
                        'اضغط Escape للإغلاق، أو استخدم الزر أدناه.',
                      )}
                    </p>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button>{t('Done', 'تم')}</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">{t('Open confirmation', 'فتح تأكيد')}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>
                      {t('Confirm this preview?', 'تأكيد هذه المعاينة؟')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        'This demonstrates an explicit confirmation. Nothing is deleted or saved.',
                        'يعرض هذا المثال تأكيدًا صريحًا. لن يُحذف أو يُحفظ شيء.',
                      )}
                    </AlertDialogDescription>
                    <DialogFooter>
                      <AlertDialogCancel>{t('Cancel', 'إلغاء')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          notify({ title: t('Preview confirmed', 'تم تأكيد المعاينة') })
                        }
                      >
                        {t('Confirm preview', 'تأكيد المعاينة')}
                      </AlertDialogAction>
                    </DialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      {t('Open menu', 'فتح القائمة')}
                      <Icon name="down" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>{t('Theme actions', 'إجراءات المظهر')}</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setTheme('light')}>
                      {t('Light theme', 'مظهر فاتح')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setTheme('dark')}>
                      {t('Dark theme', 'مظهر داكن')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>{t('Disabled item', 'عنصر معطّل')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost">
                      <Icon name="info" />
                      {t('About tooltips', 'عن التلميحات')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t(
                      'Shown on keyboard focus or hover.',
                      'يظهر عند التركيز بلوحة المفاتيح أو مرور المؤشر.',
                    )}
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="overview">
                  <TabsList aria-label={t('Example tabs', 'تبويبات تجريبية')}>
                    <TabsTrigger value="overview">{t('Overview', 'نظرة عامة')}</TabsTrigger>
                    <TabsTrigger value="accessibility">
                      {t('Accessibility', 'إمكانية الوصول')}
                    </TabsTrigger>
                    <TabsTrigger value="disabled" disabled>
                      {t('Disabled', 'معطّل')}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview">
                    {t(
                      'Shared components create a familiar experience across every VENTRO interface.',
                      'تصنع المكونات المشتركة تجربة مألوفة في جميع واجهات VENTRO.',
                    )}
                  </TabsContent>
                  <TabsContent value="accessibility">
                    {t(
                      'Use Tab to move between controls. Use arrow keys inside tabs, radio groups, menus, and selects.',
                      'استخدم Tab للتنقّل بين عناصر التحكم، والأسهم داخل التبويبات ومجموعات الاختيار والقوائم.',
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="navigation"
            number="06"
            title={t('Navigation', 'التنقّل')}
            description={t(
              'Breadcrumbs describe location. Navigation and sidebar links connect to real sections in this preview.',
              'يوضح مسار التنقّل الموقع الحالي. تصل روابط التنقّل والشريط الجانبي إلى أقسام فعلية في هذه المعاينة.',
            )}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('Navigation example', 'مثال التنقّل')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                <Breadcrumbs
                  label={t('Example breadcrumb', 'مسار تنقّل تجريبي')}
                  items={[
                    { label: 'VENTRO', href: '/' },
                    { label: t('Design system', 'نظام التصميم'), href: '/dev/design-system' },
                    { label: t('Navigation', 'التنقّل') },
                  ]}
                />
                <Navigation
                  label={t('Example section navigation', 'تنقّل الأقسام التجريبي')}
                  items={[
                    { href: '#brand', label: t('Brand', 'العلامة') },
                    { href: '#forms', label: t('Forms', 'النماذج') },
                    { href: '#feedback', label: t('Feedback', 'الإشعارات') },
                  ]}
                />
              </CardContent>
              <CardFooter>
                <p className="text-xs leading-6 text-muted-foreground">
                  {t(
                    'The documentation sidebar becomes a native disclosure menu on smaller screens.',
                    'يتحول الشريط الجانبي إلى قائمة قابلة للفتح على الشاشات الأصغر.',
                  )}
                </p>
              </CardFooter>
            </Card>
          </Section>

          <Section
            id="feedback"
            number="07"
            title={t('Feedback & states', 'الإشعارات والحالات')}
            description={t(
              'Loading, empty, error, and success states are first-class components. Recovery actions below change only local preview state.',
              'التحميل والفراغ والخطأ والنجاح حالات أساسية. تغيّر إجراءات الاستعادة أدناه حالة المعاينة المحلية فقط.',
            )}
          >
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  notify({
                    title: t('Preview notification', 'إشعار معاينة'),
                    description: t(
                      'Focus and hover pause the timeout.',
                      'يوقف التركيز ومرور المؤشر مؤقت الإغلاق.',
                    ),
                  })
                }
              >
                {t('Show toast', 'عرض إشعار')}
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  notify({
                    title: t('Success example', 'مثال نجاح'),
                    description: t('This is a local preview.', 'هذه معاينة محلية.'),
                    variant: 'success',
                  })
                }
              >
                {t('Success toast', 'إشعار نجاح')}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  notify({
                    title: t('Error example', 'مثال خطأ'),
                    description: t(
                      'Dismiss this notification when ready.',
                      'أغلق هذا الإشعار عندما تكون جاهزًا.',
                    ),
                    variant: 'danger',
                  })
                }
              >
                {t('Error toast', 'إشعار خطأ')}
              </Button>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {emptyFilled ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('Example item added', 'تمت إضافة عنصر تجريبي')}</CardTitle>
                    <CardDescription>
                      {t(
                        'This item exists only in this component preview.',
                        'هذا العنصر موجود في معاينة المكون فقط.',
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="outline" onClick={() => setEmptyFilled(false)}>
                      {t('Reset empty state', 'إعادة حالة الفراغ')}
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <EmptyState
                  title={t('No example items', 'لا توجد عناصر تجريبية')}
                  description={t(
                    'An empty state explains what can happen next.',
                    'تشرح حالة الفراغ ما يمكن فعله لاحقًا.',
                  )}
                  action={
                    <Button variant="outline" onClick={() => setEmptyFilled(true)}>
                      {t('Add example', 'إضافة مثال')}
                    </Button>
                  }
                />
              )}
              {errorRecovered ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('Preview recovered', 'تمت استعادة المعاينة')}</CardTitle>
                    <Badge variant="success">{t('Success', 'نجاح')}</Badge>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="outline" onClick={() => setErrorRecovered(false)}>
                      {t('Reset error state', 'إعادة حالة الخطأ')}
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <ErrorState
                  title={t('Example could not load', 'تعذّر تحميل المثال')}
                  description={t(
                    'Describe the problem and offer a clear recovery action.',
                    'اشرح المشكلة وقدّم إجراءً واضحًا للاستعادة.',
                  )}
                  action={
                    <Button variant="outline" onClick={() => setErrorRecovered(true)}>
                      {t('Retry example', 'إعادة محاولة المثال')}
                    </Button>
                  }
                />
              )}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t('Skeleton loader', 'هيكل التحميل')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div role="status" aria-label={t('Loading preview', 'تحميل المعاينة')}>
                  <span className="sr-only">
                    {t('Loading preview content', 'جارٍ تحميل محتوى المعاينة')}
                  </span>
                  <div className="flex items-center gap-4">
                    <Skeleton className="size-12 shrink-0 rounded-full" />
                    <div className="grid w-full max-w-sm gap-3">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="data"
            number="08"
            title={t('Tables & pagination', 'الجداول والصفحات')}
            description={t(
              'A responsive excerpt of the component inventory. The table scrolls within its container and pagination updates the visible rows.',
              'مقتطف متجاوب من قائمة المكونات. يُمرّر الجدول داخل حاويته، وتحدّث أزرار الصفحات الصفوف الظاهرة.',
            )}
          >
            <Table
              scrollLabel={t('Component inventory table', 'جدول قائمة المكونات')}
              className="min-w-[460px]"
            >
              <TableCaption>
                {t(
                  'Component inventory excerpt · two rows per page.',
                  'مقتطف من قائمة المكونات · صفّان لكل صفحة.',
                )}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Component', 'المكون')}</TableHead>
                  <TableHead>{t('Category', 'الفئة')}</TableHead>
                  <TableHead>{t('Status', 'الحالة')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.slice((page - 1) * 2, page * 2).map(([name, en, ar]) => (
                  <TableRow key={name}>
                    <TableCell className={density === 'compact' ? 'py-2' : undefined}>
                      <span lang="en" className="font-medium">
                        {name}
                      </span>
                    </TableCell>
                    <TableCell className={density === 'compact' ? 'py-2' : undefined}>
                      {t(en, ar)}
                    </TableCell>
                    <TableCell className={density === 'compact' ? 'py-2' : undefined}>
                      <Badge variant="success">{t('Available', 'متاح')}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              pageCount={Math.ceil(inventory.length / 2)}
              onPageChange={setPage}
              labels={{
                navigation: t('Component pages', 'صفحات المكونات'),
                previous: t('Previous page', 'الصفحة السابقة'),
                next: t('Next page', 'الصفحة التالية'),
                page: (value) => t('Page ' + value, 'الصفحة ' + value),
                more: t('More pages', 'صفحات إضافية'),
                empty: t('No pages', 'لا توجد صفحات'),
              }}
            />
          </Section>
          <footer className="pb-6 text-xs leading-7 text-muted-foreground">
            <bdi lang="en" dir="ltr">
              VENTRO — Every Event. Beyond the Moment.
            </bdi>
            <br />
            {t(
              'Design system preview only. No marketing or business features.',
              'معاينة نظام التصميم فقط. لا توجد ميزات تسويقية أو تجارية.',
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}
