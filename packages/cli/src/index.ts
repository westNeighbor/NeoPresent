#!/usr/bin/env node

import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

import { parseMarkdown } from '../../markdown/dist/index.js';
import { createExportFrames } from './export-steps.js';

export const packageName = '@neopresent/cli';
export const version = '0.3.0';

const commandHelp: Record<string, string> = {
  build: `Usage: neopresent build

Build every NeoPresent workspace package that has a build script.`,
  check: `Usage: neopresent check <deck.md>

Parse and validate a presentation, then report its slide count and theme.`,
  outline: `Usage: neopresent outline <deck.md>

Print the presentation title and an ordered list of slide headings.`,
  new: `Usage: neopresent new <project-name>

Create presentations/<project-name> with a starter deck, assets, and data folders.`,
  serve: `Usage: neopresent serve <deck.md> [--port <number>]

Start the audience viewer. The default port is 9090.`,
  export: `Usage: neopresent export <deck.md> [options]

Render the final state of every slide.

Options:
  --format <pdf|png>  Output format (default: pdf)
  --output <path>     Output file or directory
  --port <number>     Temporary viewer port (default: 9090)
  --jobs <number>     Slides rendered in parallel (default: 3, maximum: 8)
  --browser <name>    Rendering browser: edge or chrome (default: edge)
  --annotations <file>  Include vector ink saved by the presenter
  --notes             Include speaker notes in PDF output
  --steps             Export replacement reveal states as separate pages
  --notoc             Include slides marked @toc-entry false`
};

function usage(command?: string): string {
  if (command && commandHelp[command]) return commandHelp[command];
  return `NeoPresent ${version} — Markdown-first presentations powered by Neo.mjs

Usage: neopresent <command> [options]

Commands:
  build                         Build all framework packages
  check <deck.md>               Validate a presentation
  outline <deck.md>             List slide titles in order
  new <project-name>            Create a presentation project
  serve <deck.md>               Start the audience viewer
  export <deck.md>              Export final slides to PDF or PNG
  help [command]                Show general or command-specific help

Global options:
  -h, --help                    Show help
  -v, --version                 Show the installed version

Run "neopresent help <command>" for details about a command.`;
}

function positionalArguments(arguments_: string[]): string[] {
  const optionsWithValues = new Set([
    '--format',
    '--output',
    '--port',
    '--jobs',
    '--browser',
    '--annotations'
  ]);
  return arguments_.filter((argument, index) => {
    if (argument === '--' || argument.startsWith('--')) return false;
    return index === 0 || !optionsWithValues.has(arguments_[index - 1]!);
  });
}

const includePattern = /^\s*@include\s+(.+?)\s*$/;

async function readDeckSource(path: string, ancestry: string[] = []): Promise<string> {
  const file = resolve(path);
  if (ancestry.includes(file))
    throw new Error(`Circular Markdown include: ${[...ancestry, file].join(' → ')}`);

  const lines = (await readFile(file, 'utf8')).split(/\r?\n/);
  const output: string[] = [];
  let fenced = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const include = fenced ? null : line.match(includePattern);
    if (!include) {
      output.push(line);
      continue;
    }
    const target = (include[1] ?? '').trim().replace(/^(?:"([^"]+)"|'([^']+)')$/, '$1$2');
    if (!/\.md$/i.test(target))
      throw new Error(`Markdown includes must reference a .md file: ${target}`);
    output.push(await readDeckSource(resolve(dirname(file), target), [...ancestry, file]));
  }
  return output.join('\n');
}

async function main(): Promise<void> {
  const [command, ...arguments_] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(usage(command === 'help' ? arguments_[0] : undefined));
    return;
  }
  if (command === '--version' || command === '-v') {
    console.log(version);
    return;
  }
  if (arguments_.includes('--help') || arguments_.includes('-h')) {
    console.log(usage(command));
    return;
  }

  const target = positionalArguments(arguments_)[0];
  if (
    command !== 'build' &&
    command !== 'check' &&
    command !== 'outline' &&
    command !== 'new' &&
    command !== 'serve' &&
    command !== 'export'
  ) {
    console.error(`Unknown command: ${command}\n\n${usage()}`);
    process.exitCode = 1;
    return;
  }
  if (command !== 'build' && !target) {
    console.error(usage(command));
    process.exitCode = 1;
    return;
  }

  try {
    const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
    if (command === 'build') {
      await runWorkspaceBuild(workspaceRoot);
      return;
    }
    if (command === 'export') {
      await exportPresentation(workspaceRoot, arguments_);
      return;
    }
    if (command === 'new') {
      const projectName = target;
      if (!projectName) throw new TypeError('A project name is required.');
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(projectName)) {
        throw new TypeError(
          'Project names may use letters, numbers, dots, hyphens, and underscores.'
        );
      }
      const projectDirectory = resolve(workspaceRoot, 'presentations', projectName);
      await mkdir(resolve(workspaceRoot, 'presentations'), { recursive: true });
      await mkdir(projectDirectory);
      await Promise.all([
        mkdir(resolve(projectDirectory, 'assets')),
        mkdir(resolve(projectDirectory, 'data')),
        writeFile(resolve(projectDirectory, 'presentation.md'), starterPresentation, 'utf8')
      ]);
      console.log(`✓ Created ${projectDirectory}`);
      console.log(`  Start it with: neopresent serve presentations/${projectName}/presentation.md`);
      return;
    }
    if (command === 'serve') {
      const portArgument = arguments_.indexOf('--port');
      const requestedPort = portArgument >= 0 ? Number(arguments_[portArgument + 1]) : 9090;
      if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
        throw new TypeError('Use a valid port number, for example --port 9090.');
      }
      const deckPath = resolve(workspaceRoot, target!);
      validateDeckFilename(deckPath);
      parseMarkdown(await readDeckSource(deckPath));
      const pointerPath = await writeDeckPointer(deckPath, requestedPort);
      console.log(`Starting ${deckPath} at http://localhost:${requestedPort}`);
      try {
        const server = spawn(
          'pnpm',
          [
            '--filter',
            '@neopresent/viewer',
            'exec',
            'webpack',
            'serve',
            '-c',
            './node_modules/neo.mjs/buildScripts/webpack/webpack.server.config.mjs',
            '--port',
            String(requestedPort),
            '--static-reset',
            '--static-directory',
            resolve(workspaceRoot, 'apps/viewer'),
            dirname(deckPath)
          ],
          {
            cwd: workspaceRoot,
            stdio: 'inherit'
          }
        );
        await new Promise<void>((complete, fail) => {
          server.once('error', fail);
          server.once('exit', (code) => {
            process.exitCode = code ?? 1;
            complete();
          });
        });
      } finally {
        await rm(pointerPath, { force: true });
      }
      return;
    }
    if (!target) throw new TypeError('A presentation Markdown file is required.');
    const path = resolve(workspaceRoot, target);
    const deck = parseMarkdown(await readDeckSource(path));
    if (command === 'check') {
      console.log(`✓ ${path}`);
      console.log(
        `  ${deck.children.length} slide${deck.children.length === 1 ? '' : 's'} · theme: ${deck.theme}`
      );
      return;
    }

    console.log(`${deck.title || 'Untitled presentation'} · ${deck.children.length} slides`);
    deck.children.forEach((slide, index) => {
      const heading = slide.children.find((node) => node.type === 'heading');
      console.log(`${String(index + 1).padStart(2, '0')}  ${heading?.text ?? 'Untitled slide'}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`NeoPresent could not complete ${command}: ${message}`);
    process.exitCode = 1;
  }
}

async function runWorkspaceBuild(workspaceRoot: string): Promise<void> {
  await new Promise<void>((complete, fail) => {
    const child = spawn(process.execPath, [resolve(workspaceRoot, 'scripts/build.mjs')], {
      cwd: workspaceRoot,
      stdio: 'inherit'
    });
    child.once('error', fail);
    child.once('exit', (code, signal) => {
      if (code === 0) complete();
      else {
        const reason = signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`;
        fail(new Error(`workspace build stopped with ${reason}`));
      }
    });
  });
}

