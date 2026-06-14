// CrossGrid - jogo de corrida em grade circular
const svg = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timerEl = document.getElementById('timer');
const timeLeftEl = document.getElementById('timeLeft');
const toastEl = document.getElementById('toast');
const cardA = document.getElementById('cardA');
const cardB = document.getElementById('cardB');
const progressA = document.getElementById('progressA');
const progressB = document.getElementById('progressB');
const statusA = document.getElementById('statusA');
const statusB = document.getElementById('statusB');

const SVG_NS = 'http://www.w3.org/2000/svg';
const CENTER = { x: 300, y: 380 };
const RING_RADIUS = 150;
const RAIL_TOP_Y = 110;
const RAIL_BOTTOM_Y = 650;
const RAIL_X = [150, 300, 450];
const PIECE_R = 30;
const NODE_R = 11;
const HIT_R = 28;
const TOP_ROW = [0, 1, 2];
const BOTTOM_ROW = [8, 9, 10];

let state = {
  nodes: [],
  edges: [],
  pieces: [],
  turn: 'A',
  mode: 'pvp',
  difficulty: 'easy',
  moveCount: 0,
  selectedPiece: null,
  timerId: null,
  timeLimit: 0,
  passedLastTurn: false,
  gameOver: false,
  goalDist: { A: {}, B: {} }
};

let pieceEls = {};
let toastTimer = null;
let muted = false;
const SETTINGS_KEY = 'crossgrid:settings';

function startGame() {
  clearBoard();
  state.passedLastTurn = false;
  state.gameOver = false;
  buildNodes();
  computeGoalDistances();
  drawBoard();
  placePieces();
  state.turn = 'A';
  state.moveCount = 0;
  state.selectedPiece = null;
  updateHUD();
  startTurnTimer();
  if (state.mode === 'pvc' && state.turn === 'B') setTimeout(runAI, 420);
}

function clearBoard() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  state.nodes = [];
  state.edges = [];
  state.pieces = [];
  state.selectedPiece = null;
  pieceEls = {};
}

function buildNodes() {
  // Trilho superior (jogador 1, laranja): nós 0,1,2
  // Círculo central: 3 (topo), 4 (esq), 5 (centro), 6 (dir), 7 (base)
  // Trilho inferior (jogador 2, verde): nós 8,9,10
  state.nodes = [
    { id: 0, x: RAIL_X[0], y: RAIL_TOP_Y, row: 0, zone: 'rail', neighbors: [] },
    { id: 1, x: RAIL_X[1], y: RAIL_TOP_Y, row: 0, zone: 'rail', neighbors: [] },
    { id: 2, x: RAIL_X[2], y: RAIL_TOP_Y, row: 0, zone: 'rail', neighbors: [] },
    { id: 3, x: CENTER.x, y: CENTER.y - RING_RADIUS, row: 1, zone: 'ring', neighbors: [] },
    { id: 4, x: CENTER.x - RING_RADIUS, y: CENTER.y, row: 2, zone: 'ring', neighbors: [] },
    { id: 5, x: CENTER.x, y: CENTER.y, row: 2, zone: 'center', neighbors: [] },
    { id: 6, x: CENTER.x + RING_RADIUS, y: CENTER.y, row: 2, zone: 'ring', neighbors: [] },
    { id: 7, x: CENTER.x, y: CENTER.y + RING_RADIUS, row: 3, zone: 'ring', neighbors: [] },
    { id: 8, x: RAIL_X[0], y: RAIL_BOTTOM_Y, row: 4, zone: 'rail', neighbors: [] },
    { id: 9, x: RAIL_X[1], y: RAIL_BOTTOM_Y, row: 4, zone: 'rail', neighbors: [] },
    { id: 10, x: RAIL_X[2], y: RAIL_BOTTOM_Y, row: 4, zone: 'rail', neighbors: [] }
  ];

  const edges = [
    { a: 0, b: 1, kind: 'rail' },
    { a: 1, b: 2, kind: 'rail' },
    { a: 8, b: 9, kind: 'rail' },
    { a: 9, b: 10, kind: 'rail' },
    { a: 1, b: 3, kind: 'connector' },
    { a: 7, b: 9, kind: 'connector' },
    { a: 3, b: 5, kind: 'cross' },
    { a: 4, b: 5, kind: 'cross' },
    { a: 5, b: 6, kind: 'cross' },
    { a: 5, b: 7, kind: 'cross' },
    { a: 3, b: 4, kind: 'ring' },
    { a: 3, b: 6, kind: 'ring' },
    { a: 4, b: 7, kind: 'ring' },
    { a: 6, b: 7, kind: 'ring' }
  ];
  edges.forEach(e => addEdge(e.a, e.b, e.kind));
}

