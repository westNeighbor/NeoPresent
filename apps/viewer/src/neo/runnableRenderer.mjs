function createSandboxSource(code) {
  const safeCode = code.replace(/<\/script/gi, '<\\\\/script');
  return `<!doctype html><meta charset="utf-8"><style>body{background:#fff;color:#0f172a;font:14px/1.45 ui-monospace,monospace;margin:0;padding:12px}#log{white-space:pre-wrap}</style><pre id="log"></pre><script>const log=document.querySelector('#log');for(const level of ['log','info','warn','error'])console[level]=(...args)=>log.textContent+=args.map(value=>typeof value==='string'?value:JSON.stringify(value,null,2)).join(' ')+'\\n';window.onerror=(message)=>console.error(message);</script><script>${safeCode}</script>`;
}

function runPython(code, packages, output) {
  const runtimeUrl = 'https://cdn.jsdelivr.net/pyodide/v314.0.2/full/pyodide.mjs';
  const workerSource = `let pyodide;self.onmessage=async({data})=>{try{postMessage({type:'status',text:'Loading Python runtime…'});const{loadPyodide}=await import('${runtimeUrl}');pyodide??=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v314.0.2/full/'});if(data.packages.length){postMessage({type:'status',text:'Loading '+data.packages.join(', ')+'…'});await pyodide.loadPackage(data.packages)}const lines=[];pyodide.setStdout({batched:value=>lines.push(value)});pyodide.setStderr({batched:value=>lines.push(value)});const result=await pyodide.runPythonAsync(data.code);if(result!==undefined&&result!==null)lines.push(String(result));result?.destroy?.();postMessage({type:'result',text:lines.join('\\n')||'Done.'})}catch(error){postMessage({type:'error',text:error?.message||String(error)})}};`;
  const worker = new Worker(
    URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' })),
    { type: 'module' }
  );
  worker.onmessage = (event) => {
    output.textContent = event.data.text;
    if (event.data.type !== 'status') worker.terminate();
  };
  worker.postMessage({ code, packages });
}

function renderRunnable(host) {
  const code = host.dataset.neopresentRunnableCode;
  const language = host.dataset.neopresentRunnableLanguage || 'javascript';
  const packages = (host.dataset.neopresentRunnablePackages || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  if (code === undefined || host.dataset.runnableReady === 'true') return;
  host.dataset.runnableReady = 'true';

  const controls = document.createElement('div');
  Object.assign(controls.style, {
    display: 'flex',
    gap: '.6rem',
    justifyContent: 'flex-end',
    marginTop: '.75rem'
  });
  const run = document.createElement('button');
  run.type = 'button';
  run.textContent = 'Run';
  Object.assign(run.style, {
    background: '#38bdf8',
    border: 0,
    borderRadius: '.4rem',
    color: '#082f49',
    cursor: 'pointer',
    font: '700 .9rem system-ui,sans-serif',
    padding: '.45rem .8rem'
  });
  const output = document.createElement('iframe');
  output.sandbox = 'allow-scripts';
  output.title = `Runnable ${language === 'html' ? 'HTML' : language === 'python' ? 'Python' : 'JavaScript'} output`;
  Object.assign(output.style, {
    background: '#fff',
    border: '1px solid #475569',
    borderRadius: '.4rem',
    display: 'none',
    height: '12rem',
    marginTop: '.75rem',
    width: '100%'
  });
  run.addEventListener('click', () => {
    if (language === 'python') {
      run.disabled = true;
      run.textContent = 'Running…';
      const textOutput = document.createElement('pre');
      Object.assign(textOutput.style, {
        background: '#fff',
        border: '1px solid #475569',
        borderRadius: '.4rem',
        color: '#0f172a',
        display: 'block',
        marginTop: '.75rem',
        minHeight: '5rem',
        padding: '.75rem',
        whiteSpace: 'pre-wrap'
      });
      output.replaceWith(textOutput);
      runPython(code, packages, textOutput);
      return;
    }
    if (language === 'html') {
      output.srcdoc = code;
      output.style.display = 'block';
      return;
    }
    output.srcdoc = createSandboxSource(code);
    output.style.display = 'block';
  });
  controls.append(run);
  host.append(controls, output);
}

function renderAllRunnables() {
  document
    .querySelectorAll('[data-neopresent-runnable-code]')
    .forEach((host) => renderRunnable(host));
}

new MutationObserver(renderAllRunnables).observe(document.documentElement, {
  childList: true,
  subtree: true
});
renderAllRunnables();
