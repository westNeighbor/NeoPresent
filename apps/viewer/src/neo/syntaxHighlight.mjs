const languageAliases = new Map([
  ['c++', 'cpp'],
  ['cc', 'cpp'],
  ['cxx', 'cpp'],
  ['h', 'cpp'],
  ['hpp', 'cpp'],
  ['javascript', 'js'],
  ['jsx', 'js'],
  ['ts', 'typescript'],
  ['tsx', 'typescript'],
  ['cs', 'csharp'],
  ['c#', 'csharp'],
  ['golang', 'go'],
  ['rs', 'rust'],
  ['visual-basic', 'vb'],
  ['visualbasic', 'vb'],
  ['vbnet', 'vb'],
  ['vb.net', 'vb'],
  ['mysql', 'sql'],
  ['postgres', 'sql'],
  ['postgresql', 'sql'],
  ['sqlite', 'sql'],
  ['f77', 'fortran'],
  ['f90', 'fortran'],
  ['f95', 'fortran'],
  ['f03', 'fortran'],
  ['rb', 'ruby'],
  ['pl', 'perl'],
  ['cob', 'cobol'],
  ['asm', 'assembly'],
  ['nasm', 'assembly'],
  ['gas', 'assembly'],
  ['delphi', 'pascal'],
  ['object-pascal', 'pascal'],
  ['objectpascal', 'pascal'],
  ['jl', 'julia'],
  ['octave', 'matlab'],
  ['lv', 'labview'],
  ['g', 'labview'],
  ['adb', 'ada'],
  ['ads', 'ada'],
  ['kt', 'kotlin'],
  ['kts', 'kotlin'],
  ['ps1', 'powershell'],
  ['pwsh', 'powershell'],
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
  java: 'abstract assert boolean break byte case catch char class const continue default do double else enum extends false final finally float for goto if implements import instanceof int interface long native new null package private protected public return short static strictfp super switch synchronized this throw throws transient true try void volatile while record sealed permits',
  typescript:
    'abstract any as asserts async await bigint boolean break case catch class const constructor continue declare default delete do else enum export extends false finally for from function get if implements import in infer instanceof interface keyof let module namespace never new null number object of override private protected public readonly require return set static string super switch symbol this throw true try type typeof undefined unique unknown var void while with yield',
  csharp:
    'abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly record ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while async await dynamic get init set value var yield',
  go: 'break case chan const continue default defer else fallthrough false for func go goto if import interface map nil package range return select struct switch true type var',
  rust: 'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final macro override priv typeof unsized virtual yield',
  vb: 'addhandler addressof alias and andalso as boolean byref byte byval call case catch cbool cbyte cchar cdate cdbl cdec char cint class clng cobj const continue csbyte cshort csng cstr ctype cuint culng cushort date decimal declare default delegate dim directcast do double each else elseif end enum erase error event exit false finally for friend function get gettype global gosub goto handles if implements imports in inherits integer interface is isnot let lib like long loop me mod module mustinherit mustoverride mybase myclass namespace narrowing new next not nothing notinheritable notoverridable object of on operator option optional or orelse out overloads overridable overrides paramarray partial private property protected public raiseevent readonly redim rem removehandler resume return sbyte select set shadows shared short single static step stop string structure sub synclock then throw to true try trycast typeof uinteger ulong ushort using when while widening with withevents writeonly xor',
  sql: 'add all alter and any as asc backup between by case check column constraint create database default delete desc distinct drop exec exists foreign from full group having in index inner insert into is join key left like limit not null or order outer primary procedure right rownum select set table top truncate union unique update values view where with grant revoke commit rollback begin end function trigger over partition',
  php: 'abstract and array as break callable case catch class clone const continue declare default die do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum eval exit extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new null or print private protected public readonly require require_once return static switch throw trait true try unset use var while xor yield',
  fortran: 'allocate allocatable assignment associate asynchronous backspace bind block call case character class close common complex contains continue cycle data deallocate default dimension do double else elsewhere end endif entry enum equivalence error exit external final flush forall format function generic goto if implicit import in include inquire integer intent interface intrinsic logical module namelist none nullify only open operator optional parameter pause pointer precision print private procedure program protected public pure read real recursive result return rewind save select sequence stop subroutine target then type use value volatile wait where while write',
  ruby: 'alias and begin break case class def defined do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield BEGIN END',
  swift: 'associatedtype break case catch class continue convenience default defer deinit do else enum extension fallthrough false fileprivate final for func guard if import in indirect init inout internal is lazy let mutating nil nonmutating open operator override private protocol public repeat required rethrows return self Self static struct subscript super switch throw throws true try typealias var weak where while async await actor any some',
  perl: 'break continue do else elsif eq for foreach ge given goto grep gt if last le local lt m map my ne next no package q qq qr qw qx redo require return s say sort state sub tr unless until use when while x xor y our undef',
  cobol: 'accept access add advancing after all alphabet alphabetic alphabetic-lower alphabetic-upper alphanumeric alphanumeric-edited also alter alternate and any are area areas ascending assign at author before binary blank block bottom by call cancel cd cf ch character characters class clock-units close cobol code code-set collating column comma common communication comp comp-1 comp-2 comp-3 comp-4 computational compute configuration contains content continue control controls converting copy corr corresponding count currency data date date-compiled date-written day day-of-week de debugging decimal-point declaratives delete delimited delimiter depending descending destination detail display divide division down duplicates dynamic else end end-add end-call end-compute end-delete end-divide end-evaluate end-if end-multiply end-of-page end-perform end-read end-receive end-return end-rewrite end-search end-start end-string end-subtract end-unstring end-write environment evaluate every exception exit extend external false fd file file-control filler final first footing for from function generate giving global greater group heading high-value high-values i-o i-o-control identification if in index indexed indicate initial initialize initiate input input-output inspect installation into invalid is just justified key label last leading left length less limit limits linage linage-counter line line-counter lines linkage lock low-value low-values memory merge message mode modules move multiple multiply native negative next no not null number numeric numeric-edited object-computer occurs of off ommitted on open optional or order organization other output overflow packed-decimal padding page page-counter perform pf ph pic picture plus pointer position positive printing procedure procedures proceed program-id quote quotes random read ready receive record records reel reference relative remainder removal renames replace replacing rerun reserve reset return returning reversed rewind rewrite right rounded run same sd search section security segment segment-limit select send sentence separate sequence sequential set sign size sort sort-merge source source-computer spaces special-names standard standard-1 start status stop string sub-queue-1 sub-queue-2 sub-queue-3 subtract sum suppress symbolic sync synchronized table tallying tape terminal terminate test text than then through thru time times to top trailing true unit unstring until up upon usage use using value values varying when with words working-storage write zero zeroes zeros',
  assembly: 'section segment global extern bits org align db dw dd dq dt resb resw resd resq equ times byte word dword qword ptr mov lea push pop call ret jmp je jne jz jnz ja jae jb jbe jg jge jl jle cmp test add sub mul imul div idiv inc dec neg and or xor not shl shr sar rol ror nop int syscall loop rep repe repne lock',
  pascal: 'and array as asm begin case class const constructor destructor dispinterface div do downto else end except exports file finalization finally for function goto if implementation in inherited initialization inline interface is label library mod nil not object of on operator or out packed procedure program property raise record repeat resourcestring set shl shr string then threadvar to try type unit until uses var while with xor absolute abstract assembler automated cdecl contains default deprecated dynamic experimental export external far forward generic helper implements index message name near nodefault platform private protected public published read readonly register reintroduce requires resident safecall sealed static stored strict unsafe varargs virtual write writeonly',
  julia: 'baremodule begin break catch const continue do else elseif end export false finally for function global if import let local macro module quote return struct true try using while abstract type primitive mutable where',
  matlab: 'break case catch classdef continue else elseif end for function global if otherwise parfor persistent return spmd switch try while true false',
  labview: 'while loop for case structure event structure sequence formula node local variable global variable property node invoke node cluster array waveform queue notifier user event subvi typedef enum variant error in error out',
  sas: 'and array attrib by call cards class data datalines delete do drop else end file filename format if infile informat input keep label length libname merge missing not null or options otherwise output proc quit rename retain run select set stop then title update when where',
  ada: 'abort abs abstract accept access aliased all and array at begin body case constant declare delay delta digits do else elsif end entry exception exit for function generic goto if in interface is limited loop mod new not null of or others out overriding package pragma private procedure protected raise range record rem renames requeue return reverse select separate some subtype synchronized tagged task terminate then type until use when while with xor',
  kotlin: 'as break class continue do else false for fun if in interface is null object package return super this throw true try typealias typeof val var when while by catch constructor delegate dynamic field file finally get import init param property receiver set setparam where actual abstract annotation companion const crossinline data enum expect external final infix inline inner internal lateinit noinline open operator out override private protected public reified sealed suspend tailrec vararg',
  lua: 'and break do else elseif end false for function goto if in local nil not or repeat return then true until while',
  powershell: 'begin break catch class continue data define do dynamicparam else elseif end enum exit filter finally for foreach from function hidden if in param process return static switch throw trap try until using var while workflow parallel sequence configuration true false null',
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
    /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:[^']*)'|`(?:\\.|[^`\\])*`|\$\{?[_a-zA-Z][_a-zA-Z0-9]*\}?|\b\d+(?:\.\d+)?\b/g,
  java: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/g,
  typescript: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/g,
  csharp: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|@?"(?:""|[^"])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/g,
  go: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`[^`]*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/g,
  rust: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|r#*"[\s\S]*?"#*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[a-zA-Z_]\w*!|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/g,
  vb: /(?:^|\s)REM\b[^\n]*|'[^\n]*|"(?:""|[^"])*"|\b\d+(?:\.\d+)?\b/gim,
  sql: /\/\*[\s\S]*?\*\/|--[^\n]*|'(?:''|[^'])*'|"(?:""|[^"])*"|\b\d+(?:\.\d+)?\b/g,
  php: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\$[a-zA-Z_][\w]*|\b\d+(?:\.\d+)?\b/g,
  fortran: /![^\n]*|"(?:""|[^"])*"|'(?:''|[^'])*'|\b\d+(?:\.\d+)?(?:[eEdD][+-]?\d+)?\b/g,
  ruby: /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|:[a-zA-Z_]\w*|\b\d+(?:\.\d+)?\b/g,
  swift: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/g,
  perl: /#[^\n]*|qq?\{[\s\S]*?\}|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[$@%][a-zA-Z_]\w*|\b\d+(?:\.\d+)?\b/g,
  cobol: /\*>[^\n]*|^\s{0,6}\*[^\n]*|"(?:""|[^"])*"|'(?:''|[^'])*'|\b\d+(?:\.\d+)?\b/gm,
  assembly: /;[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/g,
  pascal: /\(\*[\s\S]*?\*\)|\{[\s\S]*?\}|\/\/[^\n]*|'(?:''|[^'])*'|\b(?:\$[\da-fA-F]+|\d+(?:\.\d+)?)\b/g,
  julia: /#[^\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b/g,
  matlab: /%\{[\s\S]*?%\}|%[^\n]*|"(?:""|[^"])*"|'(?:''|[^'])*'|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g,
  labview: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|\b\d+(?:\.\d+)?\b/g,
  sas: /\/\*[\s\S]*?\*\/|^\s*\*[^;]*;|"(?:""|[^"])*"|'(?:''|[^'])*'|\b\d+(?:\.\d+)?\b/gm,
  ada: /--[^\n]*|"(?:""|[^"])*"|'(?:''|[^'])*'|\b\d+(?:\.\d+)?\b/g,
  kotlin: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/g,
  lua: /--\[\[[\s\S]*?\]\]|--[^\n]*|\[\[[\s\S]*?\]\]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b/g,
  powershell: /<#[\s\S]*?#>|#[^\n]*|@?["'](?:\\.|[^"'])*["']|\$[a-zA-Z_][\w:]*|\b\d+(?:\.\d+)?\b/g
};

const commentPrefixes = {
  js: ['//', '/*'],
  typescript: ['//', '/*'],
  cpp: ['//', '/*', '#'],
  java: ['//', '/*'],
  csharp: ['//', '/*'],
  go: ['//', '/*'],
  rust: ['//', '/*'],
  swift: ['//', '/*'],
  kotlin: ['//', '/*'],
  python: ['#'],
  r: ['#'],
  shell: ['#'],
  vb: ["'", 'rem '],
  sql: ['--', '/*'],
  php: ['//', '/*', '#'],
  fortran: ['!'],
  ruby: ['#'],
  perl: ['#'],
  cobol: ['*>', '*'],
  assembly: [';', '#'],
  pascal: ['(*', '{', '//'],
  julia: ['#'],
  matlab: ['%', '%{'],
  labview: ['//', '/*'],
  sas: ['/*', '*'],
  ada: ['--'],
  lua: ['--'],
  powershell: ['#', '<#']
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
    const comment = isCommentToken(normalizedLanguage, trimmed);
    const keywordToken =
      trimmed.startsWith('$') || (normalizedLanguage === 'rust' && /^\w+!$/.test(trimmed));
    const color =
      comment
        ? normalizedLanguage === 'cpp' && trimmed.startsWith('#')
          ? theme.codeKeyword
          : theme.codeComment
        : isStringToken(normalizedLanguage, trimmed)
          ? theme.codeString
          : keywordToken
            ? theme.codeKeyword
            : theme.codeNumber;
    tokens.push({
      tag: 'span',
      text: value,
      style: { color }
    });
    cursor = match.index + value.length;
  }
  if (cursor < code.length)
    tokens.push(...highlightKeywords(code.slice(cursor), keywordPattern, theme));
  return tokens;
}

function isCommentToken(language, value) {
  const normalized = value.toLowerCase();
  return (commentPrefixes[language] ?? []).some((prefix) => normalized.startsWith(prefix));
}

function isStringToken(language, value) {
  if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) return true;
  if (language === 'csharp' && value.startsWith('@"')) return true;
  if (language === 'rust' && /^r#*"/.test(value)) return true;
  if (language === 'perl' && /^qq?\{/.test(value)) return true;
  if (language === 'powershell' && /^@["']/.test(value)) return true;
  return false;
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