function addEdge(a, b, kind) {
  state.nodes[a].neighbors.push(b);
  state.nodes[b].neighbors.push(a);
  state.edges.push({ a, b, kind });
}

function makeSVG(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function drawBoard() {
  // Faixas de início/alvo
  const topZone = makeSVG('rect', { x: 95, y: RAIL_TOP_Y - 34, width: 410, height: 68, rx: 34 });
  topZone.classList.add('zone', 'zone-a');
  svg.appendChild(topZone);

  const botZone = makeSVG('rect', { x: 95, y: RAIL_BOTTOM_Y - 34, width: 410, height: 68, rx: 34 });
  botZone.classList.add('zone', 'zone-b');
  svg.appendChild(botZone);

  // Rótulos
  const top = makeSVG('text', { x: CENTER.x, y: 60, 'text-anchor': 'middle' });
  top.classList.add('player-label', 'label-a');
  top.textContent = 'JOGADOR 1';
  svg.appendChild(top);

  const bottom = makeSVG('text', { x: CENTER.x, y: 715, 'text-anchor': 'middle' });
  bottom.classList.add('player-label', 'label-b');
  bottom.textContent = 'JOGADOR 2';
  svg.appendChild(bottom);

  // Trilhos e conectores (linhas finas)
  state.edges.filter(e => e.kind === 'rail' || e.kind === 'connector').forEach(edge => {
    const a = state.nodes[edge.a], b = state.nodes[edge.b];
    const line = makeSVG('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    line.classList.add('edge', 'edge-' + edge.kind);
    svg.appendChild(line);
  });

  // Anel (glow + principal)
  const ringGlow = makeSVG('circle', { cx: CENTER.x, cy: CENTER.y, r: RING_RADIUS });
  ringGlow.classList.add('ring-glow');
  svg.appendChild(ringGlow);
  const ring = makeSVG('circle', { cx: CENTER.x, cy: CENTER.y, r: RING_RADIUS });
  ring.classList.add('ring');
  svg.appendChild(ring);

  // Cruz interna (4 braços a partir do centro)
  state.edges.filter(e => e.kind === 'cross').forEach(edge => {
    const a = state.nodes[edge.a], b = state.nodes[edge.b];
    const line = makeSVG('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    line.classList.add('edge', 'edge-cross');
    svg.appendChild(line);
  });

  // Nós: área de toque ampla + marcador visível
  state.nodes.forEach(n => {
    const hit = makeSVG('circle', { cx: n.x, cy: n.y, r: HIT_R });
    hit.classList.add('hit');
    hit.dataset.id = n.id;
    hit.addEventListener('click', () => onNodeClick(n.id));
    svg.appendChild(hit);

    const dot = makeSVG('circle', { cx: n.x, cy: n.y, r: n.zone === 'rail' ? 0 : NODE_R });
    dot.classList.add('node-dot', 'node-' + n.zone);
    dot.dataset.id = n.id;
    svg.appendChild(dot);
  });
}

function placePieces() {
  let pid = 0;
  TOP_ROW.forEach(nodeId => state.pieces.push({ id: pid++, node: nodeId, player: 'A' }));
  BOTTOM_ROW.forEach(nodeId => state.pieces.push({ id: pid++, node: nodeId, player: 'B' }));
  renderPieces();
}

function getPieceAt(nodeId, pieces = state.pieces) {
  return pieces.find(p => p.node === nodeId);
}

function canMoveTo(piece, nodeId, pieces = state.pieces) {
  if (!piece) return false;
  if (!state.nodes[piece.node].neighbors.includes(nodeId)) return false;
  return !getPieceAt(nodeId, pieces);
}

function getValidMoves(piece, pieces = state.pieces) {
  if (!piece) return [];
  return state.nodes[piece.node].neighbors.filter(nodeId => canMoveTo(piece, nodeId, pieces));
}

function movePiece(piece, nodeId) {
  piece.node = nodeId;
}

function isHome(piece) {
  return targetRowFor(piece.player).includes(piece.node);
}

function countHome(player) {
  const goals = targetRowFor(player);
  return state.pieces.filter(p => p.player === player && goals.includes(p.node)).length;
}

function renderPieces() {
  state.pieces.forEach(p => {
    const n = state.nodes[p.node];
    let el = pieceEls[p.id];
    if (!el) {
      el = makeSVG('circle', { cx: n.x, cy: n.y, r: PIECE_R });
      el.classList.add('piece', 'player' + p.player);
      el.dataset.pid = p.id;
      el.addEventListener('click', e => { e.stopPropagation(); onPieceClick(p.id); });
      svg.appendChild(el);
      pieceEls[p.id] = el;
    }
    el.setAttribute('cx', n.x);
    el.setAttribute('cy', n.y);
    el.classList.toggle('selected', !!(state.selectedPiece && state.selectedPiece.id === p.id));
    el.classList.toggle('home', isHome(p));
  });
}

function clearAvailable() {
  svg.querySelectorAll('.node-dot.available').forEach(el => el.classList.remove('available'));
}

function highlightAvailableMoves(piece) {
  clearAvailable();
  getValidMoves(piece).forEach(id => {
    const el = svg.querySelector(`.node-dot[data-id='${id}']`);
    if (el) el.classList.add('available');
  });
}

function onPieceClick(pid) {
  if (state.gameOver) return;
  const piece = state.pieces.find(p => p.id === pid);
  if (!piece) return;
  if (state.mode === 'pvc' && piece.player === 'B') return;
  if (piece.player !== state.turn) return;
  if (state.selectedPiece && state.selectedPiece.id === pid) {
    state.selectedPiece = null;
    clearAvailable();
    renderPieces();
    return;
  }
  state.selectedPiece = piece;
  sfxSelect();
  buzz(8);
  renderPieces();
  highlightAvailableMoves(piece);
}

function onNodeClick(nodeId) {
  if (state.gameOver) return;
  if (!state.selectedPiece) return;
  if (!canMoveTo(state.selectedPiece, nodeId)) return;
  movePiece(state.selectedPiece, nodeId);
  state.selectedPiece = null;
  state.moveCount++;
  state.passedLastTurn = false;
  state.turn = state.turn === 'A' ? 'B' : 'A';
  clearAvailable();
  renderPieces();
  updateHUD();
  sfxMove();
  buzz(12);
  clearTurnTimer();
  if (checkVictory()) return;
  if (handleNoMoves()) return;
  startTurnTimer();
  if (state.mode === 'pvc' && state.turn === 'B') setTimeout(runAI, 420);
}

function updateHUD() {
  movesEl.textContent = state.moveCount;
  updateProgress('A');
  updateProgress('B');
  cardA.classList.toggle('active', state.turn === 'A' && !state.gameOver);
  cardB.classList.toggle('active', state.turn === 'B' && !state.gameOver);
  setCardStatus('A');
  setCardStatus('B');
}

function updateProgress(player) {
  const el = player === 'A' ? progressA : progressB;
  if (!el) return;
  const n = countHome(player);
  [...el.children].forEach((dot, i) => dot.classList.toggle('filled', i < n));
}

function setCardStatus(player) {
  const el = player === 'A' ? statusA : statusB;
  if (!el) return;
  if (state.gameOver || state.turn !== player) { el.textContent = ''; return; }
  el.textContent = (state.mode === 'pvc' && player === 'B') ? 'pensando…' : 'sua vez';
}

function checkVictory() {
  const aPieces = state.pieces.filter(p => p.player === 'A');
  const bPieces = state.pieces.filter(p => p.player === 'B');
  const aWin = aPieces.length === 3 && aPieces.every(p => BOTTOM_ROW.includes(p.node));
  const bWin = bPieces.length === 3 && bPieces.every(p => TOP_ROW.includes(p.node));
  if (aWin || bWin) {
    state.gameOver = true;
    state.turn = '-';
    clearTurnTimer();
    updateHUD();
    const who = aWin ? 'Jogador 1' : 'Jogador 2';
    showVictory(who + ' levou todas as peças ao destino.', who);
    sfxWin();
    buzz([40, 50, 90]);
    return true;
  }
  return false;
}

function handleNoMoves() {
  if (getAllMoves(state.turn).length > 0) return false;
  if (state.passedLastTurn) {
    state.gameOver = true;
    state.turn = '-';
    clearTurnTimer();
    updateHUD();
    showVictory('Ninguém conseguiu se mover.');
    return true;
  }
  const who = state.turn === 'A' ? 'Jogador 1' : 'Jogador 2';
  showToast(`${who} sem movimentos — passa a vez.`);
  state.passedLastTurn = true;
  state.turn = state.turn === 'A' ? 'B' : 'A';
  updateHUD();
  startTurnTimer();
  if (state.mode === 'pvc' && state.turn === 'B') setTimeout(runAI, 420);
  return true;
}

function showVictory(message, winner) {
  const icon = document.getElementById('victoryIcon');
  if (icon) icon.textContent = winner ? '🏆' : '🤝';
  document.getElementById('modalWinner').textContent = winner ? `${winner} venceu! 🎉` : 'Empate';
  document.getElementById('modalMessage').textContent = message;
  document.getElementById('victoryModal').classList.remove('hidden');
}

function hideVictory() {
  document.getElementById('victoryModal').classList.add('hidden');
}

// ---------- Toast ----------

function showToast(msg, ms = 1900) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  // força reflow para reiniciar a transição
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.classList.add('hidden'), 260);
  }, ms);
}

