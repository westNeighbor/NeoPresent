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
  },
  alpine: {
    accent: '#1d7a62',
    background: '#f5faf5',
    backgroundImage:
      'radial-gradient(ellipse at 88% 8%, rgba(81, 139, 101, .19) 0%, transparent 30%), linear-gradient(150deg, transparent 0 70%, rgba(69, 118, 84, .13) 70% 82%, transparent 82%), linear-gradient(30deg, transparent 0 74%, rgba(143, 185, 150, .20) 74% 86%, transparent 86%)',
    border: '#9fcbb3',
    codeComment: '#5f776c',
    codeKeyword: '#17634f',
    codeNumber: '#b45309',
    codeString: '#247250',
    foreground: '#173f35',
    headingColor: '#17634f',
    headingRule: '#8fc4a5',
    headingBackground: 'linear-gradient(90deg, rgba(226, 243, 231, .95), transparent)',
    headingBorderLeft: '10px solid #1d7a62',
    headingPadding: '.12em .36em .16em',
    sectionBackground: 'rgba(255,255,255,.52)',
    sectionBorderLeft: '10px solid #1d7a62',
    sectionPadding: '1.5rem 2.2rem',
    muted: '#47695d',
    panel: '#ffffff',
    surface: '#dcefe2'
  },
  gallery: {
    accent: '#a8651f',
    background: '#fffaf0',
    backgroundImage:
      'linear-gradient(90deg, rgba(168, 101, 31, .18) 0 13px, transparent 13px calc(100% - 13px), rgba(35, 59, 83, .15) calc(100% - 13px)), linear-gradient(145deg, rgba(244, 214, 165, .42), transparent 47%), repeating-linear-gradient(0deg, transparent 0 42px, rgba(118, 91, 61, .045) 42px 43px)',
    border: '#d6bc91',
    codeComment: '#7a6b58',
    codeKeyword: '#7a3e16',
    codeNumber: '#9a6700',
    codeString: '#386641',
    foreground: '#2e3c4d',
    headingColor: '#5d3520',
    headingRule: '#c89d63',
    headingBackground: 'rgba(255, 253, 247, .92)',
    headingBorderTop: '5px solid #a8651f',
    headingBorderBottom: '2px solid #243b53',
    headingPadding: '.22em .36em .26em',
    headingShadow: '8px 8px 0 rgba(168, 101, 31, .12)',
    sectionBackground: 'rgba(255, 253, 247, .86)',
    sectionBorderTop: '6px solid #a8651f',
    sectionBorderBottom: '2px solid #243b53',
    sectionPadding: '1.45rem 2.2rem 1.75rem',
    muted: '#665d52',
    panel: '#fffefa',
    surface: '#f0e2ca'
  },
  blueprint: {
    accent: '#62c7ff',
    background: '#071b35',
    backgroundImage:
      'linear-gradient(rgba(98, 199, 255, .10) 1px, transparent 1px), linear-gradient(90deg, rgba(98, 199, 255, .10) 1px, transparent 1px), linear-gradient(135deg, #071b35 0%, #0b294a 100%)',
    backgroundSize: '36px 36px, 36px 36px, auto',
    border: '#3c7198',
    codeComment: '#8aacc4',
    codeKeyword: '#8ed8ff',
    codeNumber: '#ffd166',
    codeString: '#8ce7bf',
    foreground: '#e7f7ff',
    headingColor: '#a7e2ff',
    headingRule: '#4d95be',
    headingRuleStyle: 'double',
    headingRuleWidth: '4px',
    muted: '#c1d8e7',
    panel: '#0a223d',
    surface: '#12395f'
  },
  aurora: {
    accent: '#6ee7c6',
    background: '#070c1d',
    backgroundImage:
      'radial-gradient(ellipse at 12% 0%, rgba(66, 196, 205, .34) 0%, transparent 35%), radial-gradient(ellipse at 90% 88%, rgba(108, 78, 203, .30) 0%, transparent 42%), linear-gradient(125deg, transparent 0 48%, rgba(70, 231, 198, .10) 48% 50%, transparent 50% 58%, rgba(112, 90, 237, .13) 58% 60%, transparent 60%)',
    border: '#3d7490',
    codeComment: '#93aec3',
    codeKeyword: '#9bf6dc',
    codeNumber: '#fcd34d',
    codeString: '#86efac',
    foreground: '#ecfff9',
    headingColor: '#b4f8df',
    headingRule: '#4cae96',
    headingBackground: 'linear-gradient(90deg, rgba(19, 68, 91, .82), rgba(15, 31, 59, .34), transparent)',
    headingBorderLeft: '4px solid #6ee7c6',
    headingBorderBottom: '2px solid #7659dc',
    headingPadding: '.16em .36em .20em',
    headingShadow: '0 0 28px rgba(76, 211, 183, .24)',
    sectionBackground: 'linear-gradient(115deg, rgba(19, 68, 91, .74), rgba(14, 27, 57, .22))',
    sectionBorderLeft: '5px solid #6ee7c6',
    sectionPadding: '1.5rem 2.2rem',
    muted: '#c2ddd8',
    panel: '#102844',
    surface: '#18385a'
  },
  orchid: {
    accent: '#8b4fa7',
    background: '#fffaff',
    backgroundImage:
      'radial-gradient(circle at 84% 15%, transparent 0 86px, rgba(139, 79, 167, .18) 87px 90px, transparent 91px 146px, rgba(203, 166, 220, .21) 147px 149px, transparent 150px), linear-gradient(135deg, rgba(230, 211, 241, .52), transparent 48%), repeating-linear-gradient(90deg, transparent 0 33px, rgba(139, 79, 167, .035) 33px 34px)',
    border: '#cfb3de',
    codeComment: '#786985',
    codeKeyword: '#713f8f',
    codeNumber: '#a16207',
    codeString: '#2f855a',
    foreground: '#34243f',
    headingColor: '#663780',
    headingRule: '#bd93d1',
    headingBackground: 'linear-gradient(90deg, rgba(246, 236, 252, .92), transparent)',
    headingBorderLeft: '4px double #8b4fa7',
    headingBorderRight: '1px solid #cfb3de',
    headingPadding: '.16em .40em .20em',
    headingShadow: '6px 6px 0 rgba(139, 79, 167, .08)',
    sectionBackground: 'rgba(255, 250, 255, .68)',
    sectionBorderLeft: '4px double #8b4fa7',
    sectionPadding: '1.5rem 2.2rem',
    muted: '#67566f',
    panel: '#fffaff',
    surface: '#eadcf3'
  },
  chalkboard: {
    accent: '#f5c85d',
    background: '#18241f',
    backgroundImage:
      'radial-gradient(circle at 12% 20%, rgba(255,255,255,.055) 0 1px, transparent 1.6px), radial-gradient(circle at 78% 72%, rgba(255,255,255,.04) 0 1px, transparent 1.4px)',
    backgroundSize: '43px 47px, 59px 53px',
    border: '#719e8c',
    codeComment: '#a5bcb1',
    codeKeyword: '#f5d98b',
    codeNumber: '#f3a96d',
    codeString: '#aee0c2',
    foreground: '#f5f0df',
    headingColor: '#fff9e8',
    headingRule: '#9bc8b5',
    headingRuleStyle: 'dashed',
    headingRuleWidth: '2px',
    muted: '#c0d3ca',
    panel: '#22332b',
    surface: '#2a4035'
  },
  neon: {
    accent: '#21e6ca',
    background: '#080914',
    backgroundImage:
      'radial-gradient(circle at 15% 12%, rgba(41, 212, 255, .25) 0%, transparent 30%), radial-gradient(circle at 85% 85%, rgba(245, 60, 172, .22) 0%, transparent 34%)',
    border: '#5453a5',
    codeComment: '#a7a9d4',
    codeKeyword: '#69ecff',
    codeNumber: '#ffe469',
    codeString: '#73f4bb',
    foreground: '#f3f0ff',
    headingColor: '#ffffff',
    headingRule: '#e95ab9',
    headingRuleWidth: '2px',
    muted: '#d0cdea',
    panel: '#14142c',
    surface: '#20204a'
  },
  risograph: {
    accent: '#e14c67',
    background: '#fff6e5',
    backgroundImage:
      'linear-gradient(115deg, rgba(225, 76, 103, .13) 0%, transparent 42%), repeating-linear-gradient(45deg, rgba(32, 73, 126, .045) 0 1px, transparent 1px 5px)',
    border: '#d4b68b',
    codeComment: '#7c6c62',
    codeKeyword: '#bd3150',
    codeNumber: '#b36c00',
    codeString: '#387a62',
    foreground: '#173043',
    headingColor: '#214e78',
    headingRule: '#e14c67',
    headingRuleWidth: '4px',
    muted: '#625d57',
    panel: '#fffaf0',
    surface: '#f6dfbb'
  },
  botanical: {
    accent: '#42795b',
    background: '#f7f4eb',
    backgroundImage:
      'radial-gradient(ellipse at 90% 4%, rgba(102, 158, 116, .22) 0%, transparent 32%), radial-gradient(ellipse at 4% 100%, rgba(218, 183, 105, .16) 0%, transparent 30%)',
    border: '#afc6aa',
    codeComment: '#6e7e69',
    codeKeyword: '#2d6848',
    codeNumber: '#a76a1b',
    codeString: '#47785b',
    foreground: '#243a2c',
    headingColor: '#315d42',
    headingRule: '#8caf83',
    muted: '#5f7260',
    panel: '#fffdf7',
    surface: '#e3ecdb'
  },
  'glass-aurora': {
    accent: '#8df4dc',
    background: '#0a1025',
    backgroundImage:
      'radial-gradient(ellipse at 18% 8%, rgba(61, 203, 209, .38) 0%, transparent 33%), radial-gradient(ellipse at 87% 82%, rgba(179, 102, 255, .30) 0%, transparent 38%), linear-gradient(130deg, rgba(75, 121, 240, .16), transparent 48%)',
    border: 'rgba(184, 243, 238, .36)',
    codeComment: '#b3cad8',
    codeKeyword: '#a7fff0',
    codeNumber: '#ffe08a',
    codeString: '#b9f5bf',
    foreground: '#f0fbff',
    headingBackground: 'rgba(15, 35, 70, .48)',
    headingBorderLeft: '1px solid rgba(196, 255, 247, .70)',
    headingBorderTop: '1px solid rgba(196, 255, 247, .48)',
    headingBorderRight: '1px solid rgba(196, 255, 247, .28)',
    headingBorderBottom: '1px solid rgba(196, 255, 247, .22)',
    headingBackdropFilter: 'blur(18px) saturate(150%)',
    headingColor: '#ecfffb',
    headingPadding: '.18em .42em .22em',
    headingShadow: '0 16px 38px rgba(0, 0, 0, .22)',
    muted: '#c8dae9',
    panel: 'rgba(17, 45, 79, .48)',
    sectionBackground: 'rgba(17, 45, 79, .52)',
    sectionBorderLeft: '1px solid rgba(196, 255, 247, .68)',
    sectionBorderTop: '1px solid rgba(196, 255, 247, .45)',
    sectionBackdropFilter: 'blur(22px) saturate(150%)',
    sectionPadding: '1.5rem 2.2rem',
    surface: '#1a3c61'
  },
  'glass-citrus': {
    accent: '#167b68',
    background: '#dff3ee',
    backgroundImage:
      'radial-gradient(circle at 13% 8%, rgba(255, 244, 164, .78) 0%, transparent 28%), radial-gradient(circle at 88% 20%, rgba(102, 214, 183, .48) 0%, transparent 32%), radial-gradient(circle at 72% 92%, rgba(112, 167, 255, .28) 0%, transparent 36%)',
    border: 'rgba(255, 255, 255, .72)',
    codeComment: '#55746d',
    codeKeyword: '#126754',
    codeNumber: '#9b6200',
    codeString: '#237857',
    foreground: '#16473f',
    headingBackground: 'rgba(255, 255, 255, .48)',
    headingBorderLeft: '1px solid rgba(255, 255, 255, .84)',
    headingBorderTop: '1px solid rgba(255, 255, 255, .84)',
    headingBorderRight: '1px solid rgba(24, 126, 108, .18)',
    headingBorderBottom: '1px solid rgba(24, 126, 108, .16)',
    headingBackdropFilter: 'blur(18px) saturate(135%)',
    headingColor: '#145e50',
    headingPadding: '.18em .42em .22em',
    headingShadow: '0 14px 30px rgba(49, 100, 91, .14)',
    muted: '#496b63',
    panel: 'rgba(255, 255, 255, .52)',
    sectionBackground: 'rgba(255, 255, 255, .46)',
    sectionBorderLeft: '1px solid rgba(255, 255, 255, .86)',
    sectionBorderTop: '1px solid rgba(255, 255, 255, .86)',
    sectionBackdropFilter: 'blur(22px) saturate(135%)',
    sectionPadding: '1.5rem 2.2rem',
    surface: '#c7e8df'
  },
  'glass-rose': {
    accent: '#a34c85',
    background: '#2a1734',
    backgroundImage:
      'radial-gradient(circle at 15% 18%, rgba(255, 157, 207, .38) 0%, transparent 31%), radial-gradient(circle at 85% 8%, rgba(147, 184, 255, .30) 0%, transparent 34%), radial-gradient(circle at 72% 88%, rgba(255, 194, 139, .20) 0%, transparent 37%)',
    border: 'rgba(255, 224, 244, .32)',
    codeComment: '#d2b6ca',
    codeKeyword: '#ffc1e4',
    codeNumber: '#ffe09a',
    codeString: '#bdedce',
    foreground: '#fff5fc',
    headingBackground: 'rgba(89, 37, 88, .42)',
    headingBorderLeft: '1px solid rgba(255, 235, 247, .66)',
    headingBorderTop: '1px solid rgba(255, 235, 247, .46)',
    headingBorderRight: '1px solid rgba(255, 235, 247, .24)',
    headingBorderBottom: '1px solid rgba(255, 235, 247, .18)',
    headingBackdropFilter: 'blur(18px) saturate(145%)',
    headingColor: '#fff4fc',
    headingPadding: '.18em .42em .22em',
    headingShadow: '0 16px 38px rgba(22, 5, 25, .28)',
    muted: '#e3c9dc',
    panel: 'rgba(86, 38, 90, .45)',
    sectionBackground: 'rgba(86, 38, 90, .49)',
    sectionBorderLeft: '1px solid rgba(255, 235, 247, .66)',
    sectionBorderTop: '1px solid rgba(255, 235, 247, .44)',
    sectionBackdropFilter: 'blur(22px) saturate(145%)',
    sectionPadding: '1.5rem 2.2rem',
    surface: '#512554'
  },
  'glass-sunset': {
    accent: '#ffd18a',
    background: '#25122a',
    backgroundImage:
      'radial-gradient(ellipse at 8% 84%, rgba(255, 127, 80, .48) 0%, transparent 37%), radial-gradient(ellipse at 83% 14%, rgba(255, 205, 122, .30) 0%, transparent 30%), linear-gradient(145deg, rgba(174, 72, 168, .25), transparent 48%)',
    border: 'rgba(255, 224, 198, .34)',
    codeComment: '#dec2cb',
    codeKeyword: '#ffd3ac',
    codeNumber: '#ffe282',
    codeString: '#baf0c3',
    foreground: '#fff5ed',
    headingBackground: 'rgba(103, 43, 74, .44)',
    headingBorderLeft: '1px solid rgba(255, 239, 220, .70)',
    headingBorderTop: '1px solid rgba(255, 239, 220, .48)',
    headingBorderRight: '1px solid rgba(255, 239, 220, .22)',
    headingBorderBottom: '1px solid rgba(255, 205, 138, .34)',
    headingBackdropFilter: 'blur(18px) saturate(150%)',
    headingColor: '#fff7ed',
    headingPadding: '.18em .42em .22em',
    headingShadow: '0 16px 40px rgba(24, 5, 23, .28)',
    muted: '#e5cbd2',
    panel: 'rgba(105, 46, 73, .44)',
    sectionBackground: 'rgba(105, 46, 73, .50)',
    sectionBorderLeft: '1px solid rgba(255, 239, 220, .68)',
    sectionBorderTop: '1px solid rgba(255, 239, 220, .44)',
    sectionBackdropFilter: 'blur(22px) saturate(150%)',
    sectionPadding: '1.5rem 2.2rem',
    surface: '#592c4d'
  },
  'glass-arctic': {
    accent: '#176d9e',
    background: '#dcedf7',
    backgroundImage:
      'radial-gradient(circle at 14% 8%, rgba(255, 255, 255, .92) 0%, transparent 26%), radial-gradient(ellipse at 84% 20%, rgba(106, 211, 241, .48) 0%, transparent 33%), linear-gradient(145deg, rgba(154, 190, 255, .22), transparent 55%)',
    border: 'rgba(255, 255, 255, .80)',
    codeComment: '#5e7f93',
    codeKeyword: '#145e91',
    codeNumber: '#996800',
    codeString: '#267b67',
    foreground: '#173e59',
    headingBackground: 'rgba(255, 255, 255, .50)',
    headingBorderLeft: '1px solid rgba(255, 255, 255, .90)',
    headingBorderTop: '1px solid rgba(255, 255, 255, .90)',
    headingBorderRight: '1px solid rgba(36, 134, 178, .18)',
    headingBorderBottom: '1px solid rgba(36, 134, 178, .20)',
    headingBackdropFilter: 'blur(18px) saturate(125%)',
    headingColor: '#155f8f',
    headingPadding: '.18em .42em .22em',
    headingShadow: '0 16px 34px rgba(49, 101, 137, .14)',
    muted: '#4d7187',
    panel: 'rgba(255, 255, 255, .52)',
    sectionBackground: 'rgba(255, 255, 255, .48)',
    sectionBorderLeft: '1px solid rgba(255, 255, 255, .90)',
    sectionBorderTop: '1px solid rgba(255, 255, 255, .90)',
    sectionBackdropFilter: 'blur(22px) saturate(125%)',
    sectionPadding: '1.5rem 2.2rem',
    surface: '#c3e2ef'
  },
  'glass-forest': {
    accent: '#b7f3b0',
    background: '#0d261e',
    backgroundImage:
      'radial-gradient(ellipse at 12% 12%, rgba(88, 195, 139, .34) 0%, transparent 31%), radial-gradient(ellipse at 88% 87%, rgba(227, 190, 89, .20) 0%, transparent 36%), linear-gradient(135deg, rgba(46, 117, 84, .20), transparent 50%)',
    border: 'rgba(204, 245, 213, .30)',
    codeComment: '#b6d0bf',
    codeKeyword: '#c4f6c3',
    codeNumber: '#f5d47a',
    codeString: '#9eebc1',
    foreground: '#efffec',
    headingBackground: 'rgba(23, 73, 55, .46)',
    headingBorderLeft: '1px solid rgba(217, 255, 214, .66)',
    headingBorderTop: '1px solid rgba(217, 255, 214, .44)',
    headingBorderRight: '1px solid rgba(217, 255, 214, .20)',
    headingBorderBottom: '1px solid rgba(183, 243, 176, .24)',
    headingBackdropFilter: 'blur(18px) saturate(140%)',
    headingColor: '#edffe8',
    headingPadding: '.18em .42em .22em',
    headingShadow: '0 16px 38px rgba(0, 20, 10, .30)',
    muted: '#c5dfcb',
    panel: 'rgba(23, 73, 55, .46)',
    sectionBackground: 'rgba(23, 73, 55, .51)',
    sectionBorderLeft: '1px solid rgba(217, 255, 214, .66)',
    sectionBorderTop: '1px solid rgba(217, 255, 214, .42)',
    sectionBackdropFilter: 'blur(22px) saturate(140%)',
    sectionPadding: '1.5rem 2.2rem',
    surface: '#1b4938'
  },
  'glass-cosmic': {
    accent: '#d9b5ff',
    background: '#120b28',
    backgroundImage:
      'radial-gradient(circle at 18% 24%, rgba(140, 108, 255, .38) 0%, transparent 28%), radial-gradient(circle at 79% 16%, rgba(74, 209, 255, .25) 0%, transparent 27%), radial-gradient(circle at 76% 88%, rgba(255, 104, 186, .23) 0%, transparent 34%)',
    border: 'rgba(232, 215, 255, .30)',
    codeComment: '#c3b5d9',
    codeKeyword: '#e1c7ff',
    codeNumber: '#ffe687',
    codeString: '#b6f1df',
    foreground: '#fbf5ff',
    headingBackground: 'rgba(48, 27, 89, .45)',
    headingBorderLeft: '1px solid rgba(244, 232, 255, .68)',
    headingBorderTop: '1px solid rgba(244, 232, 255, .46)',
    headingBorderRight: '1px solid rgba(244, 232, 255, .21)',
    headingBorderBottom: '1px solid rgba(217, 181, 255, .25)',
    headingBackdropFilter: 'blur(18px) saturate(150%)',
    headingColor: '#faf1ff',
    headingPadding: '.18em .42em .22em',
    headingShadow: '0 16px 42px rgba(3, 1, 16, .34)',
    muted: '#d8cbe9',
    panel: 'rgba(48, 27, 89, .46)',
    sectionBackground: 'rgba(48, 27, 89, .51)',
    sectionBorderLeft: '1px solid rgba(244, 232, 255, .66)',
    sectionBorderTop: '1px solid rgba(244, 232, 255, .43)',
    sectionBackdropFilter: 'blur(22px) saturate(150%)',
    sectionPadding: '1.5rem 2.2rem',
    surface: '#321d59'
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
