const pollChannel = new BroadcastChannel('neopresent-polls');
const pollCounts = new Map();

function parsePoll(source) {
  const lines = source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    question: lines[0] || 'Audience poll',
    options: lines
      .slice(1)
      .map((line) => line.replace(/^[-*]\s*/, ''))
      .filter(Boolean)
  };
}

function updateResults(host, counts) {
  host.querySelectorAll('[data-poll-option]').forEach((button) => {
    const index = Number(button.dataset.pollOption);
    const count = counts[index] || 0;
    button.querySelector('.np-poll-count').textContent = String(count);
  });
}

function renderPoll(host) {
  const id = host.dataset.neopresentPollId;
  const source = host.dataset.neopresentPollSource;
  if (!id || !source || host.dataset.pollRendered === source) return;
  const { question, options } = parsePoll(source);
  const counts = pollCounts.get(id) || Array.from({ length: options.length }, () => 0);
  pollCounts.set(id, counts);
  host.replaceChildren();
  host.dataset.pollRendered = source;
  Object.assign(host.style, {
    background: 'rgba(15,23,42,.86)',
    border: '1px solid #475569',
    borderRadius: '.8rem',
    padding: '1.35rem'
  });
  const title = document.createElement('h3');
  title.textContent = question;
  Object.assign(title.style, { fontSize: '1.5rem', margin: '0 0 1rem' });
  host.append(title);
  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.pollOption = String(index);
    button.innerHTML = `<span>${option}</span><strong class="np-poll-count">${counts[index]}</strong>`;
    Object.assign(button.style, {
      alignItems: 'center',
      background: '#172554',
      border: '1px solid #60a5fa',
      borderRadius: '.55rem',
      color: '#eff6ff',
      cursor: 'pointer',
      display: 'flex',
      font: '600 1.2rem/1.3 system-ui,sans-serif',
      justifyContent: 'space-between',
      margin: '.55rem 0',
      padding: '.7rem .85rem',
      textAlign: 'left',
      width: '100%'
    });
    button.addEventListener('click', () => {
      counts[index] += 1;
      updateResults(host, counts);
      pollChannel.postMessage({ type: 'vote', id, index, optionCount: options.length });
    });
    host.append(button);
  });
}

pollChannel.onmessage = (event) => {
  const { id, index, optionCount, type } = event.data || {};
  if (type !== 'vote' || !id || !Number.isInteger(index)) return;
  const counts = pollCounts.get(id) || Array.from({ length: Number(optionCount) || 0 }, () => 0);
  counts[index] = (counts[index] || 0) + 1;
  pollCounts.set(id, counts);
  document
    .querySelectorAll(`[data-neopresent-poll-id="${CSS.escape(id)}"]`)
    .forEach((host) => updateResults(host, counts));
};

function renderAllPolls() {
  document.querySelectorAll('[data-neopresent-poll-id]').forEach((host) => renderPoll(host));
}

new MutationObserver(renderAllPolls).observe(document.documentElement, {
  childList: true,
  subtree: true
});
renderAllPolls();