// ---------- Som e vibração ----------

let audioCtx = null;

function beep(freq, dur, type = 'sine', gain = 0.04) {
  if (muted) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur);
  } catch (e) { /* áudio indisponível */ }
}

function sfxSelect() { beep(620, 0.05, 'sine', 0.03); }
function sfxMove() { beep(440, 0.09, 'triangle', 0.045); }
function sfxWin() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.26, 'sine', 0.05), i * 120)); }

function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* sem suporte */ }
}

// ---------- IA ----------

function getAllMoves(player, pieces = state.pieces) {
  return pieces
    .filter(p => p.player === player)
    .flatMap(p => getValidMoves(p, pieces).map(nodeId => ({ pieceId: p.id, nodeId })));
}

function targetRowFor(player) {
  return player === 'A' ? BOTTOM_ROW : TOP_ROW;
}

function computeGoalDistances() {
  ['A', 'B'].forEach(player => {
    const goals = targetRowFor(player);
    const dist = {};
    state.nodes.forEach(n => { dist[n.id] = Infinity; });
    const queue = [];
    goals.forEach(g => { dist[g] = 0; queue.push(g); });
    while (queue.length) {
      const cur = queue.shift();
      state.nodes[cur].neighbors.forEach(nb => {
        if (dist[nb] === Infinity) {
          dist[nb] = dist[cur] + 1;
          queue.push(nb);
        }
      });
    }
    state.goalDist[player] = dist;
  });
}

