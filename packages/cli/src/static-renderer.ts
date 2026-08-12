interface DeckNode {
  type: string;
  text?: string;
  level?: number;
  code?: string;
  language?: string;
  items?: readonly string[];
  ordered?: boolean;
  src?: string;
  alt?: string;
  kind?: 'line' | 'bar' | 'area';
  title?: string;
  labels?: readonly string[];
  values?: readonly number[];
  headers?: readonly string[];
  rows?: readonly (readonly string[])[];
  children?: readonly DeckNode[];
  getAttribute?<T>(name: string): T | undefined;
}

interface Deck extends DeckNode {
  title: string;
  theme: string;
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      })[character]!
  );

function inline(value: string): string {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html.replace(
    /\[([^\]]+)]\((https?:[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  );
}

function nodeAttribute<T>(node: DeckNode, name: string): T | undefined {
  return node.getAttribute?.<T>(name);
}

function renderChart(node: DeckNode): string {
  const values = node.values ?? [];
  if (values.length === 0)
    return '<p class="muted">This live chart is available in the NeoPresent viewer.</p>';
  const maximum = Math.max(...values, 1);
  const width = 840;
  const height = 360;
  const points = values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : 50 + index * ((width - 100) / (values.length - 1));
      const y = height - 44 - (value / maximum) * (height - 92);
      return `${x},${y}`;
    })
    .join(' ');
  const bars = values
    .map((value, index) => {
      const barWidth = Math.max(18, (width - 100) / values.length - 14);
      const x = 50 + index * ((width - 100) / values.length) + 7;
      const barHeight = (value / maximum) * (height - 92);
      return `<rect x="${x}" y="${height - 44 - barHeight}" width="${barWidth}" height="${barHeight}" rx="6" />`;
    })
    .join('');
  const labels = (node.labels ?? [])
    .map((label, index) => {
      const x =
        values.length === 1
          ? width / 2
          : 50 + index * ((width - 100) / Math.max(1, values.length - 1));
      return `<text x="${x}" y="${height - 16}" text-anchor="middle">${escapeHtml(label)}</text>`;
    })
    .join('');
  const graphic =
    node.kind === 'bar'
      ? bars
      : `<polyline points="${points}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<figure class="chart"><figcaption>${inline(node.title ?? '')}</figcaption><svg viewBox="0 0 ${width} ${height}" role="img">${graphic}${labels}</svg></figure>`;
}

function renderImage(node: DeckNode): string {
  const width = nodeAttribute<string>(node, 'width') ?? '';
  const height = nodeAttribute<string>(node, 'height') ?? '';
  const maxWidth = nodeAttribute<string>(node, 'maxWidth') ?? '';
  const maxHeight = nodeAttribute<string>(node, 'maxHeight') ?? '';
  const fit = nodeAttribute<string>(node, 'fit') ?? 'contain';
  const align = nodeAttribute<string>(node, 'align') ?? 'center';
  const captionAttribute = nodeAttribute<string>(node, 'caption');
  const caption = captionAttribute === undefined ? (node.alt ?? '') : captionAttribute;
  const alignSelf = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  const figureStyle = [
    'margin:0',
    `align-self:${alignSelf}`,
    width ? `width:${escapeHtml(width)}` : '',
    maxWidth ? `max-width:${escapeHtml(maxWidth)}` : ''
  ]
    .filter(Boolean)
    .join(';');
  const imageStyle = [
    width ? 'width:100%' : '',
    height ? `height:${escapeHtml(height)}` : '',
    maxWidth ? `max-width:${escapeHtml(maxWidth)}` : '',
    maxHeight ? `max-height:${escapeHtml(maxHeight)}` : '',
    `object-fit:${escapeHtml(fit)}`
  ]
    .filter(Boolean)
    .join(';');
  return `<figure class="image" style="${figureStyle}"><img src="${escapeHtml(node.src ?? '')}" alt="${escapeHtml(node.alt ?? '')}" style="${imageStyle}" />${caption ? `<figcaption>${inline(caption)}</figcaption>` : ''}</figure>`;
}

