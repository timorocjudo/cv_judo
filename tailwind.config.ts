import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000666',
        'primary-container': '#1a237e',
        'on-primary': '#ffffff',
        'on-primary-container': '#8690ee',
        'primary-fixed-dim': '#bdc2ff',
        background: '#f9f9f9',
        surface: '#f9f9f9',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f3f3',
        'surface-container': '#eeeeee',
        'surface-container-high': '#e8e8e8',
        'surface-container-highest': '#e2e2e2',
        'on-surface': '#1a1c1c',
        'on-surface-variant': '#454652',
        'inverse-surface': '#2f3131',
        outline: '#767683',
        'outline-variant': '#c6c5d4',
        tertiary: '#735c00',
        'tertiary-container': '#cba72f',
        'tertiary-fixed': '#ffe088',
        'tertiary-fixed-dim': '#e9c349',
        'on-tertiary-container': '#4e3d00',
        'medal-gold': '#FFD700',
        'medal-silver': '#C0C0C0',
        'medal-bronze': '#CD7F32',
      },
      fontFamily: {
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      maxWidth: {
        'container-max': '1280px',
      },
      spacing: {
        gutter: '24px',
        'margin-mobile': '16px',
        'margin-desktop': '64px',
        'section-padding': '120px',
      },
      fontSize: {
        'display-lg': ['72px', { lineHeight: '80px', letterSpacing: '-0.02em', fontWeight: '900' }],
        'headline-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-bold': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '700' }],
        'stats-number': ['40px', { lineHeight: '40px', fontWeight: '900' }],
      },
    },
  },
  plugins: [],
}

export default config