function forwardProgress(player, nodeId) {
  // Progresso = (distância máxima possível) - (distância em grafo até o trilho-alvo).
  // Sem isso, peças nos cantos (8/10) e no centro do trilho (9) parecem ter o mesmo
  // valor — e a IA nunca move os cantos. Why: nós 8/9/10 estão na mesma "row",
  // mas em distância de grafo são 5/4/5 respectivamente até o alvo.
  const d = state.goalDist[player][nodeId];
  if (d === undefined || d === Infinity) return 0;
  return 5 - d;
}

function nodeDistance(a, b) {
  const na = state.nodes[a], nb = state.nodes[b];
  return Math.hypot(na.x - nb.x, na.y - nb.y);
}

function simulateMove(pieceId, nodeId, boardPieces = state.pieces) {
  const pieces = boardPieces.map(p => ({ ...p }));
  const piece = pieces.find(p => p.id === pieceId);
  if (!piece) return null;
  if (!state.nodes[piece.node].neighbors.includes(nodeId)) return null;
  if (getPieceAt(nodeId, pieces)) return null;
  piece.node = nodeId;
  return pieces;
}

function aStar(start, goals, pieces, ownerPlayer) {
  const goalSet = new Set(goals);
  if (goalSet.has(start)) return [start];
  const movingPiece = { id: -1, node: start, player: ownerPlayer };
  const open = new Set([start]);
  const cameFrom = {};
  const gScore = {}, fScore = {};
  state.nodes.forEach(n => { gScore[n.id] = Infinity; fScore[n.id] = Infinity; });
  gScore[start] = 0;
  fScore[start] = Math.min(...goals.map(g => nodeDistance(start, g)));
  while (open.size) {
    let current = null, best = Infinity;
    open.forEach(nid => { if (fScore[nid] < best) { best = fScore[nid]; current = nid; } });
    if (current === null) break;
    if (goalSet.has(current)) {
      const path = [];
      let cur = current;
      while (cur !== undefined) { path.unshift(cur); cur = cameFrom[cur]; }
      return path;
    }
    open.delete(current);
    for (const neigh of state.nodes[current].neighbors) {
      movingPiece.node = current;
      if (!canMoveTo(movingPiece, neigh, pieces)) continue;
      const tentative = gScore[current] + nodeDistance(current, neigh);
      if (tentative < gScore[neigh]) {
        cameFrom[neigh] = current;
        gScore[neigh] = tentative;
        fScore[neigh] = tentative + Math.min(...goals.map(g => nodeDistance(neigh, g)));
        open.add(neigh);
      }
    }
  }
  return null;
}

