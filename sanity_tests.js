// CrossGrid sanity checks. Load this file after app.js or paste it in the browser console.
(function(){
  function assert(condition, message){
    if(!condition) throw new Error(message);
  }

  function reset(difficulty = 'easy', mode = 'pvp'){
    state.difficulty = difficulty;
    state.mode = mode;
    startGame();
  }

  function firstPiece(player){
    return state.pieces.find(p=>p.player===player);
  }

  function moveFor(piece, predicate){
    return getValidMoves(piece).find(predicate || (()=>true));
  }

  window.CrossGridSanity = {
    boardShape(){
      reset();
      const circularPaths = [[3,4],[3,6],[4,7],[6,7]];
      assert(state.nodes.length===11, 'Tabuleiro deve ter 11 intersecoes');
      assert(state.edges.filter(edge=>edge.visible).length===10, 'Somente linhas retas devem ser desenhadas');
      circularPaths.forEach(([a,b])=>{
        assert(state.nodes[a].neighbors.includes(b), 'Borda circular deve permitir movimento');
        assert(state.edges.some(edge=>edge.a===a && edge.b===b && !edge.visible), 'Borda circular nao deve desenhar diagonais');
      });
      return 'boardShape ok';
    },

    placement(){
      reset();
      assert(state.pieces.filter(p=>p.player==='A').length===3, 'A deve iniciar com 3 pecas');
      assert(state.pieces.filter(p=>p.player==='B').length===3, 'B deve iniciar com 3 pecas');
      assert(new Set(state.pieces.map(p=>p.node)).size===state.pieces.length, 'Pecas nao devem empilhar no inicio');
      return 'placement ok';
    },

    movement(){
      reset();
      const piece = firstPiece('A');
      const target = moveFor(piece);
      assert(target!==undefined, 'A deve ter pelo menos um movimento valido');
      movePiece(piece, target);
      assert(piece.node===target, 'Peca deve mover para o destino valido');
      return 'movement ok';
    },

    noStacking(){
      reset('easy');
      const piece = firstPiece('A');
      const ownNode = state.pieces.find(p=>p.player==='A' && p.id!==piece.id).node;
      assert(!canMoveTo(piece, ownNode), 'Movimento para casa ocupada por aliado deve ser invalido');
      return 'noStacking ok';
    },

    blocking(){
      reset('medium');
      const piece = firstPiece('A');
      const from = piece.node;
      const target = moveFor(piece, nodeId=>!getPieceAt(nodeId));
      assert(target!==undefined, 'A deve ter movimento vazio em medium');
      movePiece(piece, target);
      assert(state.blockedNodes[from], 'Origem deve virar bloqueio temporario');
      assert(isNodeBlockedFor(from, 'B'), 'Bloqueio deve afetar o adversario');
      assert(!isNodeBlockedFor(from, 'A'), 'Bloqueio nao deve afetar o dono');
      decrementBlockedNodes();
      decrementBlockedNodes();
      assert(!state.blockedNodes[from], 'Bloqueio deve expirar apos duas reducoes');
      return 'blocking ok';
    },

    capture(){
      reset('hard');
      state.pieces = [
        {id:0,node:5,player:'A'},
        {id:1,node:6,player:'B'}
      ];
      const piece = state.pieces[0];
      assert(canMoveTo(piece, 6), 'Captura adjacente deve ser valida no hard');
      movePiece(piece, 6);
      assert(state.pieces.length===1, 'Peca capturada deve ser removida');
      assert(state.pieces[0].player==='A' && state.pieces[0].node===6, 'Capturador deve ocupar o destino');
      return 'capture ok';
    },

    aiMove(){
      reset('easy', 'pvc');
      state.turn = 'B';
      const before = state.moveCount;
      runAI();
      assert(state.turn==='A', 'AI deve devolver o turno para A');
      assert(state.moveCount===before+1, 'AI deve incrementar movimentos quando move');
      return 'aiMove ok';
    },

    all(){
      return [
        this.boardShape(),
        this.placement(),
        this.movement(),
        this.noStacking(),
        this.blocking(),
        this.capture(),
        this.aiMove()
      ];
    }
  };
})();
