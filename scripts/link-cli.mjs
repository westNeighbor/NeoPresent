#!/usr/bin/env node

import { chmod, lstat, mkdir, readlink, symlink, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(workspaceRoot, 'packages/cli/dist/index.js');
const binDirectory = process.env.PNPM_HOME || resolve(homedir(), 'Library/pnpm/bin');
const command = resolve(binDirectory, 'neopresent');

await mkdir(binDirectory, { recursive: true });
await chmod(target, 0o755);

try {
  const status = await lstat(command);
  if (!status.isSymbolicLink()) {
    throw new Error(`${command} already exists and is not a symbolic link.`);
  }
  const existingTarget = await readlink(command);
  if (resolve(binDirectory, existingTarget) !== target) await unlink(command);
  else {
    console.log(`✓ NeoPresent command is already linked at ${command}`);
    process.exit(0);
  }
} catch (error) {
  if (error?.code !== 'ENOENT' && !String(error?.message).includes('already exists')) throw error;
  if (String(error?.message).includes('already exists')) throw error;
}

await symlink(target, command);
console.log(`✓ Linked NeoPresent command at ${command}`);
if (!process.env.PNPM_HOME) {
  console.log('  If the command is not found, run "pnpm setup" once and restart your shell.');
}
