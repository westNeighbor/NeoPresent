export interface ExportFrame {
  slideIndex: number;
  revealIndex?: number;
}

interface RevealNode {
  type?: string;
  children?: readonly RevealNode[];
  columns?: ReadonlyArray<{ children?: readonly RevealNode[] }>;
  items?: readonly unknown[];
  getAttribute?(name: string): unknown;
}

function nestedChildren(node: RevealNode): RevealNode[] {
  return [
    ...(node.children ?? []),
    ...(node.columns ?? []).flatMap((column) => column.children ?? [])
  ];
}

function exportsInternalStages(style: Record<string, unknown>): boolean {
  return !['false', 'no', 'off', '0'].includes(
    String(style['export-stages'] ?? 'true').trim().toLowerCase()
  );
}

function hasNestedRevealTrigger(node: RevealNode): boolean {
  if (node.getAttribute?.('blockTransitionTrigger') === 'reveal') return true;
  return nestedChildren(node).some(hasNestedRevealTrigger);
}

function getDiagramHighlightStages(node: RevealNode): number[] {
  const plotStyle = (node.getAttribute?.('plotStyle') ?? {}) as Record<string, unknown>;
  const stages =
    node.type === 'chart' &&
    String(plotStyle['animation-trigger'] ?? '').toLowerCase() === 'reveal' &&
    exportsInternalStages(plotStyle)
      ? ((node.getAttribute?.('diagramHighlights') ?? []) as Array<Record<string, unknown>>)
          .map((item) => Math.max(0, Math.floor(Number(item?.stage) || 0)))
          .filter((stage) => stage > 0)
      : [];
  for (const child of nestedChildren(node)) stages.push(...getDiagramHighlightStages(child));
  return [...new Set(stages)].sort((left, right) => left - right);
}

export function hasReplaceTransition(node: RevealNode): boolean {
  if (node.getAttribute?.('blockExit') === 'replace') return true;
  return nestedChildren(node).some(hasReplaceTransition);
}

export function getExportRevealCount(slide: RevealNode): number {
  if (slide.getAttribute?.('reveal') !== 'true') return 0;
  const stagedRevealOnly = slide.getAttribute?.('stagedRevealOnly') === true;
  const children = slide.children ?? [];
  const blockTransitionsReveal =
    slide.getAttribute?.('blockTransitionTrigger') === 'reveal' ||
    children.some(hasNestedRevealTrigger);
  const getChartRevealCount = (chart: RevealNode): number => {
    const style = (chart.getAttribute?.('plotStyle') ?? {}) as Record<string, unknown>;
    if (String(style['animation-trigger'] ?? '').toLowerCase() !== 'reveal') return 0;
    if (!exportsInternalStages(style)) return 0;
    const values: unknown[] = [style['reveal-stages'], style['reveal-stage-default']];
    for (const item of (chart.getAttribute?.('series') ?? []) as Array<Record<string, any>>) {
      values.push(item?.revealStage);
      for (const layer of item?.uncertaintyLayers ?? []) values.push(layer?.revealStage);
    }
    for (const item of (chart.getAttribute?.('uncertaintyLayers') ?? []) as Array<Record<string, any>>)
      values.push(item?.revealStage);
    for (const item of (chart.getAttribute?.('shapes') ?? []) as Array<Record<string, any>>)
      values.push(item?.['reveal-stage']);
    for (const item of (chart.getAttribute?.('annotations') ?? []) as Array<Record<string, any>>)
      values.push(item?.revealStage);
    for (const item of (chart.getAttribute?.('fitDefinitions') ?? []) as Array<Record<string, any>>)
      values.push(item?.fields?.['fit-reveal-stage']);
    for (const item of (chart.getAttribute?.('diagramReveals') ?? []) as Array<Record<string, any>>)
      values.push(item?.stage);
    for (const item of (chart.getAttribute?.('diagramHighlights') ?? []) as Array<Record<string, any>>)
      values.push(item?.stage);
    for (const key of ['fit-reveal-stage', 'stats-reveal-stage']) values.push(style[key]);
    return Math.max(0, ...values.map((value) => Math.floor(Number(value) || 0)));
  };
  const getFeynmanRevealCount = (node: RevealNode): number => {
    const source = String((node as RevealNode & { text?: unknown }).text ?? '');
    if (!/^\s*animation-trigger\s*:\s*reveal\s*$/im.test(source)) return 0;
    if (/^\s*export-stages\s*:\s*(?:false|no|off|0)\s*$/im.test(source)) return 0;
    return Math.max(
      0,
      ...[...source.matchAll(/(?:^|\|)\s*reveal-stage(?:s|-default)?\s*:\s*(\d+)/gim)].map(
        (match) => Number(match[1]) || 0
      )
    );
  };
  const countEmbeddedNode = (node: RevealNode): number => {
    if (node.type === 'chart') return getChartRevealCount(node);
    if (node.type === 'paragraph' && node.getAttribute?.('feynman'))
      return getFeynmanRevealCount(node);
    if (node.type === 'columns')
      return Math.max(
        0,
        ...(node.columns ?? []).map((column) =>
          (column.children ?? []).reduce((sum, child) => sum + countEmbeddedNode(child), 0)
        )
      );
    return 0;
  };
  const countNode = (node: RevealNode): number => {
    if (node.getAttribute?.('blockEnter') && blockTransitionsReveal)
      return Math.max(1, countEmbeddedNode(node));
    if (node.type === 'columns' && node.getAttribute?.('layout') === 'group') return 0;
    if (node.type === 'chart') return getChartRevealCount(node);
    if (node.type === 'paragraph' && node.getAttribute?.('feynman'))
      return getFeynmanRevealCount(node);
    if (node.type === 'columns')
      return Math.max(
        0,
        ...(node.columns ?? []).map((column) =>
          (column.children ?? []).reduce((sum, child) => sum + countNode(child), 0)
        )
      );
    if (node.type === 'list') return stagedRevealOnly ? 0 : (node.items?.length ?? 0);
    return !stagedRevealOnly && node.getAttribute?.('fragment') ? 1 : 0;
  };
  let count = 0;
  let hasRevealStep = false;
  for (const node of children) {
    const units = countNode(node);
    if (node.getAttribute?.('blockEnter') && blockTransitionsReveal) {
      count += Math.max(0, units - (hasRevealStep ? 0 : 1));
      hasRevealStep = true;
    } else {
      count += units;
      hasRevealStep ||= units > 0 || Boolean(node.getAttribute?.('blockExit'));
    }
  }
  return count;
}

