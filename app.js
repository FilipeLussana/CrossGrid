// CrossGrid - versão inicial
const svg = document.getElementById('board');
const statusEl = document.getElementById('status');
const movesEl = document.getElementById('moves');
const turnEl = document.getElementById('turn');
const timerEl = document.getElementById('timer');
const timeLeftEl = document.getElementById('timeLeft');

let state = {
  nodes: [], // {id,x,y,neighbors:[]}
  edges: [], // {a,b,visible}
  pieces: [], // {id,node,player}
  turn: 'A',
  mode: 'pvp',
  difficulty: 'easy',
  moveCount: 0,
  selectedPiece: null,
  timerId: null,
  timeLimit: 0
  ,blockedNodes: {}, // nodeId -> {turns:number, by: 'A'|'B'}
  captureEffects: []
};

function setupMenu(){
  document.getElementById('startBtn').addEventListener('click', ()=>{
    state.mode = document.getElementById('modeSelect').value;
    state.difficulty = document.getElementById('difficultySelect').value;
    startGame();
  });
}

function startGame(){
  clearBoard();
  state.blockedNodes = {};
  state.captureEffects = [];
  buildNodes();
  drawBoard();
  placePieces();
  state.turn='A';
  state.moveCount=0;
  updateHUD();
  startTurnTimer();
  if(state.mode==='pvc' && state.turn==='B') runAI();
}

function clearBoard(){
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  state.nodes=[]; state.edges=[]; state.pieces=[]; state.selectedPiece=null;
}

function buildNodes(){
  // CrossGrid board: two rails connected by a central circle with crossing paths.
  state.nodes = [
    {id:0,label:'top-left',x:180,y:95,row:0,neighbors:[]},
    {id:1,label:'top-center',x:400,y:95,row:0,neighbors:[]},
    {id:2,label:'top-right',x:620,y:95,row:0,neighbors:[]},
    {id:3,label:'circle-top',x:400,y:225,row:1,neighbors:[]},
    {id:4,label:'circle-left',x:205,y:330,row:2,neighbors:[]},
    {id:5,label:'circle-center',x:400,y:330,row:2,neighbors:[]},
    {id:6,label:'circle-right',x:595,y:330,row:2,neighbors:[]},
    {id:7,label:'circle-bottom',x:400,y:465,row:3,neighbors:[]},
    {id:8,label:'bottom-left',x:180,y:535,row:4,neighbors:[]},
    {id:9,label:'bottom-center',x:400,y:535,row:4,neighbors:[]},
    {id:10,label:'bottom-right',x:620,y:535,row:4,neighbors:[]}
  ];

  [
    [0,1],[1,2],
    [1,3],[3,5],[5,7],[7,9],
    [4,5],[5,6],
    [8,9],[9,10]
  ].forEach(([a,b])=>addEdge(a,b));

  // These paths follow the circular border, so the ellipse represents them visually.
  [[3,4],[3,6],[4,7],[6,7]].forEach(([a,b])=>addEdge(a,b,false));
}

function addEdge(a,b,visible=true){
  state.nodes[a].neighbors.push(b);
  state.nodes[b].neighbors.push(a);
  state.edges.push({a,b,visible});
}

function drawBoard(){
  const ring = document.createElementNS('http://www.w3.org/2000/svg','ellipse');
  ring.setAttribute('cx',400);
  ring.setAttribute('cy',340);
  ring.setAttribute('rx',210);
  ring.setAttribute('ry',150);
  ring.classList.add('central-ring');
  svg.appendChild(ring);

  // Draw only straight paths. Circular paths are represented by the ellipse.
  state.edges.filter(edge=>edge.visible).forEach(edge=>{
    const a=state.nodes[edge.a], b=state.nodes[edge.b];
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',a.x); line.setAttribute('y1',a.y);
    line.setAttribute('x2',b.x); line.setAttribute('y2',b.y);
    line.classList.add('line');
    svg.appendChild(line);
  });
  // draw nodes
  state.nodes.forEach(n=>{
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx',n.x); circle.setAttribute('cy',n.y); circle.setAttribute('r',10);
    circle.classList.add('intersection');
    circle.dataset.id = n.id;
    circle.addEventListener('click',()=>onNodeClick(n.id));
    svg.appendChild(circle);
  });
}

