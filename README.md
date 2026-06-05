# CrossGrid

Jogo web de estratégia em turnos. Dois jogadores percorrem uma grade circular tentando alcançar o lado oposto.

## Como rodar

- Abra `index.html` em um navegador moderno, **ou**
- Execute `npm start` e abra `http://localhost:3000`.

## Regras

- **Tabuleiro:** dois trilhos retos (topo e base) ligados por um círculo central. O círculo tem 4 posições nas extremidades cardeais e 1 no centro, formando uma cruz.
- **Peças:** Jogador 1 (laranja) começa nas 3 posições do trilho superior. Jogador 2 (verde) começa nas 3 posições do trilho inferior.
- **Movimento:** em seu turno, selecione uma peça sua e mova-a para uma posição vizinha conectada (uma posição por turno).
- **Bloqueio por oponente:** você não pode ocupar uma posição que já contenha qualquer peça (sua ou do adversário). Se o caminho mais curto estiver ocupado, contorne pelo anel.
- **Vitória:** o primeiro jogador a colocar **todas as suas 3 peças** no trilho inicial do oponente vence.
- **Empate:** se ambos os jogadores ficarem sem movimentos válidos consecutivamente, a partida termina empatada.

## Modos e dificuldade

- **Humano vs Humano:** dois jogadores alternam turnos no mesmo navegador.
- **Humano vs Computador:** você controla o Jogador 1 (laranja); o computador controla o Jogador 2 (verde).
- Dificuldades afetam apenas a força da IA — as regras do jogo são sempre as mesmas.
  - **Fácil:** escolhe movimentos com viés simples para frente.
  - **Intermediário:** usa A* para se aproximar do trilho-alvo.
  - **Avançado:** busca de 2 jogadas com avaliação heurística. Adiciona temporizador de 20s por turno.

## Deploy no Railway

1. Envie o repositório para o GitHub.
2. No Railway, crie um novo projeto a partir do repositório.
3. O Railway detecta o `package.json` e executa `npm start`.
4. O servidor usa automaticamente a variável `PORT` definida pelo Railway.

## Espaço para propaganda

O `div#ad` em `index.html` está reservado para integração de anúncios (ex: Google AdSense). Substitua o conteúdo pelo snippet do provedor.
