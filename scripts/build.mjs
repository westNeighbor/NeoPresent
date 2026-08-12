#!/usr/bin/env node

import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url));
const typescript = resolve(workspaceRoot, 'node_modules/typescript/bin/tsc');
const projects = [
  ['core', 'packages/core/tsconfig.json'],
  ['plugin API', 'packages/plugin-api/tsconfig.json'],
  ['Markdown compiler', 'packages/markdown/tsconfig.json'],
  ['renderer', 'packages/renderer/tsconfig.json'],
  ['CLI', 'packages/cli/tsconfig.json'],
  ['editor', 'apps/editor/tsconfig.json'],
  ['viewer type-check', 'apps/viewer/tsconfig.json', '--noEmit']
];

try {
  await access(typescript);
} catch {
  console.error('NeoPresent dependencies are not installed. Run "pnpm install" first.');
  process.exit(1);
}

console.log('Building NeoPresent…');
for (const [label, config, option] of projects) {
  await run(process.execPath, [
    typescript,
    '-p',
    resolve(workspaceRoot, config),
    ...(option ? [option] : [])
  ]);
  console.log(`✓ ${label}`);
}
console.log('✓ NeoPresent build complete');

function run(command, arguments_) {
  return new Promise((complete, fail) => {
    const child = spawn(command, arguments_, { cwd: workspaceRoot, stdio: 'inherit' });
    child.once('error', fail);
    child.once('exit', (code, signal) => {
      if (code === 0) complete();
      else {
        const reason = signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`;
        fail(new Error(`Build stopped with ${reason}.`));
      }
    });
  });
}
