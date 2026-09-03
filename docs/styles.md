# Frontend style guide

This guide describes the styling conventions used by the components in `src`. Use it as the default for new Astro and React components. It is based on the current layouts, pages, global styles, and all non-test components under `src/components`.

## Styling stack

- Tailwind CSS v4 provides utility classes through `@import "tailwindcss"` in `src/styles/global.css`.
- `tailwind-animations` provides animation utilities.
- Webcore UI supplies modal, toast, and tooltip primitives. Its theme is mapped to the app palette in `src/styles/webcore-setup.scss`.
- Astro components use `class`; React components use `className`.
- `tailwind-merge` is available when a reusable React component needs to combine defaults with a caller's `className`.
- Iconoir is the icon family. Astro uses `astro-icon/components`; React uses `@iconify/react`.

The global stylesheets are imported by `BaseLayout.astro` and `DetailLayout.astro`. Pages should use one of those layouts rather than importing the styles again.

## Design direction

CashDial uses a restrained zinc palette over a subtle fixed gradient, with translucent surfaces and strong semantic colors for financial meaning. The UI is mobile-first, compact, and content-led.

Prefer utility classes and the shared component classes below. Add global CSS only for a genuinely reusable primitive, a pseudo-element, or behavior that utilities cannot express cleanly. Do not add component-scoped `<style>` blocks for ordinary spacing, color, or layout.

## Theme and color

Dark mode is class-based. The `dark` class lives on `<html>` and the custom Tailwind variant is declared as:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Every new visible surface, border, and explicit text color must work in both themes.

### Neutral palette

Use zinc throughout the application:

| Role | Light | Dark |
| --- | --- | --- |
| Page background | `bg-zinc-50` | `dark:bg-zinc-950` |
| Primary text | `text-zinc-950` | `dark:text-zinc-100` |
| Secondary text | `text-zinc-700` | `dark:text-zinc-300` |
| Muted text | `text-zinc-500` | `dark:text-zinc-400` when more contrast is needed |
| Soft border | `border-zinc-200` | `dark:border-zinc-800` |
| Control border | `border-zinc-300` or `border-zinc-400` | `dark:border-zinc-700` or `dark:border-zinc-600` |
| Hover fill | `hover:bg-zinc-200/60` | `dark:hover:bg-zinc-800/60` |

For text that should simply recede relative to its parent, `opacity-70` is also common. Prefer explicit zinc colors when contrast is important or the parent may have a colored foreground.

### Semantic palette

Use color to communicate meaning consistently:

| Meaning | Light | Dark |
| --- | --- | --- |
| Income, success, confirm | `green-600` or `emerald-600` | `green-400` or `emerald-400` |
| Expense, error, destructive | `red-600` | `red-400` |
| Information, link, selected | `blue-600` | `blue-400` |
| Warning, pending, due | `amber-600` | `amber-400` |

Use `green` for existing form actions and `AmountText`; some statistics use `emerald` for positive values. Within one component or feature, do not mix the two greens for the same meaning. Prefer `amber`, not `yellow`, for new warning states.

Do not rely on color alone. Pair a semantic color with a label, icon, status text, or other visible cue.

### Data-driven colors

Category colors and chart colors may use inline styles because their values come from data:

```tsx
<span className="size-3 rounded-full" style={{ backgroundColor: category.color }} />
```

Keep layout, sizing, borders, and typography in Tailwind classes. Provide a safe fallback for missing colors and ensure foreground contrast, as `SquareIcon` does with white icon text.

## Shared surface classes

These classes live in the `components` layer of `src/styles/global.css` and are the preferred building blocks.

### `glass-surface`

The standard card or content panel: translucent, bordered, blurred, and lightly elevated in light mode.

```html
<section class="glass-surface rounded-xl p-4 sm:p-5">...</section>
```

Use it for cards, summaries, information panels, list containers, and empty states. The normal card radius is `rounded-xl`; compact nested panels may use `rounded-lg` or `rounded-md`.

### `glass-elevated`

A more prominent surface with a stronger dark-mode fill. Use it for modals, sticky headers, and overlays.

```html
<header class="glass-elevated sticky top-0 z-40 ...">...</header>
```

### `glass-control`

The quieter surface for interactive controls or panels nested inside cards.

```html
<fieldset class="glass-control flex rounded-lg">...</fieldset>
```

Use it for selectors, segmented controls, filter controls, and small metric panels. Native text inputs, selects, and textareas already receive matching colors from the global base layer.

### `focus-ring`

Apply this to custom interactive elements:

```html
<button class="focus-ring min-h-11 rounded-lg ...">...</button>
```

It supplies a theme-aware `focus-visible` ring and offset. Do not remove focus outlines without replacing them with this class or an equally visible treatment.

### Other global helpers

- `gradient-bg` belongs on the outer application shell, not individual components.
- `app-toast` controls Webcore toast visibility through `data-show="true"`.

## Layout and responsive behavior

