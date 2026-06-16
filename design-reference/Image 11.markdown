---
name: Ippon Performance
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#454652'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#767683'
  outline-variant: '#c6c5d4'
  surface-tint: '#4c56af'
  primary: '#000666'
  on-primary: '#ffffff'
  primary-container: '#1a237e'
  on-primary-container: '#8690ee'
  inverse-primary: '#bdc2ff'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cba72f'
  on-tertiary-container: '#4e3d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000767'
  on-primary-fixed-variant: '#343d96'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 72px
    fontWeight: '900'
    lineHeight: 80px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  stats-number:
    fontFamily: Montserrat
    fontSize: 40px
    fontWeight: '900'
    lineHeight: 40px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  section-padding: 120px
---

## Brand & Style

The design system is engineered to reflect the discipline, explosive power, and technical precision of elite Judo. It captures the balance between the stoic tradition of the dojo and the high-intensity atmosphere of international competition.

The aesthetic follows a **High-Contrast / Modern** approach. It utilizes a structured, disciplined grid to represent the rules and boundaries of the sport, while employing bold typography and dynamic imagery to convey motion. Subtle textures inspired by the *Sashiko* weave of a high-quality Judo Gi are used sparingly as background elements to add tactile depth without cluttering the interface. The emotional goal is to evoke a sense of professional authority, athletic excellence, and unwavering focus.

## Colors

The palette is rooted in the traditional colors of the sport, elevated for a digital-first athletic brand.

- **Judo Blue (#1A237E):** The primary anchor. Used for navigation, primary buttons, and heavy typographic elements to represent stability and strength.
- **White Gi (#FFFFFF):** The base surface color. It ensures a clean, "clean-sheet" aesthetic that allows photography to stand out.
- **Medal Gold (#D4AF37):** Reserved exclusively for achievements, highlights, and victory-related accents (palmares, championship icons).
- **Tatami Red (#B71C1C):** A high-energy accent used for call-to-actions, live indicators, or critical performance metrics to draw immediate attention.
- **Neutral Grey (#F5F5F5):** Used for background sections and subtle "woven" textures to distinguish different content blocks.

## Typography

Typography in this design system is built on a hierarchy of power and clarity. 

**Montserrat** is used for all headlines. It should be used in heavy weights (Bold or Black) to simulate the physical presence of an athlete. Large display type should use tight letter-spacing to feel more "locked-in" and aggressive.

**Inter** provides the functional balance. It is used for body copy and UI labels to ensure maximum legibility for competition stats, biographies, and technical articles. High-intensity labels (like "LIVE" or "CHAMPION") should be set in Inter Bold with uppercase styling and increased tracking.

## Layout & Spacing

The layout is a disciplined 12-column fluid grid. It prioritizes vertical rhythm and significant white space to mirror the focus of a focused athlete. 

- **Desktop:** 12 columns with 24px gutters. Use large section padding (120px+) to separate different content "phases" (e.g., Bio vs. Gallery).
- **Mobile:** 4 columns with 16px margins.
- **Visual Rhythm:** Elements should align to an 8px baseline grid. Content blocks should use asymmetric layouts (e.g., text spanning 5 columns, image spanning 7) to create a sense of forward momentum and dynamism.

## Elevation & Depth

Depth is achieved through **Tonal Layers** rather than heavy shadows. This keeps the design feeling "flat" and athletic, like a mat surface.

- **Level 0 (Floor):** Neutral Grey (#F5F5F5) for the main background.
- **Level 1 (Mat):** Pure White (#FFFFFF) containers for cards and content blocks. These use a very subtle, low-opacity blue tint in the "shadow" (2px blur, 5% opacity of #1A237E) to ground them without feeling heavy.
- **Overlays:** Video players and high-impact modals use a semi-transparent Deep Judo Blue (#1A237E at 90% opacity) as a backdrop to maintain brand immersion even when content is layered.

## Shapes

The shape language is **Soft (0.25rem)**. While the brand is bold, the sharp edges are slightly rounded to reflect the flexibility and fluidity of movement required in Judo. 

- **Standard Buttons/Inputs:** 4px (0.25rem) corner radius.
- **Cards & Video Players:** 8px (0.5rem) corner radius.
- **Profile Avatars:** Circular (full round) to symbolize the "Enso" or the wholeness of martial arts training.

## Components

### Buttons
- **Primary:** Solid Judo Blue with White text. Sharp, decisive action.
- **Secondary:** Outlined Blue or Solid White with Blue text.
- **Action:** Tatami Red is used only for high-conversion buttons like "Watch Live" or "Support."

### Palmares (Achievement Cards)
Cards feature a subtle "Gi" texture background. Gold accents are used for the border or a "Medal Icon" in the top right. Dates and locations are set in `label-bold`.

### Profile Statistics
A dedicated component for athlete data (Weight Class, Rank, Win/Loss Ratio). Numbers are set in `stats-number` using Judo Blue, with labels in `label-bold` tucked underneath.

### Video Player Wrapper
Custom-styled controls using a minimalist "Glass" overlay. The play button is a large, centered circle using Medal Gold to signify "premium" highlight content.

### Lists
Lists of tournament history should use a "Timeline" style, where a vertical 2px line in Judo Blue connects events, reinforcing the journey and progression of the athlete.