---
name: Elite Discipline
colors:
  surface: '#f3faff'
  surface-dim: '#c7dde9'
  surface-bright: '#f3faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e6f6ff'
  surface-container: '#dbf1fe'
  surface-container-high: '#d5ecf8'
  surface-container-highest: '#cfe6f2'
  on-surface: '#071e27'
  on-surface-variant: '#454652'
  inverse-surface: '#1e333c'
  inverse-on-surface: '#dff4ff'
  outline: '#767683'
  outline-variant: '#c6c5d4'
  surface-tint: '#4c56af'
  primary: '#000666'
  on-primary: '#ffffff'
  primary-container: '#1a237e'
  on-primary-container: '#8690ee'
  inverse-primary: '#bdc2ff'
  secondary: '#b6171e'
  on-secondary: '#ffffff'
  secondary-container: '#da3433'
  on-secondary-container: '#fffbff'
  tertiary: '#191b19'
  on-tertiary: '#ffffff'
  tertiary-container: '#2e302e'
  on-tertiary-container: '#979894'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000767'
  on-primary-fixed-variant: '#343d96'
  secondary-fixed: '#ffdad6'
  secondary-fixed-dim: '#ffb3ac'
  on-secondary-fixed: '#410003'
  on-secondary-fixed-variant: '#930010'
  tertiary-fixed: '#e2e3df'
  tertiary-fixed-dim: '#c6c7c3'
  on-tertiary-fixed: '#1a1c1a'
  on-tertiary-fixed-variant: '#454745'
  background: '#f3faff'
  on-background: '#071e27'
  surface-variant: '#cfe6f2'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system is built for the modern martial artist, balancing the raw energy of competition with the structured discipline of traditional practice. The brand personality is professional, authoritative, and high-performance. It avoids the chaotic visuals of "extreme fitness" apps in favor of a clean, SaaS-inspired aesthetic that reflects the clarity of a well-executed technique.

The style is **Corporate Modern with a Sporty Edge**. It utilizes generous whitespace to allow content to breathe, creating a sense of calm and focus. Visual interest is generated through precise typography and high-contrast primary accents, signaling action and achievement without overwhelming the user.

## Colors
The palette is rooted in a clean, professional foundation.
- **Primary (Electric Blue):** Used for navigation, primary actions, and brand reinforcement. It represents stability and professional excellence.
- **Secondary (Energetic Red):** Reserved for high-priority Call-to-Actions (CTAs), urgent notifications, or performance highlights.
- **Backgrounds:** The base surface is a clean white, while a soft cream (`#f5f5f1`) is used for sectional backgrounds to provide subtle contrast without losing the "light" feel.
- **Neutrals:** A scale of cool grays provides clarity for secondary text and borders, ensuring the interface remains grounded and legible.

## Typography
The typography strategy pairings reflect the "Discipline and Performance" theme. **Montserrat** is used for headings to provide a bold, confident, and slightly geometric structure that feels athletic yet modern. 

For body text and data-heavy interfaces, **Hanken Grotesk** is chosen for its exceptional legibility and contemporary, sharp finish. Labels utilize increased letter spacing and semi-bold weights to ensure hierarchy is maintained in dense dashboard views. Mobile typography scales down significantly for larger display titles to ensure no awkward wrapping occurs during high-intensity use.

## Layout & Spacing
The layout follows a **Fluid Grid** system with a focus on generous internal padding. 
- **Desktop:** 12-column grid with 24px gutters. Content is often contained within "performance cards" to group related data points.
- **Mobile:** 4-column grid with 16px side margins. 
- **Spacing Rhythm:** Based on an 8px scale. Use `lg` (40px) or `xl` (64px) vertical spacing between major sections to maintain a high-end, uncluttered SaaS feel. Components should use `md` (24px) padding internally to evoke a sense of professional roominess.

## Elevation & Depth
This design system uses a **Tonal Layering** approach combined with **Ambient Shadows** to create a sophisticated sense of hierarchy.
- **Level 0 (Base):** The primary background color.
- **Level 1 (Cards):** White surfaces with a very soft, diffused shadow (0px 4px 20px, 5% opacity of the primary blue). This makes elements feel like they are floating slightly above the canvas.
- **Level 2 (Active/Hover):** Increased shadow spread and slightly higher opacity to indicate interactivity.
- **Outlines:** Use 1px solid borders in a light neutral (`#e0e0e0`) for secondary elements where shadows would create too much visual noise, such as input fields or table rows.

## Shapes
The shape language is consistently **Rounded**, using an 8px base radius for standard components like buttons and inputs. Larger containers (cards, modals) should utilize the `rounded-lg` (16px) or `rounded-xl` (24px) tokens to soften the overall appearance of the UI, making the "discipline" of the brand feel approachable rather than rigid.

## Components
- **Buttons:** Primary buttons use the Electric Blue background with white text. CTA buttons for "Join," "Start," or "Win" use the Energetic Red. Both have 8px corners and a 2px horizontal padding multiplier for a wide, stable look.
- **Inputs:** Clean, outlined fields with a 1px neutral border. Upon focus, the border transitions to Primary Blue with a soft 2px outer glow.
- **Chips:** Used for belt ranks or status. These use a light tonal background of the status color (e.g., a very pale blue for "active") with high-contrast text.
- **Cards:** The workhorse of the system. White background, 16px corner radius, and subtle ambient shadows. Headers within cards should use the `label-md` uppercase style.
- **Progress Trackers:** High-contrast bar charts or circular indicators using the Primary Blue to track training consistency and grading progress.
- **Lists:** Clean rows with 1px bottom borders, using ample vertical padding (16px-20px) to ensure touch-targets are accessible for users on the move.