void main();

type ExportAnnotationPoint = { x: number; y: number };
type ExportAnnotationPath = {
  color: string;
  points: ExportAnnotationPoint[];
  stroke: 'chalk' | 'pen' | 'marker' | 'dashed' | 'dotted';
  width: number;
};

async function readExportAnnotations(
  path: string,
  expectedSlideCount: number
): Promise<Map<number, ExportAnnotationPath[]>> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(
      `NeoPresent could not read annotation data from ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!value || typeof value !== 'object') throw new TypeError('Annotation data must be a JSON object.');
  const document = value as { format?: unknown; slideCount?: unknown; slides?: unknown; version?: unknown };
  if (document.format !== 'neopresent-annotations' || document.version !== 1)
    throw new TypeError('Annotation data is not a supported NeoPresent annotation file.');
  if (Number(document.slideCount) !== expectedSlideCount)
    throw new TypeError(
      `Annotation data was saved for ${Number(document.slideCount) || 0} slides, but this deck has ${expectedSlideCount}.`
    );
  if (!Array.isArray(document.slides)) throw new TypeError('Annotation data has no slides array.');
  const result = new Map<number, ExportAnnotationPath[]>();
  const allowedStrokes = new Set(['chalk', 'pen', 'marker', 'dashed', 'dotted']);
  for (const rawSlide of document.slides) {
    if (!rawSlide || typeof rawSlide !== 'object') continue;
    const slide = rawSlide as { paths?: unknown; slideIndex?: unknown };
    const slideIndex = Number(slide.slideIndex);
    if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= expectedSlideCount)
      throw new TypeError(`Annotation data contains an invalid slide index: ${String(slide.slideIndex)}.`);
    if (!Array.isArray(slide.paths)) continue;
    const paths: ExportAnnotationPath[] = [];
    for (const rawPath of slide.paths) {
      if (!rawPath || typeof rawPath !== 'object') continue;
      const path = rawPath as { color?: unknown; points?: unknown; stroke?: unknown; width?: unknown };
      const points = Array.isArray(path.points)
        ? path.points.flatMap((rawPoint) => {
            if (!rawPoint || typeof rawPoint !== 'object') return [];
            const point = rawPoint as { x?: unknown; y?: unknown };
            const x = Number(point.x);
            const y = Number(point.y);
            return Number.isFinite(x) && Number.isFinite(y)
              ? [{ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }]
              : [];
          })
        : [];
      if (points.length === 0) continue;
      const width = Number(path.width);
      const stroke = String(path.stroke ?? 'chalk');
      paths.push({
        color: /^#[\da-f]{3,8}$/i.test(String(path.color ?? ''))
          ? String(path.color)
          : '#ff3b30',
        points,
        stroke: (allowedStrokes.has(stroke) ? stroke : 'chalk') as ExportAnnotationPath['stroke'],
        width: Number.isFinite(width) ? Math.max(0.001, Math.min(0.1, width)) : 0.008
      });
    }
    if (paths.length > 0) result.set(slideIndex, paths);
  }
  return result;
}

async function exportPresentation(workspaceRoot: string, arguments_: string[]): Promise<void> {
  const valueAfter = (name: string): string | undefined => {
    const index = arguments_.indexOf(name);
    return index >= 0 ? arguments_[index + 1] : undefined;
  };
  const format = String(valueAfter('--format') ?? 'pdf').toLowerCase();
  if (format !== 'pdf' && format !== 'png') {
    throw new TypeError('Export format must be pdf or png.');
  }
  const includeNotes = arguments_.includes('--notes');
  const includeNoToc = arguments_.includes('--notoc');
  const includeSteps = arguments_.includes('--steps');
  if (includeNotes && format !== 'pdf') {
    throw new TypeError('The --notes option is available only for PDF export.');
  }
  const port = Number(valueAfter('--port') ?? 9090);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new TypeError('Use a valid export port, for example --port 9090.');
  }
  const jobs = Number(valueAfter('--jobs') ?? 3);
  if (!Number.isInteger(jobs) || jobs < 1 || jobs > 8) {
    throw new TypeError('Use between 1 and 8 parallel export jobs, for example --jobs 3.');
  }
  const browser = String(valueAfter('--browser') ?? 'edge').toLowerCase();
  if (browser !== 'edge' && browser !== 'chrome') {
    throw new TypeError('Export browser must be edge or chrome.');
  }

  const target = positionalArguments(arguments_)[0];
  if (!target) throw new TypeError('A presentation Markdown file is required.');
  const deckPath = resolve(workspaceRoot, target);
  validateDeckFilename(deckPath);
  const deckFileSource = await readFile(deckPath, 'utf8');
  const deckSource = await readDeckSource(deckPath);
  const deck = parseMarkdown(deckSource);
  const annotationsPath = valueAfter('--annotations');
  const annotations = annotationsPath
    ? await readExportAnnotations(resolve(workspaceRoot, annotationsPath), deck.children.length)
    : undefined;
  const exportSlideIndexes = deck.children.flatMap((slide, index) =>
    includeNoToc || slide.getAttribute?.('tocEntry') !== false ? [index] : []
  );
  const exportFrames = createExportFrames(deck.children, exportSlideIndexes, includeSteps);
  const frameSlideIndexes = exportFrames.map((frame) => frame.slideIndex);
  const frameRevealIndexes = exportFrames.map((frame) => frame.revealIndex);
  const frameAnnotations = annotations
    ? frameSlideIndexes.map((slideIndex) => annotations.get(slideIndex) ?? [])
    : undefined;
  const output = resolve(
    workspaceRoot,
    valueAfter('--output') ?? (format === 'pdf' ? 'dist/presentation.pdf' : 'dist/slides')
  );
  const chrome = await findChrome(browser);
  const origin = `http://127.0.0.1:${port}`;
  const chromeProfile = await mkdtemp(resolve(tmpdir(), 'neopresent-chrome-'));
  let server: ReturnType<typeof spawn> | undefined;
  let pointerPath: string | undefined;

  try {
    const responding = await serverResponds(origin);
    if (responding && !(await serverDeckMatches(origin, basename(deckPath), deckFileSource))) {
      throw new Error(`Port ${port} is already serving a different NeoPresent project.`);
    }
    if (!responding) {
      pointerPath = await writeDeckPointer(deckPath, port);
      server = spawn(
        'pnpm',
        [
          '--filter',
          '@neopresent/viewer',
          'exec',
          'webpack',
          'serve',
          '-c',
          './node_modules/neo.mjs/buildScripts/webpack/webpack.server.config.mjs',
          '--host',
          '127.0.0.1',
          '--port',
          String(port),
          '--static-reset',
          '--static-directory',
          resolve(workspaceRoot, 'apps/viewer'),
          dirname(deckPath)
        ],
        { cwd: workspaceRoot, detached: process.platform !== 'win32', stdio: 'ignore' }
      );
      await waitForServer(origin, server);
    }

    const aspect = String(deck.getAttribute?.('aspect') ?? '16:9');
    const [aspectWidth = 16, aspectHeight = 9] = aspect.split(':').map(Number);
    const width = 1920;
    const height = Math.max(1, Math.round(width * (aspectHeight / aspectWidth)));
    if (format === 'pdf') {
      await mkdir(dirname(output), { recursive: true });
      await exportPdfFromCaptures({
        chrome,
        deck,
        deckPath,
        height,
        ...(includeNotes
          ? { notes: frameSlideIndexes.map((index) => deck.children[index]?.notes ?? '') }
          : {}),
        origin,
        output,
        chromeProfile,
        jobs,
        ...(frameAnnotations ? { annotations: frameAnnotations } : {}),
        revealIndexes: frameRevealIndexes,
        slideIndexes: frameSlideIndexes,
        width
      });
      console.log(`✓ Exported ${exportFrames.length} pages from ${exportSlideIndexes.length} slides to ${output}`);
      return;
    }

    await mkdir(output, { recursive: true });
    const captures = Array.from({ length: exportFrames.length }, (_, index) =>
      resolve(output, `slide-${String(index + 1).padStart(3, '0')}.png`)
    );
    await renderSlidesWithEdge({
      chrome,
      chromeProfile,
      jobs,
      ...(frameAnnotations ? { annotations: frameAnnotations } : {}),
      outputs: captures,
      height,
      origin,
      revealIndexes: frameRevealIndexes,
      slideNumbers: frameSlideIndexes.map((index) => index + 1),
      width
    });
    console.log(`✓ Exported ${exportFrames.length} PNG pages from ${exportSlideIndexes.length} slides to ${output}`);
  } finally {
    terminateExportServer(server);
    if (pointerPath) await rm(pointerPath, { force: true });
    await removeTemporaryDirectory(chromeProfile);
  }
}

