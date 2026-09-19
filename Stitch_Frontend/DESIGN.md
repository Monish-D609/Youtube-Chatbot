---
name: Obsidian Amber
colors:
  surface: '#141311'
  surface-dim: '#141311'
  surface-bright: '#3b3936'
  surface-container-lowest: '#0f0e0c'
  surface-container-low: '#1c1b19'
  surface-container: '#211f1d'
  surface-container-high: '#2b2a28'
  surface-container-highest: '#363432'
  on-surface: '#e6e2de'
  on-surface-variant: '#dac1ba'
  inverse-surface: '#e6e2de'
  inverse-on-surface: '#32302e'
  outline: '#a28c86'
  outline-variant: '#54433e'
  surface-tint: '#ffb59d'
  primary: '#ffb59d'
  on-primary: '#581e08'
  primary-container: '#cf7a5e'
  on-primary-container: '#4f1704'
  inverse-primary: '#924a31'
  secondary: '#f8ba82'
  on-secondary: '#4b2700'
  secondary-container: '#673d10'
  on-secondary-container: '#e5a973'
  tertiary: '#ffb77d'
  on-tertiary: '#4d2600'
  tertiary-container: '#d97707'
  on-tertiary-container: '#432100'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59d'
  on-primary-fixed: '#390c00'
  on-primary-fixed-variant: '#75331c'
  secondary-fixed: '#ffdcc0'
  secondary-fixed-dim: '#f8ba82'
  on-secondary-fixed: '#2d1600'
  on-secondary-fixed-variant: '#673d10'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#141311'
  on-background: '#e6e2de'
  surface-variant: '#363432'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.01em
  timestamp-tag:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system targets developers, researchers, technical creators, and knowledge workers who digest deep-form video content through conversational AI. The interface evokes quiet focus, intellectual rigor, and tactile warmth—marrying the calm editorial restraint of literary computing with the ultra-clean utility of terminal developer tooling.