function renderNode(node: DeckNode): string {
  switch (node.type) {
    case 'heading':
      return `<h${node.level ?? 2}>${inline(node.text ?? '')}</h${node.level ?? 2}>`;
    case 'paragraph': {
      const href = nodeAttribute<string>(node, 'buttonHref');
      if (href)
        return `<p><a class="button" href="${escapeHtml(href)}">${inline(node.text ?? '')}</a></p>`;
      return `<p>${inline(node.text ?? '')}</p>`;
    }
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      const symbol = nodeAttribute<string>(node, 'listSymbol') ?? '';
      const symbols = nodeAttribute<string[]>(node, 'listSymbols') ?? [];
      const custom = symbol !== '' || symbols.length > 0;
      return `<${tag}${custom ? ' style="list-style:none"' : ''}>${(node.items ?? []).map((item, index) => `<li>${custom ? `<span class="list-marker">${escapeHtml(symbols[index] || symbol || (node.ordered ? `${index + 1}.` : '•'))} </span>` : ''}${inline(item)}</li>`).join('')}</${tag}>`;
    }
    case 'quote':
      return `<blockquote>${inline(node.text ?? '')}</blockquote>`;
    case 'code':
      return `<pre><code class="language-${escapeHtml(node.language ?? 'text')}">${escapeHtml(node.code ?? '')}</code></pre>`;
    case 'image':
      return renderImage(node);
    case 'video':
      return `<video src="${escapeHtml(node.src ?? '')}" controls></video>`;
    case 'audio':
      return `<audio src="${escapeHtml(node.src ?? '')}" controls></audio>`;
    case 'pdf':
      return `<iframe class="pdf" src="${escapeHtml(node.src ?? '')}"></iframe>`;
    case 'table':
      return `<div class="table-wrap"><table><thead><tr>${(node.headers ?? []).map((header) => `<th>${inline(header)}</th>`).join('')}</tr></thead><tbody>${(node.rows ?? []).map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'chart':
      return renderChart(node);
    case 'columns':
      return `<div class="columns">${(node.children ?? []).map(renderNode).join('')}</div>`;
    case 'column':
      return `<section>${(node.children ?? []).map(renderNode).join('')}</section>`;
    default:
      return '';
  }
}

export function renderStaticHtml(deck: Deck): string {
  const slides = (deck.children ?? [])
    .map(
      (slide, index) =>
        `<article class="slide" data-slide="${index}">${(slide.children ?? []).map(renderNode).join('')}</article>`
    )
    .join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(deck.title || 'NeoPresent')}</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#0b1020;color:#eff6ff}*{box-sizing:border-box}body{margin:0}.slide{display:none;min-height:100vh;padding:clamp(2rem,7vw,7rem);place-content:center;gap:1.2rem;background:radial-gradient(circle at 85% 10%,#1e3a8a 0,transparent 35%),#0b1020}.slide.active{display:grid}h1{font-size:clamp(2.8rem,8vw,7rem);margin:0}h2{font-size:clamp(2rem,5vw,4.4rem);margin:0}p,li,blockquote{font-size:clamp(1.1rem,2.2vw,1.8rem);line-height:1.55}blockquote{border-left:4px solid #67e8f9;margin:0;padding-left:1rem;color:#cbd5e1}pre{background:#111827;border:1px solid #334155;border-radius:.7rem;overflow:auto;padding:1.2rem}code{font-family:ui-monospace,monospace}img,video,.pdf{max-height:65vh;max-width:100%;width:auto}.pdf{height:65vh;width:100%;border:0}.columns{display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:2rem}.table-wrap{overflow:auto}table{border-collapse:collapse;font-size:1.1rem}th,td{border:1px solid #475569;padding:.6rem;text-align:left}.chart{margin:0}.chart svg{max-width:100%;color:#67e8f9}.chart text{fill:#cbd5e1;font:16px system-ui}.chart rect{fill:#67e8f9}.button{background:#38bdf8;border-radius:.5rem;color:#082f49;display:inline-block;font-weight:800;padding:.6rem 1rem;text-decoration:none}.counter{bottom:1.2rem;color:#cbd5e1;position:fixed;right:1.5rem}
</style></head><body>${slides}<output class="counter"></output><script>const slides=[...document.querySelectorAll('.slide')],counter=document.querySelector('.counter');let active=0;function show(index){active=Math.max(0,Math.min(index,slides.length-1));slides.forEach((slide,i)=>slide.classList.toggle('active',i===active));counter.textContent=(active+1)+' / '+slides.length;history.replaceState(null,'','#slide='+(active+1))}addEventListener('keydown',event=>{if(['ArrowRight','ArrowDown',' ','PageDown'].includes(event.key))show(active+1);if(['ArrowLeft','ArrowUp','PageUp'].includes(event.key))show(active-1);if(event.key==='Home')show(0);if(event.key==='End')show(slides.length-1)});show(Number(new URLSearchParams(location.hash.slice(1)).get('slide')||1)-1)</script></body></html>`;
}