function terminateExportServer(server: ReturnType<typeof spawn> | undefined): void {
  if (!server || server.exitCode !== null) return;
  try {
    if (process.platform !== 'win32' && server.pid) process.kill(-server.pid, 'SIGTERM');
    else server.kill('SIGTERM');
  } catch {
    // The server has already exited or is not owned by this export process.
  }
}

async function exportPdfFromCaptures({
  annotations,
  chrome,
  chromeProfile,
  deck,
  deckPath,
  height,
  jobs,
  notes,
  origin,
  output,
  revealIndexes,
  slideIndexes,
  width
}: {
  annotations?: ExportAnnotationPath[][];
  chrome: string;
  chromeProfile: string;
  deck: ReturnType<typeof parseMarkdown>;
  deckPath: string;
  height: number;
  jobs: number;
  notes?: string[];
  origin: string;
  output: string;
  revealIndexes?: Array<number | undefined>;
  slideIndexes: number[];
  width: number;
}): Promise<void> {
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'neopresent-export-'));
  try {
    const pdfVectors = await createPdfVectorMarkup({
      deck,
      deckPath,
      slideIndexes,
      temporaryDirectory
    });
    const pages = Array.from({ length: slideIndexes.length }, (_, index) =>
      resolve(temporaryDirectory, `slide-${String(index + 1).padStart(3, '0')}.pdf`)
    );
    await renderSlidesWithEdge({
      ...(annotations ? { annotations } : {}),
      chrome,
      chromeProfile,
      height,
      jobs,
      ...(notes ? { notes } : {}),
      origin,
      outputs: pages,
      pdfVectors,
      ...(revealIndexes ? { revealIndexes } : {}),
      slideNumbers: slideIndexes.map((index) => index + 1),
      width
    });
    await mergePdfPages(pages, output);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

function chromeArguments(profileDirectory: string, arguments_: string[]): string[] {
  return [
    `--user-data-dir=${profileDirectory}`,
    '--no-default-browser-check',
    '--no-first-run',
    ...arguments_
  ];
}

async function removeTemporaryDirectory(path: string): Promise<void> {
  try {
    await rm(path, { force: true, recursive: true });
  } catch {
    // Edge may still be releasing its profile files. The operating system will clear this temporary folder later.
  }
}

async function verifyCapture(path: string): Promise<void> {
  try {
    const metadata = await access(path);
    void metadata;
  } catch {
    throw new Error('The browser did not produce a slide image. Close any Chrome export windows and try again.');
  }
}

type CdpMessage = {
  id?: number;
  result?: Record<string, unknown>;
  error?: { message?: string };
};

function createCdpClient(url: string): Promise<{
  close: () => void;
  send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
}> {
  return new Promise((resolvePromise, rejectPromise) => {
    const Socket = (globalThis as unknown as { WebSocket: new (url: string) => any }).WebSocket;
    const socket = new Socket(url);
    let nextId = 1;
    const pending = new Map<
      number,
      { reject: (error: Error) => void; resolve: (value: Record<string, unknown>) => void }
    >();
    const rejectAll = (error: Error) => {
      for (const request of pending.values()) request.reject(error);
      pending.clear();
    };
    socket.addEventListener('open', () => {
      resolvePromise({
        close: () => socket.close(),
        send: (method, params = {}) =>
          new Promise<Record<string, unknown>>((resolveRequest, rejectRequest) => {
            const id = nextId++;
            pending.set(id, { reject: rejectRequest, resolve: resolveRequest });
            socket.send(JSON.stringify({ id, method, params }));
          })
      });
    });
    socket.addEventListener('message', (event: { data: unknown }) => {
      let message: CdpMessage;
      try {
        message = JSON.parse(String(event.data)) as CdpMessage;
      } catch {
        return;
      }
      if (!message.id) return;
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message || 'Edge capture failed.'));
      else request.resolve(message.result ?? {});
    });
    socket.addEventListener('error', () => rejectPromise(new Error('Could not connect to Microsoft Edge.')));
    socket.addEventListener('close', () => rejectAll(new Error('Microsoft Edge closed during export.')));
  });
}

