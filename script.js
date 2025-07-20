// === Data Storage ===
let debaters = JSON.parse(localStorage.getItem('debaters')) || {};
let showGraduated = false;
let eloHistory = JSON.parse(localStorage.getItem('eloHistory')) || {};
let chart;

// === Debater Management ===
document.getElementById('debater-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('debater-name').value;
  const elo = parseInt(document.getElementById('debater-elo').value);
  const graduated = document.getElementById('debater-graduated').checked;
  debaters[name] = { elo, graduated, history: [{ date: new Date().toISOString().split('T')[0], elo }] };
  save();
  renderDebaters();
});

function renderDebaters() {
  const list = document.getElementById('debater-list');
  list.innerHTML = '';
  for (const name in debaters) {
    if (!showGraduated && debaters[name].graduated) continue;
    const li = document.createElement('li');
    li.textContent = `${name} - Elo: ${debaters[name].elo}${debaters[name].graduated ? ' (Graduated)' : ''}`;
    list.appendChild(li);
  }
}

function toggleGraduated() {
  showGraduated = !showGraduated;
  renderDebaters();
}

// === Practice Round ===
document.getElementById('practice-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const a = document.getElementById('team-a').value;
  const b = document.getElementById('team-b').value;
  const r = parseInt(document.getElementById('result').value);

  if (!(a in debaters) || !(b in debaters)) return alert('Both teams must be registered.');

  const Ra = debaters[a].elo;
  const Rb = debaters[b].elo;
  const E = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
  const Ba = 15 * E;
  const Bb = 15 * (1 - E);
  const Ca = -100 * (r - E);
  const Cb = -100 * ((1 - r) - (1 - E));

  debaters[a].elo = Math.round(Ra + Ca + Ba);
  debaters[b].elo = Math.round(Rb + Cb + Bb);
  logHistory(a);
  logHistory(b);

  save();
  renderDebaters();
  updateChart();
});

// === Tournament ===
document.getElementById('tournament-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('tourn-team').value;
  const elo = parseInt(document.getElementById('tourn-elo').value);
  const rounds = parseInt(document.getElementById('tourn-rounds').value);
  const wins = parseInt(document.getElementById('tourn-wins').value);
  const nov = parseInt(document.getElementById('tourn-novice').value || 0);
  const jv = parseInt(document.getElementById('tourn-jv').value || 0);
  const varsty = parseInt(document.getElementById('tourn-varsity').value || 0);
  const t = parseInt(document.getElementById('tourn-total-teams').value);
  const b = parseFloat(document.getElementById('tourn-bonus').value);

  const n = (nov + jv + varsty) / 3;
  const level = nov > 0 ? 'novice' : jv > 0 ? 'jv' : 'varsity';
  let wadj = 0;
  if (level === 'novice') {
    wadj = (-200 / (rounds - wins + 6.7)) + 30;
  } else if (level === 'jv') {
    wadj = (-200 / (rounds - wins + 9)) + 50;
  } else {
    wadj = (-200 / (rounds - wins + 9)) + 50;
  }
  const s = wadj; // For single team entry
  const eavg = averageElo();
  const p = Math.pow(elo / eavg, 2);
  const E = (s + n / 2) / (t + 1);
  const C = 30 * ((wadj / p) - E) + b;

  debaters[name].elo = Math.round(debaters[name].elo + C);
  logHistory(name);

  save();
  renderDebaters();
  updateChart();
});

// === Helpers ===
function logHistory(name) {
  const date = new Date().toISOString().split('T')[0];
  debaters[name].history.push({ date, elo: debaters[name].elo });
}

function averageElo() {
  const sum = Object.values(debaters).reduce((acc, d) => acc + d.elo, 0);
  return sum / Object.keys(debaters).length;
}

function save() {
  localStorage.setItem('debaters', JSON.stringify(debaters));
  localStorage.setItem('eloHistory', JSON.stringify(eloHistory));
}

function updateChart() {
  const ctx = document.getElementById('eloChart').getContext('2d');
  const datasets = Object.keys(debaters).map(name => ({
    label: name,
    data: debaters[name].history.map(h => ({ x: h.date, y: h.elo })),
    fill: false,
    borderColor: randomColor(),
  }));

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: { scales: { x: { type: 'time', time: { unit: 'day' } } } }
  });
}

function markImportantDate() {
  const date = document.getElementById('mark-date').value;
  const label = document.getElementById('mark-label').value;
  chart.options.plugins = chart.options.plugins || {};
  chart.options.plugins.annotation = {
    annotations: [{ type: 'line', scaleID: 'x', value: date, borderColor: 'red', borderWidth: 2, label: { content: label, enabled: true } }]
  };
  chart.update();
}

function randomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16);
}

function saveToFile() {
  const blob = new Blob([JSON.stringify(debaters)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'debate-elo.json';
  a.click();
}

function loadFromFile(event) {
  const reader = new FileReader();
  reader.onload = (e) => {
    debaters = JSON.parse(e.target.result);
    save();
    renderDebaters();
    updateChart();
  };
  reader.readAsText(event.target.files[0]);
}

function clearData() {
  if (confirm('Are you sure you want to clear all data?')) {
    localStorage.clear();
    location.reload();
  }
}

// === Init ===
renderDebaters();
updateChart();