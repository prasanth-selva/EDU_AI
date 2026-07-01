---
name: Edu Mentor AI
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006e2f'
  on-secondary: '#ffffff'
  secondary-container: '#6bff8f'
  on-secondary-container: '#007432'
  tertiary: '#784b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6bff8f'
  secondary-fixed-dim: '#4ae176'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005321'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
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
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style
The design system is engineered for an offline classroom learning environment that balances professional reliability for educators and investors with a vibrant, high-energy aesthetic for young learners. The brand personality is **Encouraging, Intelligent, and Kinetic**. 

The style utilizes a **Modern-Playful** approach, taking the structured logic of Material 3 and infusing it with the tactile smoothness of high-end consumer hardware. It avoids the clutter of traditional "kiddy" interfaces in favor of a "Sophisticated Play" look: high-clarity layouts, generous white space, and purposeful color hits. The emotional goal is to make digital learning feel like a premium physical toy—responsive, sturdy, and rewarding to interact with.

## Colors
This design system uses a high-chroma palette set against a clinical, clean slate background. 

- **Joyful Blue (Primary):** Used for core actions, primary navigation, and "Mentor" AI moments.
- **Vibrant Green (Secondary):** Used for progress, positive reinforcement, and completion states.
- **Sunny Orange (Accent):** Reserved for highlights, rewards, and critical attention points.
- **Clean Slate (Background):** A cool-toned off-white that reduces eye strain while maintaining a bright, open atmosphere.
- **Surface:** Pure white is used exclusively for interactive cards and floating containers to create a clear "lift" from the background.

## Typography
The design system utilizes **Plus Jakarta Sans** (as a high-quality alternative to Poppins) for its modern geometry and friendly, open counters. 

- **Weight Strategy:** Use Bold (700) and ExtraBold (800) for headlines to ensure they feel impactful and "fun." Body text uses Medium (500) for increased legibility on lower-resolution tablets.
- **Readability:** All body copy is set with a slightly increased line-height to ensure clear tracking for young readers.
- **Letter Spacing:** Headlines use tight tracking for a punchy, editorial feel, while labels use expanded tracking to improve scanability.

## Layout & Spacing
This design system follows a **Fixed-Fluid Hybrid** grid. 
- **Desktop:** A 12-column centered grid with a max-width of 1440px. 
- **Tablet/Mobile:** A fluid grid (8 columns for tablet, 4 for mobile) with expanded margins to ensure touch targets remain away from the screen edges.
- **Rhythm:** We use an 8px base unit. Component internal padding should default to `md` (24px) to accommodate large rounded corners without clipping content. 
- **Whitespace:** Use `xl` (80px) vertical spacing between major sections to maintain a "premium, airy" feel that prevents the UI from appearing overwhelming or cluttered.

## Elevation & Depth
The depth model is based on **Apple-style soft diffusion** rather than harsh shadows. 

1.  **Level 0 (Floor):** The Background color (#F8FAFC).
2.  **Level 1 (Cards):** Surface color (#FFFFFF) with a very large, soft shadow (Blur: 40px, Y: 10, Opacity: 4% Black). 
3.  **Level 2 (Interactive):** When hovered, cards should "lift" with a more pronounced shadow (Blur: 60px, Y: 20, Opacity: 8% Primary Color) and a subtle 1-2% scale increase.
4.  **Level 3 (Modals):** High elevation with a dimmed backdrop (40% opacity). No glassmorphism is used; overlays are solid but soft-edged.

## Shapes
The defining characteristic of this design system is its **extra-large radius**. 
- **Primary Containers:** All cards, input fields, and main buttons use a **24px (rounded-xl)** corner radius.
- **Small Elements:** Tooltips and tags use a **12px (rounded-md)** radius.
- **Icon Enclosures:** Always use a squircle or a circle; never sharp squares. 
The roundedness should be "smooth" (continuous curvature) to mimic physical molded plastic.

## Components
- **Large Buttons:** Height should be minimum 56px. They feature a "thick" bottom border (4px) in a slightly darker shade of the button color to create a tactile, pressable 3D effect without using gradients.
- **Colorful Cards:** Cards should feature a 4px top-accent border in Primary or Secondary colors to categorize content types (e.g., Green for "Completed Lessons," Blue for "New Tasks").
- **Input Fields:** Thick 2px borders in a soft neutral, turning Primary Blue on focus. Labels should float or sit prominently above the field.
- **Progress Bars:** Extra thick (16px height) with fully rounded ends. Use the Secondary Green for the fill color to signify growth.
- **Tactile Chips:** Used for filters or tags. On selection, they should "pop" with a primary color fill and a white bold label.
- **Illustrative Icons:** Use thick-stroke (2pt) icons with rounded caps. Icons should be dual-tone, using the Primary color and a 10% opacity tint of the same color for backgrounds.