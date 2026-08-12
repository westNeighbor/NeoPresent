const themes = {
  default: {
    accent: '#60a5fa',
    background: '#101522',
    border: '#34415e',
    codeComment: '#8da1ba',
    codeKeyword: '#93c5fd',
    codeNumber: '#fbbf24',
    codeString: '#86efac',
    foreground: '#f8fafc',
    muted: '#d9e2f2',
    panel: '#0b1020',
    surface: '#182033'
  },
  light: {
    accent: '#2563eb',
    background: '#f8fafc',
    border: '#cbd5e1',
    codeComment: '#64748b',
    codeKeyword: '#1d4ed8',
    codeNumber: '#b45309',
    codeString: '#15803d',
    foreground: '#10223c',
    muted: '#334155',
    panel: '#ffffff',
    surface: '#e2e8f0'
  },
  paper: {
    accent: '#b45309',
    background: '#fffaf0',
    border: '#d6c7ad',
    codeComment: '#7c6f64',
    codeKeyword: '#9a3412',
    codeNumber: '#a16207',
    codeString: '#047857',
    foreground: '#2f241d',
    muted: '#65564a',
    panel: '#fffdf8',
    surface: '#f1e6d0'
  },
  midnight: {
    accent: '#818cf8',
    background: '#080d1d',
    border: '#31416b',
    codeComment: '#91a4cb',
    codeKeyword: '#a5b4fc',
    codeNumber: '#fbbf24',
    codeString: '#86efac',
    foreground: '#e8eeff',
    muted: '#c5d1ef',
    panel: '#0c1328',
    surface: '#151f3b'
  }
};

const fymaPalettes = {
  blue: ['#24578c', '#3d73b3', '#e0f2ff', '#ff0000'],
  green: ['#1a734d', '#3db373', '#e0ffe6', '#ff0000'],
  gray: ['#404040', '#8c8c8c', '#d9d9d9', '#ff0000'],
  brown: ['#85521f', '#b3733d', '#f7ebeb', '#ff0000'],
  orange: ['#cc3b3d', '#f28770', '#ffebde', '#3b4080']
};

function createFymaTheme(paletteName, options = {}) {
  const resolvedPaletteName = fymaPalettes[paletteName] ? paletteName : 'blue';
  const palette = fymaPalettes[resolvedPaletteName];
  const [dark, middle, pale, highlight] = palette;
  const gradientDirection = normalizeGradientDirection(options.fymaGradientDirection);
  return {
    accent: dark,
    background: `linear-gradient(${gradientDirection}, ${pale} 0%, #ffffff 100%)`,
    border: middle,
    codeComment: '#64748b',
    codeKeyword: dark,
    codeNumber: highlight,
    codeString: '#18794e',
    foreground: dark,
    headingColor: dark,
    headingRule: dark,
    kind: 'fyma',
    muted: '#4b5563',
    palette: resolvedPaletteName,
    panel: '#ffffff',
    surface: pale
  };
}

function createCimentTheme(options = {}) {
  const hatchColor = safeCssColor(options.cimentHatchColor, '#bfbfbf');
  const hatchAlpha = parseAlpha(options.cimentHatchAlpha, 0.72);
  const density = Math.max(2, Math.min(80, Number(options.cimentHatchDensity) || 12));
  const gap = 100 / density;
  const line = `color-mix(in srgb, ${hatchColor} ${Math.round(hatchAlpha * 100)}%, transparent)`;
  return {
    accent: '#b31a1a',
    background: `repeating-linear-gradient(0deg, ${line} 0 1px, transparent 1px ${gap.toFixed(2)}px), #ffffff`,
    border: hatchColor,
    codeComment: '#666666',
    codeKeyword: '#8f1515',
    codeNumber: '#7c2d12',
    codeString: '#166534',
    foreground: '#000000',
    headingColor: '#b31a1a',
    headingRule: '#b31a1a',
    kind: 'ciment',
    muted: '#333333',
    panel: '#ffffff',
    surface: '#bfbfbf'
  };
}

function normalizeGradientDirection(value) {
  const source = String(value ?? 'right')
    .trim()
    .toLowerCase();
  const named = {
    bottom: 'to bottom',
    left: 'to left',
    right: 'to right',
    top: 'to top'
  };
  if (named[source]) return named[source];
  if (/^to (?:top|bottom|left|right)(?: (?:top|bottom|left|right))?$/.test(source)) return source;
  if (/^-?\d+(?:\.\d+)?deg$/.test(source)) return source;
  return 'to right';
}

function parseAlpha(value, fallback) {
  const source = String(value ?? '').trim();
  if (!source) return fallback;
  const parsed = source.endsWith('%') ? Number(source.slice(0, -1)) / 100 : Number(source);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function safeCssColor(value, fallback) {
  const source = String(value ?? '').trim();
  return /^(?:#[\da-f]{3,8}|rgba?\([^;]+\)|hsla?\([^;]+\)|oklch\([^;]+\)|oklab\([^;]+\)|[a-z]+)$/i.test(
    source
  )
    ? source
    : fallback;
}

/** Returns a named viewer palette, falling back to the default palette. */
export function getTheme(name, options = {}) {
  const requested = String(name ?? '').toLowerCase();
  if (requested === 'fyma' || requested.startsWith('fyma-')) {
    const palette = requested.slice(5) || String(options.fymaPalette ?? 'blue').toLowerCase();
    return createFymaTheme(palette, options);
  }
  if (requested === 'ciment') return createCimentTheme(options);
  return themes[requested] ?? themes.default;
}
