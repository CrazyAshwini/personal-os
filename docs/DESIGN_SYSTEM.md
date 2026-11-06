# Personal OS — Design System Specification

**Version:** 1.0.0  
**Status:** Active  
**Design Philosophy:** Minimal, warm neutral, calm, accessible, and premium. Zero loud neon accents, zero excessive gradients, zero purple-black themes.

---

## 1. Color Tokens & Theme System

### Light Theme Tokens
| Semantic Role | Token Name | Hex Value | Description |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--background` | `#F5F4EF` | Warm alabaster/linen base canvas |
| **Card / Surface** | `--card`, `--popover` | `#FFFFFF` | Pure white container surface |
| **Subtle Surface** | `--muted`, `--secondary` | `#EEEDE6` | Soft stone secondary surface |
| **Primary Text** | `--foreground`, `--card-foreground` | `#242824` | Deep charcoal for readable high-contrast text |
| **Secondary Text** | `--muted-foreground` | `#777B75` | Muted slate-olive for supporting metadata |
| **Dividers & Borders** | `--border`, `--input` | `#E4E3DC` | Gentle warm borders with low visual noise |
| **Primary Accent** | `--primary`, `--ring` | `#788D79` | Restrained sage green primary accent |
| **Primary Accent Foreground** | `--primary-foreground` | `#FFFFFF` | Crisp contrast text on sage surfaces |
| **Destructive / Alert** | `--destructive` | `#DC2626` | Standard accessible red |

### Dark Theme Tokens
| Semantic Role | Token Name | Hex Value | Description |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--background` | `#171A18` | Deep warm moss/charcoal canvas |
| **Card / Surface** | `--card`, `--popover` | `#202421` | Elevated warm charcoal container surface |
| **Subtle Surface** | `--muted`, `--secondary` | `#292E2A` | Muted olive-slate surface for badges and hovers |
| **Primary Text** | `--foreground`, `--card-foreground` | `#F0F0E9` | Soft warm cream for comfortable long-session reading |
| **Secondary Text** | `--muted-foreground` | `#A1A69F` | Muted silver-sage for metadata |
| **Dividers & Borders** | `--border`, `--input` | `#343A35` | Low-contrast charcoal border |
| **Primary Accent** | `--primary`, `--ring` | `#91A58F` | Luminous sage green accent |
| **Primary Accent Foreground** | `--primary-foreground` | `#171A18` | Dark charcoal text on bright sage surfaces |
| **Destructive / Alert** | `--destructive` | `#EF4444` | Soft accessible red |

---

## 2. Typography Scale

Single modern sans-serif font family (`Inter` / `Geist` / system sans-serif fallback).

| Role | Font Size | Font Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Page Title** | 24px - 28px (`text-2xl`) | Semibold (600) | 1.25 | Module header titles |
| **Section Title** | 18px - 20px (`text-lg`) | Semibold (600) | 1.3 | Card headers and tab sections |
| **Card / Item Title** | 14px - 15px (`text-sm`) | Medium (500) | 1.4 | List items, account headers, tasks |
| **Body Text** | 13px - 14px (`text-sm`) | Normal (400) | 1.5 | Paragraphs, notes, inputs |
| **Secondary / Metadata** | 11px - 12px (`text-xs`) | Normal (400) | 1.4 | Timestamps, categories, badges |
| **Fine Print / Footers** | 10px (`text-[10px]`) | Medium (500) | 1.4 | Subtext, card masked numbers |

---

## 3. Elevation, Radius & Borders

- **Border Radius**:
  - Small elements (badges, buttons, inputs): `rounded-lg` (`0.5rem` / `8px`)
  - Surface cards & dialogs: `rounded-xl` (`0.75rem` / `12px`)
- **Elevation / Shadows**:
  - Restrained elevation: Subtle `shadow-xs` or `shadow-sm` on interactive cards and buttons.
  - High elevation: `shadow-lg` reserved exclusively for dialogs, popovers, and mobile sheets.
- **Borders**:
  - Crisp `1px solid var(--border)` applied consistently across cards, separators, and inputs.

---

## 4. Interaction & Accessibility Standards

1. **Touch Targets**: Minimum 44px on mobile viewports for all primary tap interactions.
2. **Keyboard Focus**: Visible 2px focus ring (`ring-2 ring-primary ring-offset-2 ring-offset-background`) on all focusable elements (`button`, `a`, `input`, `select`).
3. **Color Independence**: Every status communication (e.g. attendance percentage, overdue bill, priority task) pairs a color indicator with explicit text or an icon.
4. **Theme Preference**:
   - Light, Dark, System modes supported via `next-themes`.
   - Stored in `localStorage` with `suppressHydrationWarning` on `<html>` to avoid hydration flashes.