The visual style is **Warm Minimalist Editorial with Technical Precision**:
- High-depth obsidian surfaces avoid the sterile chill of pure black (#000000) by leaning into smoky stone, graphite, and charcoal undertones.
- Warm terracotta, amber, and sunlit sand highlights provide an organic human presence, invoking physical books, raw clay, and ambient studio light.
- Borders remain disciplined at razor-thin 1px low-contrast boundaries, maintaining structure without visual noise.
- Translucency and subtle backdrop blurs provide layered hierarchy without decorative excess.

## Colors

The palette establishes an intimate, low-eye-strain environment engineered for extended reading, synthesis, and interaction.

### Palette Architecture
- **Obsidian Dark Surfaces**:
  - Base canvas: `#0f0e0d` (deepest warm abyss)
  - Surface raised / Sidebar / Panel containers: `#181715` (warm obsidian base)
  - Surface elevated / Active card states: `#22211e` (charcoal stone)
  - Surface overlay / Hover states: `#2a2824`
- **Terracotta & Amber Accents**:
  - Primary interactive / Action accents: `#cc785c` (signature warm terracotta)
  - Secondary highlight / Active chapter states: `#e5a973` (warm cream sand)
  - Amber metadata / Playback markers / Warnings: `#d97706` (glowing amber)
  - Amber focus ring / subtle glow: `rgba(204, 120, 92, 0.25)`
- **Structural Dividers**:
  - Border baseline: `#2e2c29` (subtle low-contrast boundary)
  - Border focus / Interactive hover: `#45413c`
- **Text & Editorial Tones**:
  - Text Primary: `#ede8e1` (soft parchment white)
  - Text Secondary: `#a6a097` (stone dust)
  - Text Muted: `#706b63` (deep slate earth)

## Typography

Typography pairs the crisp, neutral legibility of **Geist** with the exactness of **JetBrains Mono**.

- **Editorial Headings & Synthesis**: Rendered in Geist with subtle negative tracking (`-0.02em`) to maintain composure without shouting.
- **Transcript & Response Flow**: Body typography emphasizes spacious line-heights (`1.62x`) to optimize deep reading of long-form synthesized video transcripts.
- **Temporal & Technical Notation**: Timestamps (e.g., `04:18`), video chapter indices, code output, and YouTube source URLs must strictly use JetBrains Mono to reinforce technical authority and scanning ease.

## Layout & Spacing

The architecture balances asymmetric side navigation with a focused, centered conversational stage.

### Layout Philosophy
- **Three-Tier Workspace**:
  - **Left Rail (Sidebar)**: Fixed 280px on desktop. Houses chronological or video-grouped conversation histories, settings, and video collection playlists. Collapsible into an icon shelf.
  - **Center Canvas (Chat & Synthesis Stream)**: Max-width 840px, centered horizontally. Designed as an uninterrupted vertical reading column.
  - **Floating Dock / Input Well**: Anchored to the bottom center of the viewport with responsive gutters, allowing conversational commands to remain accessible regardless of scroll depth.
- **Breakpoints**:
  - `Mobile (< 768px)`: Single column. Sidebar collapses into an off-canvas drawer. Input dock spans full viewport minus margins (`margin: 1rem`).
  - `Tablet (768px - 1024px)`: Collapsible left navigation (64px mini-dock or drawer), conversational column occupies dynamic remaining width.
  - `Desktop (> 1024px)`: Persistent 280px left rail, 840px centered conversational stage.

## Elevation & Depth

Visual hierarchy uses **tonal layering and razor outlines** rather than diffuse drop shadows:

- **Level 0 (Background Canvas)**: Solid `#0f0e0d`.
- **Level 1 (Panels & Sidebar)**: `#181715` surrounded by a 1px border of `#2e2c29`. No shadow.
- **Level 2 (Cards, Video Preview Pills, Dialogs)**: Solid `#22211e` or translucent `#181715d9` with `backdrop-filter: blur(12px)`. Outlined with 1px `#2e2c29`.
- **Level 3 (Floating Input Console & Popovers)**: Translucent `#1c1b18ea` layered with 1px `#45413c` border and an ambient, warm-tinted shadow: `box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(229, 169, 115, 0.08)`.
- **Active / Accent Elevators**: Elements currently processing (e.g., active AI reasoning, active chapter playing) take on a subtle perimeter edge highlight using `rgba(204, 120, 92, 0.3)`.

## Shapes

The design uses balanced, intentional rounding that blends software utility with comfortable handling:

- Standard structural panels, message blocks, and cards employ `0.5rem` (`rounded-md`) to `0.75rem`.
- Chapter tags, timestamp bookmarks, status indicators, and author badges adopt full pill radii (`rounded-full`) for high scanability.
- Code blocks, raw transcript snippets, and terminal log windows inherit tighter geometry (`0.375rem`) to fit monospace constraints.

## Components

### Buttons
- **Primary**: Terracotta fill (`#cc785c`), dark text (`#0f0e0d`), medium weight Geist (`font-weight: 500`). Hover transitions to `#d98266` with micro-scale (`scale: 1.01`).
- **Secondary / Ghost**: Transparent fill, 1px border (`#2e2c29`), text `#ede8e1`. On hover, background shifts to `#22211e` and border to `#45413c`.
- **Icon / Utility Buttons**: Square 32x32px or 36x36px with rounded corners (`0.5rem`), translucent `#181715` base, muted icon color `#a6a097` brightening to `#ede8e1` on hover.

### Timestamp & Chapter Pills
- Pill-shaped badges (`rounded-full`) featuring a `JetBrains Mono` timestamp on the left and title on the right.
- Visual state: `#22211e` background, 1px border `#2e2c29`, text `#e5a973`.
- Active / Currently Played: Border changes to `#cc785c`, subtle amber glow, and font shifts to primary accent.

### Video Preview Banner / Context Pill
- Compact card pinned above the conversational thread or docked inside the prompt input:
- Displays 16:9 micro-thumbnail (rounded `0.375rem`), video title in `body-sm` bold, channel badge, and video duration in `code-md`.
- Encased in a frosted container (`backdrop-blur: 8px`, `background: #181715cc`, border: `1px solid #2e2c29`).

### Conversational Input Box
- Floating bottom-docked capsule containing:
  - Multi-line autosizing textarea with no default OS scrollbars.
  - Video context attachment chip (removable via micro-close icon).
  - Utility toolbar: model selector, timestamp jump button, and paperclip for transcript file attachments.
  - Submit action: Circular terracotta button with an upward micro-arrow icon, disabled to `#2a2824` when empty.

### Lists & Chat Histories
- Navigational items grouped by video title or temporal markers ("Today", "Previous 7 Days").
- Active session is indicated by a vertical 2px terracotta border on the inner left edge, `#22211e` background fill, and high-contrast parchment text.
- Ellipsis menu appears on row hover to export transcript, copy markdown, or archive.

### Code & Transcript Blocks
- Dark obsidian base (`#131211`), bordered with 1px `#2e2c29`.
- Header bar displays language / track mode (`JetBrains Mono`, `label-xs`) and a "Copy" utility button.
- Synced transcript lines highlight in `#e5a973` with a left amber indicator tick when referenced by the AI response.