async function renderSlidesWithEdge({
  annotations,
  chrome,
  chromeProfile,
  height,
  jobs,
  notes,
  origin,
  outputs,
  pdfVectors,
  revealIndexes,
  slideNumbers,
  width
}: {
  annotations?: ExportAnnotationPath[][];
  chrome: string;
  chromeProfile: string;
  height: number;
  jobs: number;
  notes?: string[];
  origin: string;
  outputs: string[];
  pdfVectors?: PdfVectorFigure[][];
  revealIndexes?: Array<number | undefined>;
  slideNumbers?: number[];
  width: number;
}): Promise<void> {
  const workerCount = Math.min(jobs, outputs.length);
  if (workerCount > 1) {
    const workerIndexes = Array.from({ length: workerCount }, () => [] as number[]);
    outputs.forEach((_, index) => workerIndexes[index % workerCount]!.push(index));
    const results = await Promise.allSettled(
      workerIndexes.map(async (indexes, workerIndex) => {
        const workerProfile = resolve(chromeProfile, `worker-${workerIndex + 1}`);
        await mkdir(workerProfile, { recursive: true });
        await renderSlidesWithEdge({
          ...(annotations
            ? { annotations: indexes.map((index) => annotations[index] ?? []) }
            : {}),
          chrome,
          chromeProfile: workerProfile,
          height,
          jobs: 1,
          ...(notes ? { notes: indexes.map((index) => notes[index] ?? '') } : {}),
          origin,
          outputs: indexes.map((index) => outputs[index]!),
          ...(pdfVectors
            ? { pdfVectors: indexes.map((index) => pdfVectors[index] ?? []) }
            : {}),
          ...(revealIndexes
            ? { revealIndexes: indexes.map((index) => revealIndexes[index]) }
            : {}),
          ...(slideNumbers
            ? { slideNumbers: indexes.map((index) => slideNumbers[index]!) }
            : {}),
          width
        });
      })
    );
    const failed = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    if (failed) throw failed.reason;
    return;
  }

  const devToolsFile = resolve(chromeProfile, 'DevToolsActivePort');
  await rm(devToolsFile, { force: true });
  const renderer = spawn(
    chrome,
    chromeArguments(chromeProfile, [
      '--headless=new',
      '--hide-scrollbars',
      // Parallel export targets are background tabs. Edge normally reduces or
      // suspends their timers, compositor work, and renderer scheduling, which
      // makes a random slide miss the readiness deadline as concurrency rises.
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--remote-allow-origins=*',
      '--remote-debugging-port=0',
      `--window-size=${width},${height}`,
      'about:blank'
    ]),
    { stdio: 'ignore' }
  );
  let browserClient:
    | Awaited<ReturnType<typeof createCdpClient>>
    | undefined;
  try {
    const port = await waitForDevToolsPort(devToolsFile);
    const versionResponse = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (!versionResponse.ok) throw new Error('Microsoft Edge debugging endpoint did not start.');
    const version = (await versionResponse.json()) as { webSocketDebuggerUrl?: string };
    if (!version.webSocketDebuggerUrl) throw new Error('Microsoft Edge did not provide a capture connection.');
    browserClient = await createCdpClient(version.webSocketDebuggerUrl);

    let nextIndex = 0;
    let failure: unknown;
    const renderNextSlide = async (): Promise<void> => {
      while (failure === undefined) {
        const index = nextIndex++;
        if (index >= outputs.length) return;
        const output = outputs[index]!;
        const slideNumber = slideNumbers?.[index] ?? index + 1;
        const revealIndex = revealIndexes?.[index];
        try {
          await rm(output, { force: true });
          const url = `${origin}/?neopresent-export=1#slide=${slideNumber}&export=1${typeof revealIndex === 'number' && Number.isFinite(revealIndex) ? `&reveal=${revealIndex}` : ''}`;
          const targetResponse = await fetch(
            `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`,
            { method: 'PUT' }
          );
          if (!targetResponse.ok)
            throw new Error(`Microsoft Edge could not open slide ${slideNumber}.`);
          const target = (await targetResponse.json()) as {
            id?: string;
            webSocketDebuggerUrl?: string;
          };
          if (!target.webSocketDebuggerUrl)
            throw new Error(`Microsoft Edge could not capture slide ${slideNumber}.`);
          const page = await createCdpClient(target.webSocketDebuggerUrl);
          try {
            await page.send('Page.enable');
            await page.send('Runtime.enable');
            await page.send('Emulation.setDeviceMetricsOverride', {
              deviceScaleFactor: 2,
              height,
              mobile: false,
              width
            });
            await waitForRenderedSlide(page, slideNumber);
            await page.send('Runtime.evaluate', {
              awaitPromise: true,
              expression:
                'document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()'
            });
            await waitForSlideAssets(page, slideNumber);
            const pdf = extname(output).toLowerCase() === '.pdf';
            let data: unknown;
            if (pdf) {
              if (pdfVectors?.[index]?.length) {
                await replacePdfFiguresWithSvg(page, pdfVectors[index]!);
              }
              await page.send('Emulation.setEmulatedMedia', { media: 'screen' });
              const pageSize = await prepareSlideForVectorPrint(
                page,
                notes?.[index] ?? '',
                Boolean(notes),
                typeof revealIndex === 'number' && Number.isFinite(revealIndex)
              );
              if (annotations?.[index]?.length)
                await applySlideAnnotations(page, annotations[index]!);
              const printed = await page.send('Page.printToPDF', {
                displayHeaderFooter: false,
                marginBottom: 0,
                marginLeft: 0,
                marginRight: 0,
                marginTop: 0,
                paperHeight: pageSize.height,
                paperWidth: pageSize.width,
                preferCSSPageSize: false,
                printBackground: true,
                scale: 1
              });
              data = printed.data;
            } else {
              if (annotations?.[index]?.length)
                await applySlideAnnotations(page, annotations[index]!);
              const screenshot = await page.send('Page.captureScreenshot', {
                captureBeyondViewport: false,
                format: 'png',
                fromSurface: true
              });
              data = screenshot.data;
            }
            if (typeof data !== 'string' || data.length < 100) {
              throw new Error(
                `Microsoft Edge returned an empty ${pdf ? 'PDF' : 'image'} for slide ${slideNumber}.`
              );
            }
            await writeFile(output, Buffer.from(data, 'base64'));
            await verifyCapture(output);
          } finally {
            page.close();
            if (target.id) {
              await fetch(
                `http://127.0.0.1:${port}/json/close/${encodeURIComponent(target.id)}`
              ).catch(() => undefined);
            }
          }
        } catch (error) {
          failure ??= error;
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(jobs, outputs.length) }, () => renderNextSlide())
    );
    if (failure !== undefined) throw failure;
  } finally {
    if (browserClient) {
      await browserClient.send('Browser.close').catch(() => undefined);
      browserClient.close();
    }
    renderer.kill('SIGTERM');
  }
}

async function waitForDevToolsPort(path: string): Promise<number> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const [portText] = (await readFile(path, 'utf8')).split(/\r?\n/);
      const port = Number(portText);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {
      // Edge is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error('Timed out while starting Microsoft Edge for slide capture.');
}