function evaluateBoard(pieces, aiPlayer = 'B') {
  const opp = aiPlayer === 'A' ? 'B' : 'A';
  const myGoals = targetRowFor(aiPlayer);
  const oppGoals = targetRowFor(opp);
  let score = 0;
  pieces.forEach(p => {
    const side = p.player === aiPlayer ? 1 : -1;
    score += side * forwardProgress(p.player, p.node) * 10;
    const goalsForP = p.player === aiPlayer ? myGoals : oppGoals;
    if (goalsForP.includes(p.node)) score += side * 30;
  });
  score += getAllMoves(aiPlayer, pieces).length * 2;
  score -= getAllMoves(opp, pieces).length * 2;
  return score;
}

function chooseEasyMove() {
  const moves = getAllMoves('B');
  if (!moves.length) return null;
  const weighted = [];
  moves.forEach(move => {
    const piece = state.pieces.find(p => p.id === move.pieceId);
    const gain = forwardProgress('B', move.nodeId) - forwardProgress('B', piece.node);
    const copies = gain > 0 ? 3 : 1;
    for (let i = 0; i < copies; i++) weighted.push(move);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

function chooseMediumMove() {
  const bPieces = state.pieces.filter(p => p.player === 'B');
  let bestMove = null;
  let bestScore = -Infinity;
  bPieces.forEach(piece => {
    const goals = TOP_ROW.filter(t =>
      !state.pieces.find(p => p.player === 'B' && p.id !== piece.id && p.node === t)
    );
    if (!goals.length) return;
    const path = aStar(piece.node, goals, state.pieces, 'B');
    const candidates = path && path.length > 1 ? [path[1]] : getValidMoves(piece);
    candidates.forEach(nodeId => {
      const sim = simulateMove(piece.id, nodeId);
      if (!sim) return;
      const score = evaluateBoard(sim, 'B');
      if (score > bestScore) {
        bestScore = score;
        bestMove = { pieceId: piece.id, nodeId };
      }
    });
  });
  return bestMove || chooseEasyMove();
}

function chooseHardMove() {
  const moves = getAllMoves('B');
  if (!moves.length) return null;
  let bestMove = null;
  let bestScore = -Infinity;
  moves.forEach(move => {
    const after = simulateMove(move.pieceId, move.nodeId);
    if (!after) return;
    const replies = getAllMoves('A', after);
    let worst = evaluateBoard(after, 'B');
    if (replies.length) {
      worst = Infinity;
      replies.forEach(reply => {
        const after2 = simulateMove(reply.pieceId, reply.nodeId, after);
        if (!after2) return;
        const sc = evaluateBoard(after2, 'B');
        if (sc < worst) worst = sc;
      });
      if (worst === Infinity) worst = evaluateBoard(after, 'B');
    }
    if (worst > bestScore) {
      bestScore = worst;
      bestMove = move;
    }
  });
  return bestMove;
}

function applyAIMove(move) {
  if (!move) {
    state.turn = 'A';
    updateHUD();
    if (checkVictory()) return;
    handleNoMoves();
    return;
  }
  const piece = state.pieces.find(p => p.id === move.pieceId);
  if (piece && canMoveTo(piece, move.nodeId)) {
    movePiece(piece, move.nodeId);
    state.moveCount++;
    state.passedLastTurn = false;
  }
  state.turn = 'A';
  renderPieces();
  updateHUD();
  sfxMove();
  clearTurnTimer();
  if (checkVictory()) return;
  if (handleNoMoves()) return;
  startTurnTimer();
}

function runAI() {
  if (state.gameOver) return;
  if (state.turn !== 'B') return;
  const move = state.difficulty === 'hard' ? chooseHardMove()
    : state.difficulty === 'medium' ? chooseMediumMove()
    : chooseEasyMove();
  applyAIMove(move);
}

// ---------- Timer (Difícil) ----------

function startTurnTimer() {
  clearTurnTimer();
  if (state.difficulty !== 'hard') return;
  if (state.gameOver) return;
  state.timeLimit = 20;
  timerEl.classList.remove('hidden');
  timeLeftEl.textContent = state.timeLimit;
  state.timerId = setInterval(() => {
    state.timeLimit--;
    timeLeftEl.textContent = state.timeLimit;
    if (state.timeLimit <= 0) {
      clearTurnTimer();
      onTurnTimeout();
    }
  }, 1000);
}

function clearTurnTimer() {
  if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  timerEl.classList.add('hidden');
}

function onTurnTimeout() {
  if (state.gameOver) return;
  showToast('Tempo esgotado! Passa a vez.');
  if (state.mode === 'pvc' && state.turn === 'B') {
    setTimeout(runAI, 200);
    return;
  }
  state.turn = state.turn === 'A' ? 'B' : 'A';
  state.selectedPiece = null;
  state.passedLastTurn = false;
  clearAvailable();
  renderPieces();
  updateHUD();
  if (checkVictory()) return;
  if (handleNoMoves()) return;
  startTurnTimer();
  if (state.mode === 'pvc' && state.turn === 'B') setTimeout(runAI, 420);
}

// ---------- UI / preferências ----------

function showOverlay(id) { document.getElementById(id).classList.remove('hidden'); }
function hideOverlay(id) { document.getElementById(id).classList.add('hidden'); }

function updateDifficultyVisibility() {
  const pvc = document.getElementById('modeSelect').value === 'pvc';
  const field = document.getElementById('difficultyField');
  if (field) field.style.display = pvc ? '' : 'none';
}

function updateSoundBtn() {
  const b = document.getElementById('soundBtn');
  if (!b) return;
  b.textContent = muted ? '🔇' : '🔊';
  b.classList.toggle('off', muted);
}

function toggleSound() {
  muted = !muted;
  updateSoundBtn();
  saveSettings();
  if (!muted) sfxSelect();
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (s.mode) document.getElementById('modeSelect').value = s.mode;
    if (s.difficulty) document.getElementById('difficultySelect').value = s.difficulty;
    muted = !!s.muted;
  } catch (e) { /* localStorage indisponível */ }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      mode: document.getElementById('modeSelect').value,
      difficulty: document.getElementById('difficultySelect').value,
      muted
    }));
  } catch (e) { /* localStorage indisponível */ }
}

