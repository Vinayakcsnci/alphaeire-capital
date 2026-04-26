const AGENT_KEYS = ['researcher', 'designer', 'maker', 'communicator', 'manager'];
const AGENT_LABELS = {
  researcher: 'Aoife — Researcher',
  designer: 'Ciarán — Designer',
  maker: 'Siobhán — Maker',
  communicator: 'Declan — Communicator',
  manager: 'Margaret — Manager',
};

let demoOutputs = {};
let liveOutputs = {};
let currentMode = 'demo';
let selectedAgent = null;

// Load demo outputs on page load
fetch('demo_outputs.json')
  .then(r => r.json())
  .then(data => {
    demoOutputs = data;
    AGENT_KEYS.forEach(key => setBadge(key, 'done'));
    // Auto-select researcher
    selectAgent('researcher');
  })
  .catch(() => console.warn('demo_outputs.json not found — run pipeline.py first'));

function switchMode(mode) {
  currentMode = mode;
  document.getElementById('btn-demo').classList.toggle('active', mode === 'demo');
  document.getElementById('btn-live').classList.toggle('active', mode === 'live');
  document.getElementById('live-controls').classList.toggle('hidden', mode === 'demo');

  if (mode === 'demo') {
    AGENT_KEYS.forEach(key => setBadge(key, demoOutputs[key] ? 'done' : 'ready'));
    if (selectedAgent) selectAgent(selectedAgent);
  } else {
    AGENT_KEYS.forEach(key => setBadge(key, liveOutputs[key] ? 'done' : 'ready'));
    if (selectedAgent) selectAgent(selectedAgent);
  }
}

function selectAgent(key) {
  selectedAgent = key;
  AGENT_KEYS.forEach(k => document.getElementById('card-' + k).classList.remove('selected'));
  document.getElementById('card-' + key).classList.add('selected');

  const outputs = currentMode === 'demo' ? demoOutputs : liveOutputs;
  const content = outputs[key];
  document.getElementById('output-title').textContent = AGENT_LABELS[key];

  const body = document.getElementById('output-body');

  if (!content) {
    body.innerHTML = '<p class="placeholder-text">No output yet — ' +
      (currentMode === 'live' ? 'run the pipeline in Live Mode.' : 'run pipeline.py to generate demo outputs.') +
      '</p>';
    return;
  }

  if (key === 'maker') {
    body.innerHTML =
      '<p class="maker-note">Siobhán built a self-contained HTML dashboard. Rendered below:</p>' +
      '<iframe class="maker-frame" srcdoc="' + escapeAttr(content) + '"></iframe>';
  } else {
    body.textContent = content;
  }
}

function setBadge(key, state) {
  const badge = document.getElementById('badge-' + key);
  badge.className = 'status-badge';
  if (state === 'done') { badge.classList.add('done'); badge.textContent = 'Done'; }
  else if (state === 'running') { badge.classList.add('running'); badge.textContent = 'Running…'; }
  else if (state === 'error') { badge.classList.add('error'); badge.textContent = 'Error'; }
  else { badge.textContent = 'Ready'; }
}

function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