async function waitForRenderedSlide(
  page: Awaited<ReturnType<typeof createCdpClient>>,
  slideNumber: number
): Promise<void> {
  const deadline = Date.now() + 30_000;
  const expression = `(() => {
    if (document.readyState !== 'complete') return false;
    const slide = document.querySelector('[data-neopresent-slide]');
    if (!slide || slide.dataset.neopresentUniformReady !== 'true') return false;
    const bounds = slide.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && getComputedStyle(slide).visibility !== 'hidden';
  })()`;
  while (Date.now() < deadline) {
    const result = await page.send('Runtime.evaluate', { expression, returnByValue: true });
    const remote = result.result as { value?: unknown } | undefined;
    if (remote?.value === true) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`Timed out waiting for slide ${slideNumber} to render.`);
}

async function waitForSlideAssets(
  page: Awaited<ReturnType<typeof createCdpClient>>,
  slideNumber: number
): Promise<void> {
  const expression = `(async () => {
    const waitForImage = async (image) => {
      if (!image.complete) {
        await Promise.race([
          new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          }),
          new Promise((resolve) => setTimeout(resolve, 30000))
        ]);
      }
      if (typeof image.decode === 'function') {
        try { await image.decode(); } catch {}
      }
      return image.complete && image.naturalWidth > 0;
    };
    const imageResults = await Promise.all(Array.from(document.images).map(waitForImage));
    const backgroundUrls = new Set();
    for (const element of document.querySelectorAll('*')) {
      const value = getComputedStyle(element).backgroundImage;
      for (const match of value.matchAll(/url\\(["']?(.*?)["']?\\)/g)) {
        if (match[1]) backgroundUrls.add(match[1]);
      }
    }
    const backgroundResults = await Promise.all(
      Array.from(backgroundUrls).map((src) => waitForImage(Object.assign(new Image(), { src })))
    );
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const canvases = Array.from(document.querySelectorAll('canvas[data-pdf-src]'));
      if (canvases.every((canvas) => canvas.dataset.rendering !== 'true' && canvas.width > 0 && canvas.height > 0)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 350));
    const pdfReady = Array.from(document.querySelectorAll('canvas[data-pdf-src]')).every(
      (canvas) => canvas.dataset.rendering !== 'true' && canvas.width > 0 && canvas.height > 0
    );
    return imageResults.every(Boolean) && backgroundResults.every(Boolean) && pdfReady;
  })()`;
  const evaluated = await page.send('Runtime.evaluate', {
    awaitPromise: true,
    expression,
    returnByValue: true
  });
  const remote = evaluated.result as { value?: unknown } | undefined;
  if (remote?.value !== true) {
    throw new Error(`Timed out waiting for images or PDF figures on slide ${slideNumber}.`);
  }
}

async function replacePdfFiguresWithSvg(
  page: Awaited<ReturnType<typeof createCdpClient>>,
  vectors: PdfVectorFigure[]
): Promise<void> {
  const encoded = vectors.map((vector) => ({
    page: vector.page,
    src: vector.src,
    svg: vector.svg ? Buffer.from(vector.svg, 'utf8').toString('base64') : ''
  }));
  const expression = `(() => {
    const vectors = ${JSON.stringify(encoded)};
    const namespaceSvgIds = (root, prefix) => {
      const ids = new Map();
      for (const element of root.querySelectorAll('[id]')) {
        const original = element.id;
        if (!original) continue;
        const unique = prefix + original;
        ids.set(original, unique);
        element.id = unique;
      }
      const entries = Array.from(ids.entries()).sort(
        ([left], [right]) => right.length - left.length
      );
      const rewrite = (value) => {
        let output = String(value ?? '');
        for (const [original, unique] of entries)
          output = output.split('#' + original).join('#' + unique);
        return output;
      };
      for (const element of root.querySelectorAll('*')) {
        for (const attribute of Array.from(element.attributes)) {
          const value = rewrite(attribute.value);
          if (value !== attribute.value) attribute.value = value;
        }
      }
      for (const style of root.querySelectorAll('style'))
        style.textContent = rewrite(style.textContent);
    };
    const targets = Array.from(document.querySelectorAll('canvas[data-pdf-src],iframe[data-pdf-viewer-frame="true"]'));
    targets.forEach((target, index) => {
      const src = target.dataset.pdfSrc ?? target.dataset.pdfViewerSrc ?? '';
      const page = Number(target.dataset.pdfPage ?? target.dataset.pdfViewerPage ?? '1');
      const vector = vectors.find((item) => item.src === src && Number(item.page) === page);
      if (!vector?.svg) return;
      const bytes = Uint8Array.from(atob(vector.svg), (character) => character.charCodeAt(0));
      const markup = new TextDecoder().decode(bytes);
      const replacement = document.createElement('div');
      replacement.style.cssText = target.style.cssText;
      replacement.style.background = 'transparent';
      replacement.style.overflow = 'hidden';
      replacement.innerHTML = markup;
      // pdftocairo restarts glyph, clip-path, gradient, and mask IDs in every
      // SVG. Replacement steps keep hidden PDF figures in the same document,
      // so unscoped IDs make one figure resolve another figure's glyphs. Give
      // every inserted PDF an isolated ID namespace before vector printing.
      namespaceSvgIds(replacement, 'neopresent-pdf-' + index + '-');
      const svg = replacement.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.style.display = 'block';
        svg.style.maxHeight = '100%';
        svg.style.maxWidth = '100%';
      }
      target.replaceWith(replacement);
    });
    return true;
  })()`;
  await page.send('Runtime.evaluate', { expression, returnByValue: true });
}