function placePieces(){
  // Place 3 pieces each on the top and bottom rails.
  const topNodes = [0,1,2];
  const bottomNodes = [8,9,10];
  let pid=0;
  topNodes.forEach((nodeId,idx)=>{
    state.pieces.push({id:pid++,node:nodeId,player:'A'});
    state.pieces.push({id:pid++,node:bottomNodes[bottomNodes.length-1-idx],player:'B'});
  });
  renderPieces();
}

function getPieceAt(nodeId, pieces = state.pieces){
  return pieces.find(p=>p.node===nodeId);
}

function isNodeBlockedFor(nodeId, player, blockedNodes = state.blockedNodes){
  const blocked = blockedNodes[nodeId];
  return Boolean(blocked && blocked.by !== player);
}

function canMoveTo(piece, nodeId, pieces = state.pieces, blockedNodes = state.blockedNodes, difficulty = state.difficulty){
  if(!piece) return false;
  if(!state.nodes[piece.node].neighbors.includes(nodeId)) return false;
  if(isNodeBlockedFor(nodeId, piece.player, blockedNodes)) return false;
  const occ = getPieceAt(nodeId, pieces);
  if(!occ) return true;
  if(occ.player===piece.player) return false;
  return difficulty==='hard';
}

function getValidMoves(piece, pieces = state.pieces, blockedNodes = state.blockedNodes, difficulty = state.difficulty){
  if(!piece) return [];
  return state.nodes[piece.node].neighbors.filter(nodeId=>canMoveTo(piece, nodeId, pieces, blockedNodes, difficulty));
}

function markCapture(nodeId){
  state.captureEffects.push(nodeId);
  setTimeout(()=>{
    state.captureEffects = state.captureEffects.filter(id=>id!==nodeId);
    renderPieces();
  }, 450);
}

function movePiece(piece, nodeId){
  const from = piece.node;
  const occ = getPieceAt(nodeId);
  if(occ && occ.player!==piece.player && state.difficulty==='hard'){
    state.pieces = state.pieces.filter(p=>p.id!==occ.id);
    markCapture(nodeId);
  }
  if(state.difficulty==='medium'){
    state.blockedNodes[from] = {turns:2, by: piece.player};
  }
  piece.node = nodeId;
}

function renderPieces(){
  // remove existing pieces
  const old = svg.querySelectorAll('.piece,.capture-effect');
  old.forEach(o=>o.remove());
  svg.querySelectorAll('.intersection').forEach(el=>{
    const nodeId = Number(el.dataset.id);
    el.classList.toggle('blocked', Boolean(state.blockedNodes[nodeId]));
    el.classList.remove('available');
  });
  state.captureEffects.forEach(nodeId=>{
    const n = state.nodes[nodeId];
    if(!n) return;
    const effect = document.createElementNS('http://www.w3.org/2000/svg','circle');
    effect.setAttribute('cx',n.x); effect.setAttribute('cy',n.y); effect.setAttribute('r',18);
    effect.classList.add('capture-effect','captured');
    svg.appendChild(effect);
  });
  state.pieces.forEach(p=>{
    const n = state.nodes[p.node];
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx',n.x); circle.setAttribute('cy',n.y); circle.setAttribute('r',12);
    circle.classList.add('piece');
    circle.classList.add(p.player==='A'?'playerA':'playerB');
    if(state.selectedPiece && state.selectedPiece.id===p.id) circle.classList.add('selected');
    circle.dataset.pid = p.id;
    circle.addEventListener('click',(e)=>{ e.stopPropagation(); onPieceClick(p.id); });
    svg.appendChild(circle);
  });
}

function onPieceClick(pid){
  const piece = state.pieces.find(p=>p.id===pid);
  if(!piece) return;
  if((state.turn==='A' && piece.player!=='A') || (state.turn==='B' && piece.player!=='B')) return;
  state.selectedPiece = piece;
  renderPieces();
  highlightAvailableMoves(piece);
}

