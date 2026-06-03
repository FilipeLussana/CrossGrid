// CrossGrid - versão inicial
const svg = document.getElementById('board');
const statusEl = document.getElementById('status');
const movesEl = document.getElementById('moves');
const turnEl = document.getElementById('turn');
const timerEl = document.getElementById('timer');
const timeLeftEl = document.getElementById('timeLeft');

let state = {
  nodes: [], // {id,x,y,neighbors:[]}
  pieces: [], // {id,node,player}
  turn: 'A',
  mode: 'pvp',
  difficulty: 'easy',
  moveCount: 0,
  selectedPiece: null,
  timerId: null,
  timeLimit: 0
  ,blockedNodes: {} // nodeId -> {turns:number, by: 'A'|'B'}
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
  state.nodes=[]; state.pieces=[]; state.selectedPiece=null;
}

function buildNodes(){
  // build a symmetric grid with central circle intersections
  const w=800,h=600,cols=7,rows=5;
  const marginX=80,marginY=60;
  let id=0;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const x = marginX + c*( (w-2*marginX)/(cols-1) );
      const y = marginY + r*( (h-2*marginY)/(rows-1) );
      state.nodes.push({id:id++,x,y,neighbors:[]});
    }
  }
  // connect orthogonally and diagonals to form paths
  const getIdx=(r,c)=>r*cols+c;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const n = state.nodes[getIdx(r,c)];
    const deltas=[[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
    deltas.forEach(d=>{
      const nr=r+d[0], nc=c+d[1];
      if(nr>=0&&nr<rows&&nc>=0&&nc<cols){
        n.neighbors.push(getIdx(nr,nc));
      }
    });
  }
}