async function applySlideAnnotations(
  page: Awaited<ReturnType<typeof createCdpClient>>,
  paths: ExportAnnotationPath[]
): Promise<void> {
  const payload = JSON.stringify(paths);
  const expression = `(async () => {
    const paths = ${payload};
    const slide =
      document.querySelector('[data-neopresent-print-clone="true"]') ||
      document.querySelector('[data-neopresent-slide]');
    if (!slide) throw new Error('NeoPresent slide canvas was not found for annotations.');
    slide.querySelector('[data-neopresent-export-annotations]')?.remove();
    const namespace = 'http://www.w3.org/2000/svg';
    const layer = document.createElementNS(namespace, 'svg');
    layer.dataset.neopresentExportAnnotations = 'true';
    layer.setAttribute('aria-hidden', 'true');
    layer.setAttribute('viewBox', '0 0 1 1');
    layer.setAttribute('preserveAspectRatio', 'none');
    Object.assign(layer.style, {
      height: '100%',
      inset: '0',
      pointerEvents: 'none',
      position: 'absolute',
      width: '100%',
      zIndex: '9997'
    });
    const definitions = document.createElementNS(namespace, 'defs');
    layer.append(definitions);
    const appendLine = (path, points, options = {}) => {
      const line = document.createElementNS(namespace, 'polyline');
      line.setAttribute('points', points.map((point) => point.x + ',' + point.y).join(' '));
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', path.color);
      line.setAttribute('stroke-linecap', options.linecap ?? 'round');
      line.setAttribute('stroke-linejoin', 'round');
      line.setAttribute('stroke-width', String(options.width ?? path.width));
      if (options.opacity !== undefined)
        line.setAttribute('stroke-opacity', String(options.opacity));
      if (options.dash) line.setAttribute('stroke-dasharray', options.dash);
      if (options.dashOffset !== undefined)
        line.setAttribute('stroke-dashoffset', String(options.dashOffset));
      layer.append(line);
      return line;
    };
    paths.forEach((path, pathIndex) => {
      const width = Math.max(0.001, Number(path.width) || 0.008);
      if (path.stroke === 'chalk') {
        // Match the live annotation renderer exactly. This is injected only
        // after the printable slide snapshot exists, so its mask id cannot
        // collide with or be rewritten against the hidden live slide.
        appendLine(path, path.points, { opacity: 0.2, width: width * 0.86 });
        const maskId = 'neopresent-export-chalk-' + pathIndex;
        const mask = document.createElementNS(namespace, 'mask');
        mask.id = maskId;
        mask.setAttribute('maskUnits', 'userSpaceOnUse');
        mask.setAttribute('x', '-0.05');
        mask.setAttribute('y', '-0.05');
        mask.setAttribute('width', '1.1');
        mask.setAttribute('height', '1.1');
        mask.style.maskType = 'luminance';
        const maskStroke = document.createElementNS(namespace, 'polyline');
        maskStroke.setAttribute('points', path.points.map((point) => point.x + ',' + point.y).join(' '));
        maskStroke.setAttribute('fill', 'none');
        maskStroke.setAttribute('stroke', '#ffffff');
        maskStroke.setAttribute('stroke-linecap', 'round');
        maskStroke.setAttribute('stroke-linejoin', 'round');
        maskStroke.setAttribute('stroke-width', String(width * 1.08));
        mask.append(maskStroke);
        let totalLength = 0;
        for (let pointIndex = 1; pointIndex < path.points.length; pointIndex += 1) {
          totalLength += Math.hypot(
            path.points[pointIndex].x - path.points[pointIndex - 1].x,
            path.points[pointIndex].y - path.points[pointIndex - 1].y
          );
        }
        const grainCount = Math.max(1, Math.min(1400, Math.ceil(totalLength / (width * 0.34))));
        const grainSpacing = totalLength / grainCount;
        let nextGrainDistance = grainSpacing * 0.5;
        let traversed = 0;
        let grainIndex = 0;
        const grainMarks = [];
        for (let segmentIndex = 1; segmentIndex < path.points.length && grainIndex < grainCount; segmentIndex += 1) {
          const start = path.points[segmentIndex - 1];
          const end = path.points[segmentIndex];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.hypot(dx, dy);
          if (length <= 0) continue;
          const normalX = -dy / length;
          const normalY = dx / length;
          while (nextGrainDistance <= traversed + length && grainIndex < grainCount) {
            const progress = (nextGrainDistance - traversed) / length;
            const phase = (pathIndex + 1) * 2.173 + grainIndex * 1.619;
            const across = Math.sin(phase * 1.31) * width * 0.4;
            const along = Math.cos(phase * 2.17) * width * 0.08;
            const cx = start.x + dx * progress + normalX * across + (dx / length) * along;
            const cy = start.y + dy * progress + normalY * across + (dy / length) * along;
            const radius = width * (0.08 + 0.1 * (0.5 + 0.5 * Math.sin(phase * 0.83)));
            grainMarks.push('M ' + (cx - radius) + ' ' + cy + ' a ' + radius + ' ' + radius + ' 0 1 0 ' + (radius * 2) + ' 0 a ' + radius + ' ' + radius + ' 0 1 0 ' + (-radius * 2) + ' 0');
            grainIndex += 1;
            nextGrainDistance += grainSpacing;
          }
          traversed += length;
        }
        const grainTexture = document.createElementNS(namespace, 'path');
        grainTexture.setAttribute('d', grainMarks.join(' '));
        grainTexture.setAttribute('fill', '#050505');
        mask.append(grainTexture);
        definitions.append(mask);
        const chalkSurface = appendLine(path, path.points, {
          opacity: 0.94,
          width: width * 1.08
        });
        chalkSurface.setAttribute('mask', 'url(#' + maskId + ')');
      } else if (path.stroke === 'marker') {
        appendLine(path, path.points, { opacity: 0.38, width: width * 2.35 });
      } else if (path.stroke === 'dashed') {
        appendLine(path, path.points, {
          dash: (width * 4) + ' ' + (width * 2),
          linecap: 'butt'
        });
      } else if (path.stroke === 'dotted') {
        appendLine(path, path.points, {
          dash: '0 ' + (width * 2.1),
          linecap: 'round'
        });
      } else {
        appendLine(path, path.points);
      }
    });
    slide.append(layer);
    // A dynamically appended SVG is not guaranteed to enter Chromium's
    // printable display list in the same task. Wait for layout and two paint
    // opportunities before returning to Page.printToPDF.
    void layer.getBoundingClientRect();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    void layer.getBoundingClientRect();
    return paths.length;
  })()`;
  const evaluated = await page.send('Runtime.evaluate', {
    awaitPromise: true,
    expression,
    returnByValue: true
  });
  if (evaluated.exceptionDetails) {
    const details = evaluated.exceptionDetails as {
      exception?: { description?: string };
      text?: string;
    };
    throw new Error(
      `NeoPresent could not apply annotations: ${details.exception?.description || details.text || 'unknown browser error'}`
    );
  }
}

