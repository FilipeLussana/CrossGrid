// CrossGrid sanity checks. Carregue este arquivo após app.js ou cole no console do navegador.
(function () {
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function reset(difficulty = 'easy', mode = 'pvp') {
    state.difficulty = difficulty;
    state.mode = mode;
    startGame();
  }

  function firstPiece(player) {
    return state.pieces.find(p => p.player === player);
  }

  function moveFor(piece, predicate) {
    return getValidMoves(piece).find(predicate || (() => true));
  }

  window.CrossGridSanity = {
    boardShape() {
      reset();
      assert(state.nodes.length === 11, 'Tabuleiro deve ter 11 intersecoes');
      const ringNeighborPairs = [[3, 4], [3, 6], [4, 7], [6, 7]];
      ringNeighborPairs.forEach(([a, b]) => {
        assert(state.nodes[a].neighbors.includes(b), 'Anel deve conectar nos cardeais');
      });
      const crossNeighbors = [[3, 5], [4, 5], [5, 6], [5, 7]];
      crossNeighbors.forEach(([a, b]) => {
        assert(state.nodes[a].neighbors.includes(b), 'Cruz central deve conectar centro aos cardeais');
      });
      assert(state.nodes[1].neighbors.includes(3), 'Trilho superior deve conectar ao circulo');
      assert(state.nodes[9].neighbors.includes(7), 'Trilho inferior deve conectar ao circulo');
      return 'boardShape ok';
    },

    placement() {
      reset();
      const a = state.pieces.filter(p => p.player === 'A');
      const b = state.pieces.filter(p => p.player === 'B');
      assert(a.length === 3, 'A deve iniciar com 3 pecas');
      assert(b.length === 3, 'B deve iniciar com 3 pecas');
      assert(a.every(p => [0, 1, 2].includes(p.node)), 'A inicia no trilho superior');
      assert(b.every(p => [8, 9, 10].includes(p.node)), 'B inicia no trilho inferior');
      return 'placement ok';
    },

    movement() {
      reset();
      const piece = firstPiece('A');
      const target = moveFor(piece);
      assert(target !== undefined, 'A deve ter pelo menos um movimento valido');
      movePiece(piece, target);
      assert(piece.node === target, 'Peca deve mover para o destino valido');
      return 'movement ok';
    },

    noOverlap() {
      reset();
      const a = firstPiece('A');
      const otherA = state.pieces.find(p => p.player === 'A' && p.id !== a.id);
      assert(!canMoveTo(a, otherA.node), 'Movimento para casa ocupada por aliado deve ser invalido');
      // Forçar uma peça B em posição vizinha de A para testar bloqueio por oponente
      state.pieces = [
        { id: 0, node: 5, player: 'A' },
        { id: 1, node: 6, player: 'B' }
      ];
      assert(!canMoveTo(state.pieces[0], 6), 'Movimento para casa ocupada por adversario deve ser invalido');
      return 'noOverlap ok';
    },

    victory() {
      reset();
      state.pieces = [
        { id: 0, node: 8, player: 'A' },
        { id: 1, node: 9, player: 'A' },
        { id: 2, node: 10, player: 'A' },
        { id: 3, node: 3, player: 'B' },
        { id: 4, node: 4, player: 'B' },
        { id: 5, node: 6, player: 'B' }
      ];
      const won = checkVictory();
      assert(won === true, 'Jogador 1 deveria vencer com as 3 pecas na base');
      hideVictory();
      return 'victory ok';
    },

    aiMove() {
      reset('easy', 'pvc');
      state.turn = 'B';
      const before = state.moveCount;
      runAI();
      assert(state.turn === 'A', 'IA deve devolver o turno para A');
      assert(state.moveCount === before + 1, 'IA deve incrementar movimentos quando move');
      return 'aiMove ok';
    },

    all() {
      return [
        this.boardShape(),
        this.placement(),
        this.movement(),
        this.noOverlap(),
        this.victory(),
        this.aiMove()
      ];
    }
  };
})();
