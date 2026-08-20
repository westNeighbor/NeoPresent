import { describe, expect, it } from 'vitest';

import { highlightCode } from './syntaxHighlight.mjs';

const theme = {
  codeComment: '#6b7280',
  codeKeyword: '#7c3aed',
  codeNumber: '#ea580c',
  codeString: '#16a34a'
};

const samples = {
  ada: 'procedure Main is begin null; end Main;',
  assembly: 'mov eax, 1',
  cobol: '       IF READY DISPLAY "YES" END-IF',
  cpp: 'int main() { return 0; }',
  csharp: 'public class Example { }',
  fortran: 'program demo\nend program demo',
  go: 'package main\nfunc main() {}',
  java: 'public class Example { }',
  js: 'const value = 1;',
  julia: 'function demo()\nend',
  kotlin: 'fun main() {}',
  labview: 'while loop',
  lua: 'local value = 1',
  matlab: 'function value = demo()\nend',
  pascal: 'program Demo; begin end.',
  perl: 'my $value = 1;',
  php: 'function demo() { return true; }',
  powershell: 'function Test-Value { return $true }',
  python: 'def demo():\n    return True',
  r: 'value <- function() TRUE',
  ruby: 'def demo\nend',
  rust: 'fn main() {}',
  sas: 'data example; set source; run;',
  shell: 'if true; then echo yes; fi',
  sql: 'SELECT value FROM sample',
  swift: 'func main() {}',
  typescript: 'interface Example { value: number }',
  vb: 'Public Class Example\nEnd Class'
};

describe('built-in syntax highlighting families', () => {
  it.each(Object.entries(samples))('highlights %s keywords', (language, source) => {
    const tokens = highlightCode(source, language, theme);
    expect(tokens.some((token) => token.style?.color === theme.codeKeyword)).toBe(true);
  });

  it('recognizes common aliases', () => {
    expect(highlightCode('interface A {}', 'tsx', theme)).toEqual(
      highlightCode('interface A {}', 'typescript', theme)
    );
    expect(highlightCode('public class A {}', 'cs', theme)).toEqual(
      highlightCode('public class A {}', 'csharp', theme)
    );
    expect(highlightCode('function Test {}', 'pwsh', theme)).toEqual(
      highlightCode('function Test {}', 'powershell', theme)
    );
  });

  it('highlights Rust macros separately from ordinary identifiers', () => {
    const tokens = highlightCode('println!("Hello");', 'rust', theme);
    expect(tokens).toContainEqual({
      tag: 'span',
      text: 'println!',
      style: { color: theme.codeKeyword }
    });
  });

  it('keeps unknown languages as safe plain text', () => {
    expect(highlightCode('<unknown>', 'not-a-language', theme)).toEqual([
      { vtype: 'text', text: '<unknown>' }
    ]);
  });
});