async function prepareSlideForVectorPrint(
  page: Awaited<ReturnType<typeof createCdpClient>>,
  notes: string,
  includeNotes: boolean,
  snapshotStep = false
): Promise<{ height: number; width: number }> {
  const payload = JSON.stringify({ includeNotes, notes, snapshotStep });
  const expression = `(() => {
    const options = ${payload};
    const slide = document.querySelector('[data-neopresent-slide]');
    if (!slide) throw new Error('NeoPresent slide canvas was not found.');
    const exportAnimations = document.getAnimations();
    for (const animation of exportAnimations) {
      try { animation.finish(); } catch {}
    }
    // Persist the completed visual state before print layout changes the slide
    // dimensions. Leaving finished compositor animations attached can make
    // Chromium print an earlier translucent/translated animation frame.
    for (const animation of exportAnimations) {
      try { animation.commitStyles?.(); } catch {}
    }
    const clone = options.snapshotStep ? slide.cloneNode(true) : slide;
    if (options.snapshotStep) {
      clone.dataset.neopresentPrintClone = 'true';
      // The live slide stays mounted while the detached print snapshot is
      // captured. Namespace every cloned SVG/HTML id so url(#...), href="#..."
      // and clip-path references cannot resolve to the hidden live slide.
      const idPrefix = 'neopresent-print-' + Date.now().toString(36) + '-';
      const idMap = new Map();
      for (const element of Array.from(clone.querySelectorAll('[id]'))) {
        const originalId = element.id;
        if (!originalId) continue;
        const printId = idPrefix + originalId;
        idMap.set(originalId, printId);
        element.id = printId;
      }
      const idEntries = Array.from(idMap.entries()).sort((left, right) => right[0].length - left[0].length);
      const rewriteIdReferences = (value) => {
        let rewritten = value;
        for (const [originalId, printId] of idEntries) {
          rewritten = rewritten.split('#' + originalId).join('#' + printId);
        }
        return rewritten;
      };
      for (const element of Array.from(clone.querySelectorAll('*'))) {
        for (const attribute of Array.from(element.attributes || [])) {
          if (attribute.name === 'id' || !attribute.value.includes('#')) continue;
          element.setAttribute(attribute.name, rewriteIdReferences(attribute.value));
        }
      }
      for (const styleElement of Array.from(clone.querySelectorAll('style'))) {
        styleElement.textContent = rewriteIdReferences(styleElement.textContent || '');
      }
      const sourceCanvases = Array.from(slide.querySelectorAll('canvas'));
      const clonedCanvases = Array.from(clone.querySelectorAll('canvas'));
      clonedCanvases.forEach((target, index) => {
        const source = sourceCanvases[index];
        if (!source) return;
        try {
          target.width = source.width;
          target.height = source.height;
          target.getContext('2d')?.drawImage(source, 0, 0);
        } catch {}
      });
    }
    const computedSlideStyle = getComputedStyle(slide);
    const inheritedVariables = [];
    for (let styleIndex = 0; styleIndex < computedSlideStyle.length; styleIndex += 1) {
      const property = computedSlideStyle.item(styleIndex);
      if (property.startsWith('--')) inheritedVariables.push([property, computedSlideStyle.getPropertyValue(property)]);
    }
    const designWidth = Number(slide.dataset.neopresentDesignWidth) || 1600;
    const designHeight = Number(slide.dataset.neopresentDesignHeight) || 900;
    const targetWidth = 1280;
    const scale = targetWidth / designWidth;
    const targetHeight = designHeight * scale;
    const notesWidth = options.includeNotes ? 480 : 0;
    document.documentElement.style.cssText = 'margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important;';
    const previousBodyChildren = Array.from(document.body.children);
    document.body.append(clone);
    if (!options.snapshotStep) {
      for (const child of previousBodyChildren) {
        if (child !== clone) child.remove();
      }
    }
    document.body.style.cssText = 'margin:0!important;padding:0!important;overflow:hidden!important;position:relative!important;background:#fff!important;width:' + (targetWidth + notesWidth) + 'px!important;height:' + targetHeight + 'px!important;';
    clone.dataset.neopresentUniformReady = 'true';
    Object.assign(clone.style, {
      boxShadow: 'none',
      flex: 'none',
      height: designHeight + 'px',
      left: '0',
      margin: '0',
      maxHeight: 'none',
      maxWidth: 'none',
      position: 'absolute',
      top: '0',
      transform: 'none',
      transformOrigin: 'top left',
      visibility: 'visible',
      width: designWidth + 'px',
      zoom: String(scale)
    });
    for (const [property, value] of inheritedVariables) clone.style.setProperty(property, value);
    if (options.includeNotes) {
      const aside = document.createElement('aside');
      aside.style.cssText = 'box-sizing:border-box;border-left:1px solid #cbd5e1;color:#172033;font:16px/1.42 system-ui,sans-serif;height:' + targetHeight + 'px;left:' + targetWidth + 'px;overflow:hidden;padding:28px 30px;position:absolute;top:0;white-space:pre-wrap;width:' + notesWidth + 'px;';
      aside.dataset.neopresentPrintNotes = 'true';
      const title = document.createElement('div');
      title.textContent = 'SPEAKER NOTES';
      title.style.cssText = 'color:#475569;font-size:12px;font-weight:800;letter-spacing:.12em;margin-bottom:18px;';
      const content = document.createElement('div');
      content.textContent = options.notes || 'No speaker notes for this slide.';
      aside.append(title, content);
      document.body.append(aside);
    }
    const style = document.createElement('style');
    style.textContent = '*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
      (options.snapshotStep ? 'body> :not([data-neopresent-print-clone="true"]):not([data-neopresent-print-notes="true"]){display:none!important;}' : '') +
      '[data-neopresent-slide],[data-neopresent-slide] *,[data-neopresent-slide] *::before,[data-neopresent-slide] *::after{animation:none!important;transition:none!important;}';
    document.head.append(style);
    for (const animation of exportAnimations) {
      try { animation.cancel(); } catch {}
    }
    return { height: targetHeight / 96, width: (targetWidth + notesWidth) / 96 };
  })()`;
  const evaluated = await page.send('Runtime.evaluate', { expression, returnByValue: true });
  const exceptionDetails = evaluated.exceptionDetails as
    | { exception?: { description?: string }; text?: string }
    | undefined;
  if (exceptionDetails) {
    throw new Error(
      `NeoPresent could not prepare the vector PDF page: ${exceptionDetails.exception?.description || exceptionDetails.text || 'unknown browser error'}`
    );
  }
  const remote = evaluated.result as
    | { value?: { height?: unknown; width?: unknown } }
    | undefined;
  const pageHeight = Number(remote?.value?.height);
  const pageWidth = Number(remote?.value?.width);
  if (!(pageHeight > 0) || !(pageWidth > 0)) {
    throw new Error('NeoPresent could not determine the vector PDF page size.');
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  return { height: pageHeight, width: pageWidth };
}

type PdfVectorFigure = { page: number; src: string; svg: string };

async function createPdfVectorMarkup({
  deck,
  deckPath,
  slideIndexes,
  temporaryDirectory
}: {
  deck: ReturnType<typeof parseMarkdown>;
  deckPath: string;
  slideIndexes: number[];
  temporaryDirectory: string;
}): Promise<PdfVectorFigure[][]> {
  const executable = await findPdfToCairo();
  const cache = new Map<string, string>();
  let converted = 0;
  const collectPdfNodes = (node: any, output: Array<{ page: number; src: string }>) => {
    if (!node) return;
    if (node.type === 'pdf' && typeof node.src === 'string') {
      output.push({ page: Math.max(1, Number(node.page) || 1), src: node.src });
      return;
    }
    for (const child of node.children ?? []) collectPdfNodes(child, output);
    for (const column of node.columns ?? []) collectPdfNodes(column, output);
  };
  const vectors: PdfVectorFigure[][] = [];
  for (const slideIndex of slideIndexes) {
    const pdfs: Array<{ page: number; src: string }> = [];
    collectPdfNodes(deck.children[slideIndex], pdfs);
    const slideVectors: PdfVectorFigure[] = [];
    for (const pdf of pdfs) {
      if (/^(?:https?:|data:|blob:)/i.test(pdf.src)) {
        slideVectors.push({ ...pdf, svg: '' });
        continue;
      }
      const sourceReference = pdf.src.split('#')[0]!.split('?')[0]!;
      const relativeReference = sourceReference.startsWith('/')
        ? `.${sourceReference}`
        : sourceReference;
      const source = resolve(dirname(deckPath), decodeURI(relativeReference));
      try {
        await access(source);
      } catch {
        slideVectors.push({ ...pdf, svg: '' });
        continue;
      }
      const key = `${source}:${pdf.page}`;
      let markup = cache.get(key);
      if (!markup) {
        const target = resolve(
          temporaryDirectory,
          `pdf-vector-${String(++converted).padStart(3, '0')}.svg`
        );
        await runProcess(executable, [
          '-svg',
          '-f',
          String(pdf.page),
          '-l',
          String(pdf.page),
          source,
          target
        ]);
        const svg = await readFile(target, 'utf8');
        const svgStart = svg.indexOf('<svg');
        markup = svgStart >= 0 ? svg.slice(svgStart) : svg;
        cache.set(key, markup);
      }
      slideVectors.push({ ...pdf, svg: markup });
    }
    vectors.push(slideVectors);
  }
  return vectors;
}

async function findPdfToCairo(): Promise<string> {
  const candidates = [
    '/opt/homebrew/bin/pdftocairo',
    '/usr/local/bin/pdftocairo',
    '/usr/bin/pdftocairo'
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next common Poppler installation.
    }
  }
  throw new Error('Vector PDF figures require pdftocairo. Install Poppler with: brew install poppler');
}