function drawBoard(){
  // draw lines
  state.nodes.forEach(n=>{
    n.neighbors.forEach(i=>{
      if(i>n.id){
        const m=state.nodes[i];
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1',n.x); line.setAttribute('y1',n.y);
        line.setAttribute('x2',m.x); line.setAttribute('y2',m.y);
        line.classList.add('line');
        svg.appendChild(line);
      }
    });
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
  // Place 5 pieces each on top and bottom rows
  const cols=7, rows=5;
  const topRow = 0, bottomRow = rows-1;
  const midCols=[1,2,3,4,5];
  let pid=0;
  midCols.forEach((c,idx)=>{
    const aIdx = topRow*cols + c;
    const bIdx = bottomRow*cols + (cols-1-c);
    state.pieces.push({id:pid++,node:aIdx,player:'A'});
    state.pieces.push({id:pid++,node:bIdx,player:'B'});
  });
  renderPieces();
}

function renderPieces(){
  // remove existing pieces
  const old = svg.querySelectorAll('.piece');
  old.forEach(o=>o.remove());
  state.pieces.forEach(p=>{
    const n = state.nodes[p.node];
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx',n.x); circle.setAttribute('cy',n.y); circle.setAttribute('r',12);
    circle.classList.add('piece');
    circle.classList.add(p.player==='A'?'playerA':'playerB');
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
  highlightAvailableMoves(piece);
}

function onNodeClick(nodeId){
  if(!state.selectedPiece) return;
  const from = state.selectedPiece.node;
  const valid = state.nodes[from].neighbors;
  if(!valid.includes(nodeId)) return;
  // check occupancy and rules
  const occ = state.pieces.find(p=>p.node===nodeId);
  // blocked nodes (medium difficulty): a recently vacated node can block opponent
  const blocked = state.blockedNodes[nodeId];
  if(blocked){
    // block applies only to opponent
    if(blocked.by !== state.selectedPiece.player) return;
  }
  if(occ && occ.player===state.selectedPiece.player) return; // blocked by own piece

  // Advanced: capture on same node
  if(occ && state.difficulty==='hard' && occ.player!==state.selectedPiece.player){
    // capture
    state.pieces = state.pieces.filter(p=>p.id!==occ.id);
  } else if(occ){
    // blocked unless easy (easy allows passing? we disallow moving into occupied except capture on hard)
    if(state.difficulty!=='easy') return;
    // easy: allow stacking? we'll disallow stacking as simpler
    return;
  }

  // move
  // set temporary block on the source node for opponent (medium)
  if(state.difficulty==='medium'){
    state.blockedNodes[from] = {turns:2, by: state.selectedPiece.player};
  }

  state.selectedPiece.node = nodeId;
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
}

function highlightAvailableMoves(piece){
  // clear
  svg.querySelectorAll('.intersection').forEach(el=>el.classList.remove('available'));
  const from = piece.node;
  const valid = state.nodes[from].neighbors;
  valid.forEach(id=>{
    const el = svg.querySelector(`.intersection[data-id='${id}']`);
    if(!el) return;
    // block depending on difficulty
    const occ = state.pieces.find(p=>p.node===id);
    if(occ && occ.player!==piece.player && state.difficulty!=='hard'){
      // blocked on medium
      if(state.difficulty==='medium') return;
    }
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
  const cols=7, rows=5;
  const topRowIdxs = [...Array(cols).keys()].map(c=>c);
  const bottomRowIdxs = [...Array(cols).keys()].map(c=> (rows-1)*cols + c );
  const aWin = state.pieces.filter(p=>p.player==='A').every(p=> bottomRowIdxs.includes(p.node));
  const bWin = state.pieces.filter(p=>p.player==='B').every(p=> topRowIdxs.includes(p.node));
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

/* Simple AI: choose shortest-first move towards opponent base (B tries to reach top) */
function runAI(){
  if(state.turn!=='B') return;
  const difficulty = state.difficulty;
  // build BFS per piece to nearest target
  const cols=7;
  const targets = [...Array(cols).keys()].map(c=> c );

  // A* pathfinding returning path array or null
  function aStar(start, goals, avoidOccupied=true){
    const open = new Set([start]);
    const cameFrom = {};
    const gScore = {}; const fScore = {};
    state.nodes.forEach(n=>{ gScore[n.id]=Infinity; fScore[n.id]=Infinity; });
    gScore[start]=0;
    const heuristic = (a,b)=>{
      const na=state.nodes[a], nb=state.nodes[b];
      const dx=na.x-nb.x, dy=na.y-nb.y; return Math.hypot(dx,dy);
    };
    // pick nearest goal as heuristic target
    const goalSet = new Set(goals);
    fScore[start] = Math.min(...goals.map(g=>heuristic(start,g)));
    const occNodes = state.pieces.map(p=>p.node).filter(n=> n!==start);

    while(open.size){
      // node in open with lowest fScore
      let current=null; let best=Infinity;
      open.forEach(nid=>{ if(fScore[nid]<best){best=fScore[nid]; current=nid;} });
      if(current===null) break;
      if(goalSet.has(current)){
        // reconstruct path
        const path=[]; let cur=current; while(cur!==undefined){ path.unshift(cur); cur=cameFrom[cur]; if(cur===null) break; }
        return path;
      }
      open.delete(current);
      for(const neigh of state.nodes[current].neighbors){
        // skip occupied
        if(avoidOccupied && occNodes.includes(neigh)) continue;
        // skip blocked nodes for AI (blocked by opponent)
        const blocked = state.blockedNodes[neigh];
        if(blocked && blocked.by!=='B') continue;
        const tentative = gScore[current] + heuristic(current,neigh);
        if(tentative < gScore[neigh]){
          cameFrom[neigh]=current; gScore[neigh]=tentative;
          fScore[neigh]=tentative + Math.min(...goals.map(g=>heuristic(neigh,g)));
          open.add(neigh);
        }
      }
    }
    return null;
  }

  // choose best piece by shortest path length
  let candidate = null;
  let bestLen = Infinity;
  for(const p of state.pieces.filter(x=>x.player==='B')){
    const path = aStar(p.node, targets, state.difficulty!=='easy');
    if(path && path.length < bestLen){ bestLen = path.length; candidate = {piece:p,path}; }
  }
  if(!candidate){
    // fallback: random move
    const p = state.pieces.find(x=>x.player==='B');
    const choices = state.nodes[p.node].neighbors.filter(n=> !state.pieces.some(pp=>pp.node===n) && !(state.blockedNodes[n] && state.blockedNodes[n].by!=='B'));
    if(choices.length){ p.node = choices[Math.floor(Math.random()*choices.length)]; state.moveCount++; }
    state.turn='A'; renderPieces(); updateHUD(); checkVictory(); startTurnTimer();
    return;
  }

  // move one step along chosen path
  const {piece,path} = candidate;
  if(!path || path.length<2){ state.turn='A'; startTurnTimer(); return; }
  const next = path[1];
  const occ = state.pieces.find(p=>p.node===next);
  if(occ && occ.player==='A' && state.difficulty==='hard'){
    state.pieces = state.pieces.filter(p=>p.id!==occ.id);
  } else if(occ){
    // blocked
    state.turn='A'; updateHUD(); startTurnTimer(); return;
  }
  // apply temporary block from source if medium
  if(state.difficulty==='medium'){
    const from = piece.node;
    state.blockedNodes[from] = {turns:2, by: 'B'};
  }
  piece.node = next;
  state.moveCount++;
  state.turn='A';
  renderPieces(); updateHUD(); checkVictory();
  startTurnTimer();
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
