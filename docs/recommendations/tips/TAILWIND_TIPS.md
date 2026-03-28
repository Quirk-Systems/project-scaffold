# Tailwind CSS v4 Tips

> CSS-first. No config file. Theme lives in your CSS.

---

## The v4 Mental Model

Tailwind v4 drops `tailwind.config.ts`. Everything is in CSS.

```css
/* src/app/globals.css */
@import "tailwindcss";        /* pulls in all utilities */
@import "tw-animate-css";     /* animation utilities */

@custom-variant dark (&:where(.dark, .dark *));  /* dark mode via .dark class */

@theme inline {
  /* Override or extend the default theme */
  --color-primary: oklch(0.55 0.2 250);
  --font-sans: "Inter", sans-serif;
  --radius-lg: 0.75rem;
}
```

---

## Adding Custom Colors

```css
@theme inline {
  /* Brand colors in OKLCH (perceptually uniform) */
  --color-brand-50: oklch(0.97 0.02 250);
  --color-brand-500: oklch(0.55 0.2 250);
  --color-brand-900: oklch(0.25 0.1 250);

  /* Semantic colors (light mode) */
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.1 0 0);
  --color-muted: oklch(0.96 0 0);
  --color-muted-foreground: oklch(0.45 0 0);
}

.dark {
  /* Override semantic colors for dark mode */
  --color-background: oklch(0.1 0 0);
  --color-foreground: oklch(0.98 0 0);
  --color-muted: oklch(0.15 0 0);
  --color-muted-foreground: oklch(0.6 0 0);
}
```

Use in components: `bg-background`, `text-foreground`, `text-muted-foreground`.

---

## Custom Utilities with @utility

```css
/* Define reusable utility classes */
@utility container-narrow {
  max-width: 65ch;
  margin-inline: auto;
  padding-inline: 1rem;
}

@utility prose-balanced {
  text-wrap: balance;
  text-align: left;
  hyphens: auto;
}

@utility focus-ring {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## Dynamic Classes (the Gotcha)

Tailwind v4 uses content scanning to purge unused classes. Never build class names dynamically with string concatenation:

```tsx
// ❌ Won't work — scanner can't detect these
const color = "red";
<div className={`bg-${color}-500`} />

// ✅ Use complete class names
const classes = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
} as const;
<div className={classes[color]} />

// ✅ Or use CVA (class-variance-authority) — see button.tsx
import { cva } from "class-variance-authority";

const badge = cva("rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      destructive: "bg-destructive text-destructive-foreground",
      outline: "border border-border text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});
```

---

## Responsive Design

```tsx
// Mobile-first (min-width breakpoints)
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px

<div className="
  grid                    // mobile: stack vertically
  grid-cols-1
  sm:grid-cols-2          // tablet: 2 columns
  lg:grid-cols-3          // desktop: 3 columns
  gap-4
  sm:gap-6
">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

// Container with responsive padding
<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
  {children}
</main>
```

---

## Dark Mode

```tsx
// Uses .dark class (set on <html> or any ancestor)
<button className="
  bg-white text-black        // light mode
  dark:bg-gray-900           // dark mode
  dark:text-white
  border border-gray-200
  dark:border-gray-700
">
  Click me
</button>

// In layout.tsx — toggle dark class on <html>
// Use a state/cookie/localStorage to persist preference
```

---

## Animation with tw-animate-css

```tsx
// Already imported in globals.css
// Usage: animate-{name} classes

<div className="animate-fade-in">Fades in</div>
<div className="animate-slide-in-from-bottom">Slides up</div>
<div className="animate-spin">Spins</div>

// Custom keyframes in CSS
@keyframes wiggle {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

@theme inline {
  --animate-wiggle: wiggle 0.5s ease-in-out infinite;
}
```

---

## The `cn()` Utility

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// Merge classes without conflicts
<button className={cn(
  "px-4 py-2 rounded-md",           // base
  variant === "primary" && "bg-primary text-white",
  variant === "ghost" && "hover:bg-accent",
  disabled && "opacity-50 cursor-not-allowed",
  className                          // allow override from parent
)}>
```

`twMerge` is key — it resolves conflicts: `cn("px-4", "px-8")` → `"px-8"` (last wins).

---

## Spacing Scale Reference

| Class | Size |
|-------|------|
| `p-1` | 4px |
| `p-2` | 8px |
| `p-4` | 16px |
| `p-6` | 24px |
| `p-8` | 32px |
| `p-12` | 48px |
| `p-16` | 64px |

---

## Layout Patterns

```tsx
// Full-page layout with sticky header
<div className="flex min-h-screen flex-col">
  <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 h-16">
      {/* nav content */}
    </nav>
  </header>
  <main className="flex-1">{children}</main>
  <footer className="border-t py-8">{/* footer */}</footer>
</div>

// Centered card layout
<div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
  <div className="w-full max-w-md rounded-xl border bg-background p-8 shadow-lg">
    {children}
  </div>
</div>

// Sidebar layout
<div className="flex h-screen overflow-hidden">
  <aside className="w-64 shrink-0 border-r overflow-y-auto">{sidebar}</aside>
  <main className="flex-1 overflow-y-auto p-6">{content}</main>
</div>
```