function applyMenuSettings() {
  state.mode = document.getElementById('modeSelect').value;
  state.difficulty = document.getElementById('difficultySelect').value;
}

function setupUI() {
  const modeSel = document.getElementById('modeSelect');
  const diffSel = document.getElementById('difficultySelect');

  document.getElementById('startBtn').addEventListener('click', () => {
    applyMenuSettings();
    saveSettings();
    hideOverlay('startScreen');
    startGame();
  });
  modeSel.addEventListener('change', () => { updateDifficultyVisibility(); saveSettings(); });
  diffSel.addEventListener('change', saveSettings);

  document.getElementById('newGameBtn').addEventListener('click', () => { applyMenuSettings(); startGame(); });
  document.getElementById('menuBtn').addEventListener('click', () => showOverlay('startScreen'));
  document.getElementById('soundBtn').addEventListener('click', toggleSound);

  const howToBtn = document.getElementById('howToBtn');
  if (howToBtn) howToBtn.addEventListener('click', () => showOverlay('howToModal'));
  const howToClose = document.getElementById('howToCloseBtn');
  if (howToClose) howToClose.addEventListener('click', () => hideOverlay('howToModal'));

  const rb = document.getElementById('restartBtn');
  const cb = document.getElementById('closeModalBtn');
  if (rb) rb.addEventListener('click', () => { hideVictory(); startGame(); });
  if (cb) cb.addEventListener('click', hideVictory);

  // toque no fundo do tabuleiro desfaz a seleção
  svg.addEventListener('click', e => {
    if (e.target === svg && state.selectedPiece) {
      state.selectedPiece = null;
      clearAvailable();
      renderPieces();
    }
  });
}

loadSettings();
setupUI();
updateDifficultyVisibility();
updateSoundBtn();
applyMenuSettings();
startGame();
