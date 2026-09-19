import { useEffect } from 'react';

/**
 * Menu "vibes" a restaurant can pick in Settings. Each theme sets the page palette,
 * heading font and corner radius; the restaurant's brand colour still drives buttons.
 * Preview any theme on a menu link with ?theme=<id> (used for sales demos).
 */
export type MenuTheme = {
  id: string;
  name: string;
  description: string;
  accent: string;
  headingFont: string; // CSS font-family for headings
  fontUrl?: string; // Google Fonts stylesheet for the heading font
  radius: string;
  vars: Record<string, string>; // shadcn colour tokens
};

const light = (bg: string, card: string, fg: string, muted: string, soft: string, border: string) => ({
  '--background': bg,
  '--foreground': fg,
  '--card': card,
  '--card-foreground': fg,
  '--popover': card,
  '--popover-foreground': fg,
  '--secondary': soft,
  '--secondary-foreground': fg,
  '--muted': soft,
  '--muted-foreground': muted,
  '--accent': soft,
  '--accent-foreground': fg,
  '--border': border,
  '--input': border,
});

export const THEMES: MenuTheme[] = [
  {
    id: 'warm',
    name: 'Warm Khmer',
    description: 'Cream and burnt orange. Friendly family restaurant.',
    accent: '#c2410c',
    headingFont: "'Plus Jakarta Sans', 'Kantumruy Pro', sans-serif",
    radius: '0.875rem',
    vars: light('#faf8f5', '#ffffff', '#292524', '#78716c', '#f3eee6', '#e7e2da'),
  },
  {
    id: 'cafe',
    name: 'Modern Café',
    description: 'Clean white, espresso brown, elegant serif.',
    accent: '#6f4e37',
    headingFont: "'DM Serif Display', 'Kantumruy Pro', serif",
    fontUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap',
    radius: '0.5rem',
    vars: light('#fbfaf8', '#ffffff', '#1f1a17', '#76695f', '#f2eee9', '#e6e0d8'),
  },
  {
    id: 'night',
    name: 'Night Bar',
    description: 'Dark mode with glowing amber. Bars, BBQ, rooftops.',
    accent: '#f59e0b',
    headingFont: "'Bricolage Grotesque', 'Kantumruy Pro', sans-serif",
    fontUrl: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&display=swap',
    radius: '1rem',
    vars: {
      '--background': '#0f0e0d',
      '--foreground': '#f5f1ea',
      '--card': '#1a1816',
      '--card-foreground': '#f5f1ea',
      '--popover': '#1a1816',
      '--popover-foreground': '#f5f1ea',
      '--secondary': '#26231f',
      '--secondary-foreground': '#f5f1ea',
      '--muted': '#26231f',
      '--muted-foreground': '#a8a095',
      '--accent': '#26231f',
      '--accent-foreground': '#f5f1ea',
      '--border': '#2f2b27',
      '--input': '#3a352f',
      '--primary-foreground': '#1a1305',
    },
  },
  {
    id: 'street',
    name: 'Street Food',
    description: 'Bold yellow and chilli red. Noodle shops, stalls, fast casual.',
    accent: '#dc2626',
    headingFont: "'Bricolage Grotesque', 'Kantumruy Pro', sans-serif",
    fontUrl: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&display=swap',
    radius: '1.25rem',
    vars: light('#fff8d6', '#ffffff', '#1c1917', '#6b5e3c', '#fdeea6', '#f1dc86'),
  },
  {
    id: 'garden',
    name: 'Garden',
    description: 'Sage green and natural tones. Healthy, vegan, brunch.',
    accent: '#3f7d4e',
    headingFont: "'Young Serif', 'Kantumruy Pro', serif",
    fontUrl: 'https://fonts.googleapis.com/css2?family=Young+Serif&display=swap',
    radius: '1rem',
    vars: light('#f4f6f0', '#ffffff', '#1f2a22', '#5f6f62', '#e8eee3', '#d9e2d3'),
  },
  {
    id: 'royal',
    name: 'Fine Dining',
    description: 'Deep charcoal and gold. Hotels, fine dining, wine bars.',
    accent: '#c9a24a',
    headingFont: "'Gloock', 'Kantumruy Pro', serif",
    fontUrl: 'https://fonts.googleapis.com/css2?family=Gloock&display=swap',
    radius: '0.375rem',
    vars: {
      '--background': '#121212',
      '--foreground': '#f3ede1',
      '--card': '#1b1a18',
      '--card-foreground': '#f3ede1',
      '--popover': '#1b1a18',
      '--popover-foreground': '#f3ede1',
      '--secondary': '#262420',
      '--secondary-foreground': '#f3ede1',
      '--muted': '#262420',
      '--muted-foreground': '#a79f90',
      '--accent': '#262420',
      '--accent-foreground': '#f3ede1',
      '--border': '#33302a',
      '--input': '#3d3931',
      '--primary-foreground': '#1a1408',
    },
  },
];

export const themeById = (id: string | null | undefined) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** Apply a theme (plus the restaurant's brand colour) to the whole document while mounted. */
export function useMenuTheme(themeId: string | undefined, accent: string | undefined) {
  useEffect(() => {
    if (!themeId) return;
    const theme = themeById(themeId);
    const root = document.documentElement;
    const vars: Record<string, string> = {
      ...theme.vars,
      '--primary': accent || theme.accent,
      '--ring': accent || theme.accent,
      '--radius': theme.radius,
      '--menu-heading-font': theme.headingFont,
    };
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.dataset.menuTheme = theme.id;

    let link: HTMLLinkElement | null = null;
    if (theme.fontUrl && !document.querySelector(`link[href="${theme.fontUrl}"]`)) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = theme.fontUrl;
      document.head.appendChild(link);
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', vars['--background']);
    return () => {
      Object.keys(vars).forEach((k) => root.style.removeProperty(k));
      delete root.dataset.menuTheme;
    };
  }, [themeId, accent]);
}