function onNodeClick(nodeId){
  if(!state.selectedPiece) return;
  if(!canMoveTo(state.selectedPiece, nodeId)) return;
  movePiece(state.selectedPiece, nodeId);
  state.selectedPiece = null;
  state.moveCount++;
  state.turn = state.turn==='A'?'B':'A';
  renderPieces();
  updateHUD();
  clearTurnTimer();
  checkVictory();
  startTurnTimer();
  if(state.mode==='pvc' && state.turn==='B') setTimeout(runAI,300);
}

function decrementBlockedNodes(){
  Object.keys(state.blockedNodes).forEach(k=>{
    const v = state.blockedNodes[k];
    v.turns = v.turns-1;
    if(v.turns<=0) delete state.blockedNodes[k];
  });
  renderBlockedNodes();
}

function renderBlockedNodes(){
  svg.querySelectorAll('.intersection').forEach(el=>{
    const nodeId = Number(el.dataset.id);
    el.classList.toggle('blocked', Boolean(state.blockedNodes[nodeId]));
  });
}

function highlightAvailableMoves(piece){
  // clear
  svg.querySelectorAll('.intersection').forEach(el=>el.classList.remove('available'));
  getValidMoves(piece).forEach(id=>{
    const el = svg.querySelector(`.intersection[data-id='${id}']`);
    if(!el) return;
    el.classList.add('available');
  });
}

function updateHUD(){
  statusEl.textContent = `Dificuldade: ${state.difficulty} • Modo: ${state.mode}`;
  movesEl.textContent = `Movimentos: ${state.moveCount}`;
  turnEl.textContent = `Turno: Jogador ${state.turn}`;
}

function checkVictory(){
  // victory when all pieces of a player reach opponent base row
  const topRowIdxs = [0,1,2];
  const bottomRowIdxs = [8,9,10];
  const aPieces = state.pieces.filter(p=>p.player==='A');
  const bPieces = state.pieces.filter(p=>p.player==='B');
  const aWin = bPieces.length===0 || (aPieces.length>0 && aPieces.every(p=> bottomRowIdxs.includes(p.node)));
  const bWin = aPieces.length===0 || (bPieces.length>0 && bPieces.every(p=> topRowIdxs.includes(p.node)));
  if(aWin || bWin){
    const winner = aWin? 'Jogador A' : 'Jogador B';
    state.turn = '-';
    clearTurnTimer();
    updateHUD();
    showVictory(winner + ' venceu!');
  }
}

function showVictory(message){
  const modal = document.getElementById('victoryModal');
  const msg = document.getElementById('modalMessage');
  const title = document.getElementById('modalWinner');
  title.textContent = 'Vitória';
  msg.textContent = message;
  modal.classList.remove('hidden');
}

function hideVictory(){
  const modal = document.getElementById('victoryModal');
  modal.classList.add('hidden');
}

function restartGame(){
  hideVictory();
  startGame();
}

// wire modal buttons
document.addEventListener('DOMContentLoaded', ()=>{
  const rb = document.getElementById('restartBtn');
  const cb = document.getElementById('closeModalBtn');
  if(rb) rb.addEventListener('click', ()=> restartGame());
  if(cb) cb.addEventListener('click', ()=> hideVictory());
});

function cloneBlockedNodes(blockedNodes){
  const copy = {};
  Object.keys(blockedNodes).forEach(id=>{
    copy[id] = {...blockedNodes[id]};
  });
  return copy;
}

function goalRowFor(player){
  return player==='B' ? 0 : 4;
}

function rowFromNode(nodeId){
  return state.nodes[nodeId].row;
}

function forwardProgress(player, nodeId){
  return player==='B' ? 4 - rowFromNode(nodeId) : rowFromNode(nodeId);
}

function nodeDistance(a,b){
  const na=state.nodes[a], nb=state.nodes[b];
  const dx=na.x-nb.x, dy=na.y-nb.y;
  return Math.hypot(dx,dy);
}

