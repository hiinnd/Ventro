# VENTRO design system

Brand: **VENTRO — Every Event. Beyond the Moment.**

## Preview and exports

Start `pnpm dev` and open **http://127.0.0.1:3000/dev/design-system**. A narrow server Proxy guard returns 404 before rendering outside `NODE_ENV=development`, with a second guard in the page. It cannot be enabled in production through a feature flag. Examples are local component demonstrations, with no event/customer data or backend mutations.

Original SVG assets live in `apps/web/public/brand`:

| File                                        | Use                                       |
| ------------------------------------------- | ----------------------------------------- |
| `logo-on-light.svg`, `logo-on-dark.svg`     | Horizontal lockups on their named surface |
| `symbol-on-light.svg`, `symbol-on-dark.svg` | Standalone geometric mark                 |
| `logo-mono-light.svg`, `logo-mono-dark.svg` | Single-color reproduction                 |
| `favicon.svg`                               | Browser icon on a navy tile               |
| `app-icon.svg`                              | 512-unit app icon                         |

Both the mark and the VENTRO wordmark are original path geometry; SVG exports contain no raster image, external font, or script. `packages/ui/src/brand-geometry.ts` is the source used by `BrandLogo` and `pnpm brand:generate`. `pnpm brand:check` detects exports that differ from that source.

The V joins two arms at a common point. A mint fragment continues the right arm upward to convey connection and movement. Keep clear space of at least one quarter of the symbol width. Use horizontal logos at 124px or wider and the symbol at 24px or wider; the dedicated favicon is suitable for smaller browser slots. Preserve proportions and use the provided surface variations without stretching, gradients, or decorative effects.

## Typography and tokens

- **Plus Jakarta Sans Variable**: Latin headings.
- **Inter Variable**: Latin body text and controls.
- **IBM Plex Sans Arabic**: Arabic headings, body text, and controls.

Fontsource packages provide locally bundled WOFF2 files with `font-display: swap`; no font CDN is contacted at runtime. Their licenses remain distributed in their packages. The wordmark itself is independent of these fonts.

The palette remains Navy `#101B35`, Lavender `#9B8CFF`, Mint `#5CE1C6`, White `#F6F7FB`, and Slate `#252B42`. `packages/ui/src/tokens.css` defines semantic light/dark colors, font families, spacing, responsive gutters, radii, elevation, and motion timing. Text accents use a darker lavender in light mode to preserve contrast. The palette lavender and mint remain available for brand geometry and surfaces.

| Semantic pair                    | Light contrast | Dark contrast |
| -------------------------------- | -------------- | ------------- |
| Body text / background           | 15.95:1        | 17.42:1       |
| Muted text / card                | 5.93:1         | 8.48:1        |
| Accent text / background or card | 6.31:1         | 8.32:1        |
| Input boundary / card            | 3.13:1         | 4.43:1        |

These ratios describe the specified token pairs, not every possible consumer composition. Browser audits test the rendered showcase; consumers must preserve semantic foreground/background combinations.

Spacing follows a 4px rhythm. Page gutters use `clamp(1rem, 4vw, 3rem)` and section spacing uses `clamp(2rem, 5vw, 4rem)`. Interactive focus uses a 3px outline with a 3px offset. MotionSurface offers an optional 1px hover lift and a small press response; it disables these transforms under reduced motion. Global MotionConfig respects the user's preference, and skeletons disable pulsing in that mode.

## Components

Import from `@ventro/ui`. The application imports `@ventro/ui/tokens.css` and maps semantic tokens into Tailwind utilities.