async function mergePdfPages(pages: string[], output: string): Promise<void> {
  const candidates = [
    '/opt/homebrew/bin/pdfunite',
    '/usr/local/bin/pdfunite',
    '/usr/bin/pdfunite'
  ];
  let executable: string | undefined;
  for (const candidate of candidates) {
    try {
      await access(candidate);
      executable = candidate;
      break;
    } catch {
      // Try the next common Poppler installation.
    }
  }
  if (!executable) {
    throw new Error('Vector PDF export requires pdfunite. Install Poppler with: brew install poppler');
  }
  await rm(output, { force: true });
  await runProcess(executable, [...pages, output]);
  await verifyCapture(output);
}

function createCapturedPdfHtml({
  aspect,
  captures,
  includeNotes,
  notes
}: {
  aspect: string;
  captures: string[];
  includeNotes: boolean;
  notes: string[];
}): string {
  const [aspectWidth = 16, aspectHeight = 9] = aspect.split(':').map(Number);
  const pageHeight = 7.5;
  const pageWidth = pageHeight * (aspectWidth / aspectHeight);
  const escapeHtml = (value: string) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const pages = captures
    .map(
      (capture, index) => `<section class="page${includeNotes ? ' with-notes' : ''}">
        <div class="slide"><img src="${escapeHtml(capture)}" alt="Slide ${index + 1}" /></div>
        ${
          includeNotes
            ? `<aside class="notes"><div class="notes-title">Slide ${index + 1} notes</div><div class="notes-body">${escapeHtml(notes[index] || 'No speaker notes for this slide.')}</div></aside>`
            : ''
        }
      </section>`
    )
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${pageWidth}in ${pageHeight}in; margin: 0; }
    * { box-sizing: border-box; } html, body { margin: 0; padding: 0; }
    .page { background: #fff; break-after: page; display: flex; height: ${pageHeight}in; overflow: hidden; page-break-after: always; width: ${pageWidth}in; }
    .page:last-child { break-after: auto; page-break-after: auto; }
    .slide { align-items: center; display: flex; height: 100%; justify-content: center; width: 100%; }
    .slide img { display: block; height: 100%; object-fit: contain; width: 100%; }
    .with-notes .slide { padding: .16in; width: 64%; }
    .notes { border-left: 1px solid #cbd5e1; color: #172033; font: 10pt/1.35 system-ui, sans-serif; margin: .2in 0; overflow: hidden; padding: .05in .2in; width: 36%; }
    .notes-title { color: #475569; font-size: 8pt; font-weight: 800; letter-spacing: .08em; margin-bottom: .13in; text-transform: uppercase; }
    .notes-body { white-space: pre-wrap; }
  </style></head><body>${pages}</body></html>`;
}

function validateDeckFilename(deckPath: string): void {
  if (extname(deckPath).toLowerCase() !== '.md') {
    throw new TypeError('The presentation file must use the .md extension.');
  }
}

function deckPointerName(port: number): string {
  return `__neopresent_deck_${port}.json`;
}

async function writeDeckPointer(deckPath: string, port: number): Promise<string> {
  const pointerPath = resolve(dirname(deckPath), deckPointerName(port));
  await writeFile(pointerPath, JSON.stringify({ file: basename(deckPath) }), 'utf8');
  return pointerPath;
}

async function findChrome(browser: 'edge' | 'chrome'): Promise<string> {
  const edgeCandidates = [
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta'
  ];
  const chromeCandidates = [
    process.env.NEOPRESENT_CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];
  const candidates = (browser === 'chrome' ? chromeCandidates : edgeCandidates).filter(
    (candidate): candidate is string => Boolean(candidate)
  );
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next common Chromium location.
    }
  }
  throw new Error(
    browser === 'chrome'
      ? 'Google Chrome or Chromium is required. Set NEOPRESENT_CHROME to its executable.'
      : 'Microsoft Edge is required, or use --browser chrome.'
  );
}

async function serverResponds(origin: string): Promise<boolean> {
  try {
    const response = await fetch(origin);
    return response.ok;
  } catch {
    return false;
  }
}

async function serverDeckMatches(
  origin: string,
  filename: string,
  source: string
): Promise<boolean> {
  try {
    const response = await fetch(`${origin}/${encodeURIComponent(filename)}`, {
      cache: 'no-store'
    });
    return response.ok && (await response.text()) === source;
  } catch {
    return false;
  }
}

async function waitForServer(origin: string, server: ReturnType<typeof spawn>): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await serverResponds(origin)) return;
    if (server.exitCode !== null) throw new Error('The NeoPresent export server stopped early.');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error('Timed out waiting for the NeoPresent export server.');
}

async function runProcess(
  command: string,
  arguments_: string[],
  expectedOutput?: string
): Promise<void> {
  await new Promise<void>((complete, fail) => {
    const child = spawn(command, arguments_, { stdio: 'ignore' });
    let settled = false;
    let outputCheck: ReturnType<typeof setInterval> | undefined;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (outputCheck) clearInterval(outputCheck);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      finish(() =>
        fail(new Error('Export renderer timed out after 45 seconds. Close other Edge/Chrome windows and try again.'))
      );
    }, 45_000);
    if (expectedOutput) {
      outputCheck = setInterval(async () => {
        try {
          await access(expectedOutput);
          child.kill('SIGTERM');
          finish(complete);
        } catch {
          // The renderer is still writing its output.
        }
      }, 125);
    }
    child.once('error', (error) => finish(() => fail(error)));
    child.once('exit', (code, signal) => {
      if (code === 0) finish(complete);
      else {
        const reason = signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`;
        finish(() => fail(new Error(`Export renderer stopped with ${reason}.`)));
      }
    });
  });
}

const starterPresentation = `@theme midnight

# My NeoPresent Talk

A Markdown-first presentation powered by Neo.mjs.

:::notes
Welcome the audience and introduce the topic.
:::

---

## A key idea

- First point
- Second point
- Third point

---

# Thank you
`;