Build mobile-first. Base classes describe the smallest viewport; enhance with `sm:`, `md:`, `lg:`, and occasionally `xl:`.

- General pages use `BaseLayout` and a content width of `max-w-5xl`.
- Detail pages use `DetailLayout` and `max-w-3xl`.
- Page gutters are `px-4`, then `sm:px-6`, then `lg:px-8`.
- Page vertical spacing is `py-6 sm:py-8`.
- Common gaps are `gap-2` for tight controls, `gap-3` or `gap-4` for component content, and `gap-6` for major columns.
- Stack actions on narrow screens and align them horizontally at `sm` where space permits: `flex flex-col-reverse gap-3 sm:flex-row sm:justify-end`.
- Start grids at one column and add columns responsively, for example `grid gap-4 sm:grid-cols-2`.
- Use `min-w-0` on grid/flex children that contain variable text, plus `truncate`, `break-words`, or `line-clamp-*` according to the desired behavior.
- Use `shrink-0` for icons, badges, and fixed action areas.
- Prefer `min-h-dvh` for viewport shells and `max-h-[calc(100dvh-2rem)]` for modal content.

Use the shared `SectionHeader` for a page or section title with optional description and actions. Use `DetailShell` for a detail view with a sticky action rail.

## Spacing, radius, and elevation

Use the existing rhythm rather than arbitrary values:

- Card padding: `p-4 sm:p-5`.
- Compact/nested padding: `p-3`.
- Page sections: `space-y-4`, with `space-y-10` or `my-12` only between major feature regions.
- Controls: usually `px-3 py-2` or `px-4 py-2`.
- Cards and primary controls: `rounded-xl` and `rounded-lg` respectively.
- Badges/chips: `rounded-full`.

Let `glass-surface` and `glass-elevated` supply shadows. Avoid adding heavier shadows unless the element truly changes elevation, such as a floating speed dial.

## Typography and numbers

The inherited sans font is the default. The CashDial wordmark intentionally uses `font-serif italic`.

| Element | Preferred classes |
| --- | --- |
| Page title | `text-3xl font-bold` |
| Section title | `text-2xl font-semibold` |
| Card title | `text-lg font-semibold` |
| Body | inherited size and color |
| Supporting text | `text-sm text-zinc-700 dark:text-zinc-300` or `text-sm opacity-70` |
| Eyebrow/status label | `text-xs font-medium uppercase tracking-wide` |

Financial values should use `tabular-nums` so columns do not shift as values change. Add `break-words` or `truncate` where an amount can exceed its container. Prefer the shared `AmountText` component for formatted income, expense, or neutral amounts.

Keep the semantic heading order intact. Visual size is not a substitute for choosing the correct `h1`, `h2`, or `h3`.

## Buttons and interactive controls

All important controls should have:

- a minimum touch height of `min-h-10` (40px), preferably `min-h-11` (44px) for primary actions;
- `rounded-lg` for the standard control shape;
- `focus-ring` for keyboard focus;
- an explicit hover state;
- disabled behavior such as `disabled:cursor-not-allowed disabled:opacity-40` or `disabled:opacity-50`;
- a visible text label or an accessible `aria-label` for icon-only buttons.

Use `ActionButton` for workflow actions such as create, edit, save, reset, confirm,
activate/deactivate, delete, pay, and occurrence actions. Import the framework-specific
component:

```tsx
// React
import ActionButton from "@/components/General/ActionButton";

<ActionButton tone="primary" type="submit">Guardar</ActionButton>
<ActionButton tone="danger" fullWidth>Eliminar</ActionButton>
```

```astro
---
import ActionButton from "@/components/General/ActionButton.astro";
---

<ActionButton tone="primary">Crear</ActionButton>
```

Both components use the same `default`, `primary`, `success`, `warning`, `danger`, and
`info` tones. They are content-width by default; use `fullWidth` only for detail action
rails or stacked mobile actions. Icons can be rendered alongside the label as children.
`AddButton` remains the React convenience wrapper for a primary action with a plus icon.

Keep specialized controls purpose-built: filters, pagination, disclosures, segmented
controls, row-management icons, navigation, theme/menu controls, and the circular movement
speed dial do not use `ActionButton`.

Reuse `FormActions` and `ConfirmModal` before recreating workflow patterns. `ConfirmModal`
uses the shared button tones for its opener and footer actions.

Links embedded in prose or lists generally use `text-blue-600 dark:text-blue-400`, with `hover:underline` where the surrounding shape does not already communicate clickability.

## Forms

- Use a vertical form rhythm of `space-y-4`; most forms cap their width at `max-w-lg`.
- Associate every input with a visible `<label>` using `htmlFor`/`for` and a stable `id`.
- Group related controls with `<fieldset>` and use `<legend>` when the group needs a name. A visually hidden legend should use `sr-only`.
- Inputs should normally be full width and `rounded-lg`; global base styles provide their themed border, background, and foreground.
- Use `glass-control` for custom selects, segmented controls, and compound inputs.
- Show validation with `FormErrors` or `text-sm text-red-600 dark:text-red-400` near the relevant field.
- Keep submission actions at the end and use `FormActions` when its reset/save model fits.
- Mark busy regions with `aria-busy`, and disable actions during submission.

