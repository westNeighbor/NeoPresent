const languageAliases = new Map([
  ['c++', 'cpp'],
  ['cc', 'cpp'],
  ['cxx', 'cpp'],
  ['h', 'cpp'],
  ['hpp', 'cpp'],
  ['javascript', 'js'],
  ['jsx', 'js'],
  ['typescript', 'js'],
  ['tsx', 'js'],
  ['py', 'python'],
  ['shell', 'shell'],
  ['sh', 'shell'],
  ['bash', 'shell'],
  ['zsh', 'shell']
]);

const keywords = {
  js: 'as async await break case catch class const continue default else enum export false finally for from function if import in interface let new null of return static switch this throw true try type undefined var while with yield',
  python:
    'and as assert async await break class continue def del elif else except false finally for from global if import in is lambda none nonlocal not or pass raise return true try while with yield',
  cpp: 'alignas alignof auto bool break case catch char class const constexpr continue default delete do double else enum explicit export extern false float for friend if inline int long namespace new nullptr operator private protected public register return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while',
  r: 'break else false for function if in inf na nan next null repeat return true while',
  shell:
    'case do done elif else esac export fi for function if in local readonly return select set shift then time trap unset until while'
};

const tokenPatterns = {
  js: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/g,
  python:
    /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/g,
  cpp: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|^[ \t]*#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/gm,
  r: /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?)[lL]?\b/gi,
  shell:
    /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:[^']*)'|`(?:\\.|[^`\\])*`|\$\{?[_a-zA-Z][_a-zA-Z0-9]*\}?|\b\d+(?:\.\d+)?\b/g
};

/** Produces safe VDOM nodes and spans without injecting source as HTML. */
export function highlightCode(code, language = '', theme) {
  const requested = String(language).toLowerCase();
  const normalizedLanguage = languageAliases.get(requested) ?? requested;
  const tokenPattern = tokenPatterns[normalizedLanguage];
  const languageKeywords = keywords[normalizedLanguage];
  if (!tokenPattern || !languageKeywords) return [{ vtype: 'text', text: code }];

  const keywordPattern = new RegExp(`\\b(?:${languageKeywords.replaceAll(' ', '|')})\\b`, 'gi');
  const tokens = [];
  let cursor = 0;
  let match;
  tokenPattern.lastIndex = 0;
  while ((match = tokenPattern.exec(code)) !== null) {
    if (match.index > cursor)
      tokens.push(...highlightKeywords(code.slice(cursor, match.index), keywordPattern, theme));
    const value = match[0];
    const trimmed = value.trimStart();
    const color =
      trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('#')
        ? normalizedLanguage === 'cpp' && trimmed.startsWith('#')
          ? theme.codeKeyword
          : theme.codeComment
        : trimmed.startsWith('"') || trimmed.startsWith("'") || trimmed.startsWith('`')
          ? theme.codeString
          : trimmed.startsWith('$')
            ? theme.codeKeyword
            : theme.codeNumber;
    tokens.push({ tag: 'span', text: value, style: { color } });
    cursor = match.index + value.length;
  }
  if (cursor < code.length)
    tokens.push(...highlightKeywords(code.slice(cursor), keywordPattern, theme));
  return tokens;
}

function highlightKeywords(source, keywordPattern, theme) {
  const tokens = [];
  let cursor = 0;
  let match;
  keywordPattern.lastIndex = 0;
  while ((match = keywordPattern.exec(source)) !== null) {
    if (match.index > cursor)
      tokens.push({ vtype: 'text', text: source.slice(cursor, match.index) });
    tokens.push({ tag: 'span', text: match[0], style: { color: theme.codeKeyword } });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) tokens.push({ vtype: 'text', text: source.slice(cursor) });
  return tokens;
}