export function createExportFrames(
  slides: readonly RevealNode[],
  slideIndexes: readonly number[],
  includeSteps: boolean
): ExportFrame[] {
  return slideIndexes.flatMap((slideIndex) => {
    const slide = slides[slideIndex];
    if (!slide) return [{ revealIndex: 0, slideIndex }];
    const revealCount = getExportRevealCount(slide);
    const diagramHighlightStages = getDiagramHighlightStages(slide);
    if (!includeSteps)
      return [
        {
          // A finite highlight stage intentionally freezes that highlight for
          // --steps. Infinity keeps ordinary export at the completed,
          // unhighlighted diagram state after the transient highlight ends.
          revealIndex:
            diagramHighlightStages.length > 0 ? Number.POSITIVE_INFINITY : revealCount,
          slideIndex
        }
      ];
    if (!hasReplaceTransition(slide)) {
      if (diagramHighlightStages.length > 0)
        return diagramHighlightStages.map((revealIndex) => ({ revealIndex, slideIndex }));
      return [{ revealIndex: revealCount, slideIndex }];
    }
    if (revealCount < 1) return [{ revealIndex: 0, slideIndex }];
    return Array.from({ length: revealCount + 1 }, (_, revealIndex) => ({
      revealIndex,
      slideIndex
    }));
  });
}

function getCompletedReplacementRevealIndexes(
  slide: RevealNode,
  finalRevealIndex: number
): number[] {
  const chartStageCount = (node: RevealNode): number => {
    if (node.type === 'chart') {
      const style = (node.getAttribute?.('plotStyle') ?? {}) as Record<string, unknown>;
      if (String(style['animation-trigger'] ?? '').toLowerCase() !== 'reveal') return 0;
      if (!exportsInternalStages(style)) return 0;
      const values: unknown[] = [style['reveal-stages'], style['reveal-stage-default']];
      for (const item of (node.getAttribute?.('series') ?? []) as Array<Record<string, any>>) {
        values.push(item?.revealStage);
        for (const layer of item?.uncertaintyLayers ?? []) values.push(layer?.revealStage);
      }
      for (const item of (node.getAttribute?.('uncertaintyLayers') ?? []) as Array<Record<string, any>>)
        values.push(item?.revealStage);
      for (const item of (node.getAttribute?.('shapes') ?? []) as Array<Record<string, any>>)
        values.push(item?.['reveal-stage']);
      for (const item of (node.getAttribute?.('annotations') ?? []) as Array<Record<string, any>>)
        values.push(item?.revealStage);
      for (const item of (node.getAttribute?.('fitDefinitions') ?? []) as Array<Record<string, any>>)
        values.push(item?.fields?.['fit-reveal-stage']);
      for (const key of ['fit-reveal-stage', 'stats-reveal-stage']) values.push(style[key]);
      return Math.max(0, ...values.map((value) => Math.floor(Number(value) || 0)));
    }
    return Math.max(0, ...nestedChildren(node).map(chartStageCount));
  };

  const children = slide.children ?? [];
  if (!children.some((node) => chartStageCount(node) > 0))
    return Array.from({ length: finalRevealIndex + 1 }, (_, revealIndex) => revealIndex);

  const completed: number[] = [];
  let revealStep = 0;
  let hasRevealStep = false;
  for (const node of children) {
    if (node.getAttribute?.('blockEnter')) {
      const start = hasRevealStep ? revealStep + 1 : 0;
      revealStep = start + Math.max(1, chartStageCount(node)) - 1;
      completed.push(revealStep);
      hasRevealStep = true;
    } else if (node.getAttribute?.('blockExit')) {
      if (!hasRevealStep) completed.push(revealStep);
      hasRevealStep = true;
    }
  }
  if (completed.length === 0)
    return Array.from({ length: finalRevealIndex + 1 }, (_, revealIndex) => revealIndex);
  if (!completed.includes(finalRevealIndex)) completed.push(finalRevealIndex);
  return [...new Set(completed)].sort((left, right) => left - right);
}