| Group      | Exports                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand      | `BrandLogo`, `Icon`                                                                                                                               |
| Actions    | `Button`, `MotionSurface`                                                                                                                         |
| Fields     | `Input`, `Textarea`, `Label`, `FormField`                                                                                                         |
| Selection  | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `Checkbox`, `RadioGroup`, `RadioGroupItem` |
| Content    | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `Badge`                                                        |
| Overlays   | `Modal`, compound `Dialog*`, compound `AlertDialog*`, compound `DropdownMenu*`, compound `Tooltip*`                                               |
| Tabs       | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                                                                                                  |
| Data       | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`                                                         |
| Feedback   | `ToastProvider`, `useToast`, `Skeleton`, `EmptyState`, `ErrorState`                                                                               |
| Navigation | `Navigation`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarLink`, `Breadcrumbs`, `Pagination`                           |
| Direction  | `DirectionProvider`                                                                                                                               |

`Button` retains the Phase 1 API and adds secondary, destructive, and link variants plus large/icon sizes. Set `type="submit"` deliberately in forms; icon-only controls require an accessible name. `asChild` composes one link or trigger without nested interactive elements.

`FormField` associates one direct control with a label, description, required semantics, and error message:

```tsx
<FormField label="Email" description="Used for notifications" error={error} required>
  <Input type="email" value={email} onChange={onChange} required />
</FormField>
```

Its child must forward `id` and ARIA props, as the shared controls do. `FormField` does not replace server validation. Use `Select` outside the field and place its `SelectTrigger` directly inside the field. Supply explicit labels to checkboxes, radio groups, tooltips, navigation, pagination, and table scroll regions.

`Modal` requires title, description, and a localized close label. Compound dialogs must include a title and description. Radix handles focus containment, Escape, restoration to the trigger, outside interaction, roving focus, and appropriate roles. Confirmation dialogs focus Cancel and require explicit confirmation.

`useToast().notify({ title, description, variant })` displays an accessible notification. Normal/success notifications expire after 5.5 seconds and pause on hover/focus; error notifications require dismissal. The viewport supports Radix's F8 keyboard shortcut and shows at most five notifications. Critical application errors should also remain visible in their relevant page or form.

`Pagination` is controlled with `page`, `pageCount`, `onPageChange`, and localized `labels`. Zero pages renders its empty label. Native table semantics remain intact inside a focusable, labeled horizontal scroll region. The showcase sidebar becomes a native disclosure menu on small screens.

## Theme, direction, and verification

The existing `next-themes` provider handles light/dark/system preferences. `LocaleProvider` owns English/Arabic preference, document `lang`/`dir`, Radix direction, and localized notification labels. Public `/en` and `/ar` URLs supply an initial server locale and override stored language preferences; the development showcase still uses its local preference controls. Logical spacing (`start`, `end`, `ps`, `pe`) supports RTL, including portaled overlays. UI text remains explicit and localizable; components do not depend on a business translation service.

```sh
pnpm brand:check
pnpm check
pnpm test:ui
```

On Windows, the browser configuration uses installed Chrome when available. Elsewhere, install Chromium once with `pnpm --filter @ventro/web exec playwright install chromium`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` may point to another compatible local installation. Run `pnpm infra:up` and `pnpm db:deploy` before the complete UI suite; it builds and starts/reuses the API and development frontend. Stop any production frontend on port 3000 first. Authentication browser tests require real PostgreSQL, Redis, and Mailpit, and remove only their own uniquely named local `.test` users.

Playwright exercises both languages and themes, desktop/mobile layout, local validation, keyboard selection, focus containment/restoration, confirmation dialogs, menus, tabs, tooltips, feedback recovery, pagination, font loading, SVG exports, and reduced motion. The marketing suite additionally covers all eighteen public URLs, metadata/link integrity, responsive photography, preview tabs, concept filters/dialogs, mobile navigation, FAQ search, and actual clipboard output without contact submission. Axe scans rendered pages and dialogs for WCAG A/AA violations. These checks complement manual visual inspection; they do not constitute a universal accessibility certification. Production smoke checks assert that both development routes are inaccessible in production.

To run the marketing browser tests against an already-running production frontend, set `PLAYWRIGHT_PRODUCTION=1` and run `pnpm --filter @ventro/web test:ui marketing.spec.ts`. This skips automatic development-server startup. The design-system tests require development mode and must not be included in that command.