function aStar(start, goals, player, pieces = state.pieces, blockedNodes = state.blockedNodes, difficulty = state.difficulty){
  const open = new Set([start]);
  const cameFrom = {};
  const gScore = {}; const fScore = {};
  const movingPiece = {id:-1,node:start,player};
  const goalSet = new Set(goals);
  state.nodes.forEach(n=>{ gScore[n.id]=Infinity; fScore[n.id]=Infinity; });
  gScore[start]=0;
  fScore[start] = Math.min(...goals.map(g=>nodeDistance(start,g)));

  while(open.size){
    let current=null; let best=Infinity;
    open.forEach(nid=>{ if(fScore[nid]<best){best=fScore[nid]; current=nid;} });
    if(current===null) break;
    if(goalSet.has(current)){
      const path=[];
      let cur=current;
      while(cur!==undefined){
        path.unshift(cur);
        cur=cameFrom[cur];
      }
      return path;
    }
    open.delete(current);
    for(const neigh of state.nodes[current].neighbors){
      movingPiece.node = current;
      if(!canMoveTo(movingPiece, neigh, pieces, blockedNodes, difficulty)) continue;
      const tentative = gScore[current] + nodeDistance(current,neigh);
      if(tentative < gScore[neigh]){
        cameFrom[neigh]=current;
        gScore[neigh]=tentative;
        fScore[neigh]=tentative + Math.min(...goals.map(g=>nodeDistance(neigh,g)));
        open.add(neigh);
      }
    }
  }
  return null;
}

function getAllMoves(player, pieces = state.pieces, blockedNodes = state.blockedNodes, difficulty = state.difficulty){
  return pieces
    .filter(p=>p.player===player)
    .flatMap(p=>getValidMoves(p, pieces, blockedNodes, difficulty).map(nodeId=>({pieceId:p.id,nodeId})));
}

function simulateMove(pieceId, nodeId, boardState = state){
  const pieces = boardState.pieces.map(p=>({...p}));
  const blockedNodes = cloneBlockedNodes(boardState.blockedNodes || {});
  const piece = pieces.find(p=>p.id===pieceId);
  if(!piece || !canMoveTo(piece, nodeId, pieces, blockedNodes, boardState.difficulty || state.difficulty)) return null;
  const occ = pieces.find(p=>p.node===nodeId);
  const from = piece.node;
  let nextPieces = pieces;
  if(occ && occ.player!==piece.player && (boardState.difficulty || state.difficulty)==='hard'){
    nextPieces = pieces.filter(p=>p.id!==occ.id);
  }
  const movedPiece = nextPieces.find(p=>p.id===pieceId);
  movedPiece.node = nodeId;
  if((boardState.difficulty || state.difficulty)==='medium'){
    blockedNodes[from] = {turns:2, by: piece.player};
  }
  return {
    ...boardState,
    pieces: nextPieces,
    blockedNodes,
    turn: piece.player==='A' ? 'B' : 'A'
  };
}

function isThreatened(piece, pieces, blockedNodes, difficulty){
  const opponent = piece.player==='A' ? 'B' : 'A';
  return pieces.some(p=>{
    if(p.player!==opponent) return false;
    const dangerMoves = getValidMoves(p, pieces, blockedNodes, difficulty);
    return dangerMoves.includes(piece.node);
  });
}

function evaluateBoard(boardState, aiPlayer = 'B'){
  const pieces = boardState.pieces;
  const blockedNodes = boardState.blockedNodes || {};
  const difficulty = boardState.difficulty || state.difficulty;
  const opponent = aiPlayer==='A' ? 'B' : 'A';
  let score = 0;

  // Heuristic: material, distance to target row, and immediate capture safety.
  pieces.forEach(p=>{
    const side = p.player===aiPlayer ? 1 : -1;
    score += side * 40;
    score += side * forwardProgress(p.player, p.node) * 8;
    if(rowFromNode(p.node)===goalRowFor(p.player)) score += side * 20;
    if(isThreatened(p, pieces, blockedNodes, difficulty)) score -= side * 10;
  });

  score += getAllMoves(aiPlayer, pieces, blockedNodes, difficulty).length * 2;
  score -= getAllMoves(opponent, pieces, blockedNodes, difficulty).length;
  return score;
}

function chooseEasyMove(){
  const moves = getAllMoves('B');
  if(!moves.length) return null;
  const weighted = [];
  moves.forEach(move=>{
    const piece = state.pieces.find(p=>p.id===move.pieceId);
    const gain = forwardProgress('B', move.nodeId) - forwardProgress('B', piece.node);
    const copies = gain > 0 ? 3 : 1;
    for(let i=0;i<copies;i++) weighted.push(move);
  });
  return weighted[Math.floor(Math.random()*weighted.length)];
}