Do not hide a native input unless a visible label fully replaces it and retains keyboard and screen-reader behavior, as in `SegmentedControl`.

## Cards, lists, and states

Interactive cards combine `glass-surface`, `focus-ring`, `rounded-xl`, and a subtle hover change:

```tsx
<a className="focus-ring glass-surface block rounded-xl p-4 transition-colors hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60">
  ...
</a>
```

Use semantic containers: `section` for a named region, `article` for a self-contained item, `ul`/`ol` for lists, and `dl` for label/value data. Give named sections an accessible heading or `aria-label`.

Every data-driven component should account for:

- loading: use the statistics skeleton pattern (`animate-pulse bg-zinc-200 dark:bg-zinc-800`) where appropriate;
- empty: use concise explanatory text, often in a dashed `glass-surface` or a muted paragraph;
- error: use semantic red text and actionable recovery where possible;
- disabled or unavailable actions: preserve the control but visually and programmatically disable it when that helps explain state.

## Icons

- Use Iconoir names (`iconoir:*`) consistently.
- Typical control icons are `size-5` or `h-4 w-4`; keep decorative icons `aria-hidden="true"`.
- Icon-only buttons require an `aria-label` and should normally use `inline-flex size-10 items-center justify-center`.
- Use `SquareIcon` for a category/account-style icon on a data-driven colored square.
- Do not use an icon as the only indicator of success, error, or status.

## Modals, toasts, and tooltips

Use Webcore UI primitives rather than implementing new overlay behavior.

- Modals use `glass-elevated`, a viewport-safe width such as `w-[calc(100vw-2rem)]!`, a feature-appropriate maximum width, and `max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain`.
- Confirmation dialogs should use `ConfirmModal`.
- Toasts use `className="app-toast"` and a semantic Webcore theme (`success`, `info`, `warning`, or `alert`).
- Tooltips use Webcore's themed variables and the existing `[data-tooltip]` blur treatment.

## Astro and React class composition

For simple conditional classes in Astro, use `class:list`. In React, keep complete Tailwind class names visible in source:

```tsx
const toneClass = isError
  ? "text-red-600 dark:text-red-400"
  : "text-zinc-700 dark:text-zinc-300";
```

Avoid constructing utilities dynamically, such as `` `text-${color}-600` ``, because Tailwind may not discover them. Map variants to complete static strings instead.

Reusable React components that accept `className` should either append it intentionally or use `twMerge` when callers need to override default Tailwind utilities:

```tsx
<div className={twMerge("rounded-lg p-4", className)} />
```

Keep class ordering readable: shared component classes first, then layout/display, sizing, spacing, typography/color, interaction/state, and responsive/dark variants. Exact ordering is less important than consistency within the file.

## Accessibility checklist

Before considering a component complete, verify that:

- it has an appropriate semantic element and heading level;
- all controls are reachable and visibly focused by keyboard;
- icon-only controls have accessible names;
- form controls have labels and errors are understandable;
- status is not communicated by color alone;
- text and controls remain legible in light and dark themes;
- touch targets are at least 40px, preferably 44px;
- long names and large amounts do not overflow;
- mobile layouts work before desktop enhancements are applied;
- reduced content states (loading, empty, error, disabled) are styled deliberately.

## New component templates

### Content card

```tsx
interface Props {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ExampleCard({ title, children, className = "" }: Props) {
  return (
    <section className={`glass-surface min-w-0 rounded-xl p-4 sm:p-5 ${className}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}
```

### Accessible icon button

```tsx
<button
  type="button"
  className="focus-ring glass-control inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-zinc-700 transition-colors hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-700/60"
  aria-label="Close panel"
>
  <Icon icon="iconoir:xmark" className="size-5" aria-hidden="true" />
</button>
```

### Responsive section header and grid

```astro
<section class="space-y-4" aria-labelledby="example-title">
  <SectionHeader
    title="Example"
    headingId="example-title"
    description="A concise explanation of this section."
  />
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <slot />
  </div>
</section>
```

## When to add or change a shared style

Add a class to `src/styles/global.css` only when the same visual primitive is used across multiple feature areas and giving it a name improves consistency. Theme third-party Webcore UI primitives in `src/styles/webcore-setup.scss`, using the existing `--w-*` variables.

When introducing a new repeated pattern:

1. Check `General`, `Forms`, and the feature's existing components for something reusable.
2. Prototype it with Tailwind utilities in one component.
3. Extract a shared component when behavior or markup repeats.
4. Extract a global component class only when the visual recipe itself repeats broadly.
5. Update this guide when the new pattern becomes the preferred convention.
