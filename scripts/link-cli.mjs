#!/usr/bin/env node

import { chmod, lstat, mkdir, readFile, readlink, symlink, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(workspaceRoot, 'packages/cli/dist/index.js');
const pnpmHome = process.env.PNPM_HOME?.trim();
const pnpmBinCandidates = [
  ...(pnpmHome ? [resolve(pnpmHome, 'bin'), pnpmHome] : []),
  resolve(homedir(), 'Library/pnpm/bin'),
  resolve(homedir(), 'Library/pnpm')
];
const pathDirectories = new Set((process.env.PATH ?? '').split(delimiter).filter(Boolean));
const binDirectory =
  pnpmBinCandidates.find((candidate) => pathDirectories.has(candidate)) ?? pnpmBinCandidates[0];
const command = resolve(binDirectory, 'neopresent');

await mkdir(binDirectory, { recursive: true });
await chmod(target, 0o755);

try {
  const status = await lstat(command);
  if (!status.isSymbolicLink()) {
    // pnpm link creates a regular shell wrapper on macOS. Replace only an
    // existing NeoPresent wrapper, never an unrelated command with this name.
    const contents = status.isFile() ? await readFile(command, 'utf8').catch(() => '') : '';
    const isNeoPresentWrapper =
      contents.includes('packages/cli/dist/index.js') && contents.includes('NeoPresent-');
    if (!isNeoPresentWrapper)
      throw new Error(`${command} already exists and is not a NeoPresent command.`);
    await unlink(command);
  } else {
    const existingTarget = await readlink(command);
    if (resolve(binDirectory, existingTarget) !== target) await unlink(command);
    else {
      console.log(`✓ NeoPresent command is already linked at ${command}`);
      process.exit(0);
    }
  }
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

await symlink(target, command);
console.log(`✓ Linked NeoPresent command at ${command}`);
if (!process.env.PNPM_HOME) {
  console.log('  If the command is not found, run "pnpm setup" once and restart your shell.');
}