function chooseMediumMove(){
  const targets = [0,1,2];
  let bestMove = null;
  let bestScore = -Infinity;
  state.pieces.filter(p=>p.player==='B').forEach(piece=>{
    const path = aStar(piece.node, targets, 'B');
    const moves = path && path.length>1 ? [path[1]] : getValidMoves(piece);
    moves.forEach(nodeId=>{
      const simulated = simulateMove(piece.id, nodeId);
      if(!simulated) return;
      const moved = simulated.pieces.find(p=>p.id===piece.id);
      const safety = isThreatened(moved, simulated.pieces, simulated.blockedNodes, 'hard') ? -25 : 0;
      const score = evaluateBoard(simulated, 'B') + safety;
      if(score > bestScore){
        bestScore = score;
        bestMove = {pieceId:piece.id,nodeId};
      }
    });
  });
  return bestMove || chooseEasyMove();
}

function chooseHardMove(){
  const moves = getAllMoves('B');
  let bestMove = null;
  let bestScore = -Infinity;
  moves.forEach(move=>{
    const first = simulateMove(move.pieceId, move.nodeId);
    if(!first) return;
    const replyMoves = getAllMoves('A', first.pieces, first.blockedNodes, 'hard');
    let replyScore = evaluateBoard(first, 'B');
    if(replyMoves.length){
      replyScore = Math.min(...replyMoves.map(reply=>{
        const second = simulateMove(reply.pieceId, reply.nodeId, first);
        return second ? evaluateBoard(second, 'B') : replyScore;
      }));
    }
    const captureBonus = getPieceAt(move.nodeId) && getPieceAt(move.nodeId).player==='A' ? 35 : 0;
    const score = replyScore + captureBonus;
    if(score > bestScore){
      bestScore = score;
      bestMove = move;
    }
  });
  return bestMove || chooseMediumMove();
}

function applyAIMove(move){
  if(!move){
    state.turn='A';
    updateHUD();
    startTurnTimer();
    return;
  }
  const piece = state.pieces.find(p=>p.id===move.pieceId);
  if(piece && canMoveTo(piece, move.nodeId)){
    movePiece(piece, move.nodeId);
    state.moveCount++;
  }
  state.turn='A';
  renderPieces();
  updateHUD();
  checkVictory();
  startTurnTimer();
}

function runAI(){
  if(state.turn!=='B') return;
  const move = state.difficulty==='hard'
    ? chooseHardMove()
    : state.difficulty==='medium'
      ? chooseMediumMove()
      : chooseEasyMove();
  applyAIMove(move);
}

/* Turn timer (used for 'hard' difficulty) */
function startTurnTimer(){
  clearTurnTimer();
  // decrement temporary blocks at the start of a turn
  decrementBlockedNodes();
  if(state.difficulty!=='hard') return;
  state.timeLimit = 15; // seconds per move in hard
  timerEl.classList.remove('hidden');
  timeLeftEl.textContent = state.timeLimit;
  state.timerId = setInterval(()=>{
    state.timeLimit--;
    timeLeftEl.textContent = state.timeLimit;
    if(state.timeLimit<=0){
      clearTurnTimer();
      onTurnTimeout();
    }
  },1000);
}

function clearTurnTimer(){
  if(state.timerId){ clearInterval(state.timerId); state.timerId = null; }
  timerEl.classList.add('hidden');
}

function onTurnTimeout(){
  statusEl.textContent = 'Tempo esgotado!';
  // If AI's turn, run AI immediately; otherwise skip turn
  if(state.mode==='pvc' && state.turn==='B'){
    setTimeout(()=>{ runAI(); }, 200);
    return;
  }
  // skip human turn
  state.turn = state.turn==='A' ? 'B' : 'A';
  state.moveCount++;
  updateHUD();
  if(state.mode==='pvc' && state.turn==='B') setTimeout(runAI,300);
  startTurnTimer();
}

// initial
setupMenu();
// start automatically so user can play immediately
startGame();
