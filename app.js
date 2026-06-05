// CrossGrid - jogo de corrida em grade circular
const svg = document.getElementById('board');
const statusEl = document.getElementById('status');
const movesEl = document.getElementById('moves');
const turnEl = document.getElementById('turn');
const timerEl = document.getElementById('timer');
const timeLeftEl = document.getElementById('timeLeft');

const SVG_NS = 'http://www.w3.org/2000/svg';
const CENTER = { x: 400, y: 340 };
const RING_RADIUS = 170;
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

function setupMenu() {
  document.getElementById('startBtn').addEventListener('click', () => {
    state.mode = document.getElementById('modeSelect').value;
    state.difficulty = document.getElementById('difficultySelect').value;
    startGame();
  });
}

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
  updateHUD();
  startTurnTimer();
  if (state.mode === 'pvc' && state.turn === 'B') setTimeout(runAI, 350);
}

function clearBoard() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  state.nodes = [];
  state.edges = [];
  state.pieces = [];
  state.selectedPiece = null;
}

function buildNodes() {
  // Trilho superior (jogador 1, laranja): nós 0,1,2
  // Círculo central: 3 (topo), 4 (esq), 5 (centro), 6 (dir), 7 (base)
  // Trilho inferior (jogador 2, verde): nós 8,9,10
  state.nodes = [
    { id: 0, x: 250, y: 100, row: 0, zone: 'rail', neighbors: [] },
    { id: 1, x: 400, y: 100, row: 0, zone: 'rail', neighbors: [] },
    { id: 2, x: 550, y: 100, row: 0, zone: 'rail', neighbors: [] },
    { id: 3, x: CENTER.x, y: CENTER.y - RING_RADIUS, row: 1, zone: 'ring', neighbors: [] },
    { id: 4, x: CENTER.x - RING_RADIUS, y: CENTER.y, row: 2, zone: 'ring', neighbors: [] },
    { id: 5, x: CENTER.x, y: CENTER.y, row: 2, zone: 'center', neighbors: [] },
    { id: 6, x: CENTER.x + RING_RADIUS, y: CENTER.y, row: 2, zone: 'ring', neighbors: [] },
    { id: 7, x: CENTER.x, y: CENTER.y + RING_RADIUS, row: 3, zone: 'ring', neighbors: [] },
    { id: 8, x: 250, y: 580, row: 4, zone: 'rail', neighbors: [] },
    { id: 9, x: 400, y: 580, row: 4, zone: 'rail', neighbors: [] },
    { id: 10, x: 550, y: 580, row: 4, zone: 'rail', neighbors: [] }
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
  const top = makeSVG('text', { x: CENTER.x, y: 40, 'text-anchor': 'middle' });
  top.classList.add('player-label');
  top.textContent = 'Jogador 1';
  svg.appendChild(top);

  const bottom = makeSVG('text', { x: CENTER.x, y: 645, 'text-anchor': 'middle' });
  bottom.classList.add('player-label');
  bottom.textContent = 'Jogador 2';
  svg.appendChild(bottom);

  // Trilhos e conectores (linhas finas)
  state.edges.filter(e => e.kind === 'rail' || e.kind === 'connector').forEach(edge => {
    const a = state.nodes[edge.a], b = state.nodes[edge.b];
    const line = makeSVG('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    line.classList.add('edge', 'edge-' + edge.kind);
    svg.appendChild(line);
  });

  // Anel (representa as 4 arestas circulares)
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

  // Nós
  state.nodes.forEach(n => {
    const c = makeSVG('circle', { cx: n.x, cy: n.y, r: 12 });
    c.classList.add('intersection', 'intersection-' + n.zone);
    c.dataset.id = n.id;
    c.addEventListener('click', () => onNodeClick(n.id));
    svg.appendChild(c);
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

function renderPieces() {
  svg.querySelectorAll('.piece').forEach(o => o.remove());
  svg.querySelectorAll('.intersection').forEach(el => el.classList.remove('available'));
  state.pieces.forEach(p => {
    const n = state.nodes[p.node];
    const c = makeSVG('circle', { cx: n.x, cy: n.y, r: 24 });
    c.classList.add('piece', 'player' + p.player);
    if (state.selectedPiece && state.selectedPiece.id === p.id) c.classList.add('selected');
    c.dataset.pid = p.id;
    c.addEventListener('click', e => { e.stopPropagation(); onPieceClick(p.id); });
    svg.appendChild(c);
  });
}

function onPieceClick(pid) {
  if (state.gameOver) return;
  const piece = state.pieces.find(p => p.id === pid);
  if (!piece) return;
  if (state.mode === 'pvc' && piece.player === 'B') return;
  if (piece.player !== state.turn) return;
  state.selectedPiece = piece;
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
  renderPieces();
  updateHUD();
  clearTurnTimer();
  if (checkVictory()) return;
  if (handleNoMoves()) return;
  startTurnTimer();
  if (state.mode === 'pvc' && state.turn === 'B') setTimeout(runAI, 350);
}

function highlightAvailableMoves(piece) {
  svg.querySelectorAll('.intersection').forEach(el => el.classList.remove('available'));
  getValidMoves(piece).forEach(id => {
    const el = svg.querySelector(`.intersection[data-id='${id}']`);
    if (el) el.classList.add('available');
  });
}

function updateHUD() {
  statusEl.textContent = `Dificuldade: ${state.difficulty} • Modo: ${state.mode}`;
  movesEl.textContent = `Movimentos: ${state.moveCount}`;
  const label = state.turn === 'A' ? 'Jogador 1 (laranja)'
    : state.turn === 'B' ? 'Jogador 2 (verde)' : '-';
  turnEl.textContent = `Turno: ${label}`;
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
    showVictory((aWin ? 'Jogador 1' : 'Jogador 2') + ' venceu!');
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
    showVictory('Empate: nenhum jogador pode se mover.');
    return true;
  }
  const who = state.turn === 'A' ? 'Jogador 1' : 'Jogador 2';
  statusEl.textContent = `${who} sem movimentos. Turno passa.`;
  state.passedLastTurn = true;
  state.turn = state.turn === 'A' ? 'B' : 'A';
  updateHUD();
  startTurnTimer();
  if (state.mode === 'pvc' && state.turn === 'B') setTimeout(runAI, 350);
  return true;
}

function showVictory(message) {
  document.getElementById('modalWinner').textContent = 'Fim de jogo';
  document.getElementById('modalMessage').textContent = message;
  document.getElementById('victoryModal').classList.remove('hidden');
}

function hideVictory() {
  document.getElementById('victoryModal').classList.add('hidden');
}

function restartGame() {
  hideVictory();
  startGame();
}

document.addEventListener('DOMContentLoaded', () => {
  const rb = document.getElementById('restartBtn');
  const cb = document.getElementById('closeModalBtn');
  if (rb) rb.addEventListener('click', restartGame);
  if (cb) cb.addEventListener('click', hideVictory);
});

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

// ---------- Timer (Avançado) ----------

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
  statusEl.textContent = 'Tempo esgotado! Turno passa.';
  if (state.mode === 'pvc' && state.turn === 'B') {
    setTimeout(runAI, 200);
    return;
  }
  state.turn = state.turn === 'A' ? 'B' : 'A';
  state.selectedPiece = null;
  state.passedLastTurn = false;
  renderPieces();
  updateHUD();
  if (checkVictory()) return;
  if (handleNoMoves()) return;
  startTurnTimer();
  if (state.mode === 'pvc' && state.turn === 'B') setTimeout(runAI, 350);
}

setupMenu();
startGame();
