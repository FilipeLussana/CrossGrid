# CrossGrid - plano de testes manuais

## Posicionamento inicial
1. Abra o jogo (`index.html` ou `npm start` + http://localhost:3000).
2. Confirme que o tabuleiro mostra: 3 peças laranjas no trilho superior, 3 peças verdes no trilho inferior, círculo central com 5 nós amarelos.
3. Confirme que o HUD mostra `Turno: Jogador 1 (laranja)` e `Movimentos: 0`.

## Movimento básico
1. Clique em uma peça laranja. Apenas posições vizinhas válidas devem destacar em amarelo claro.
2. Clique em uma posição destacada. A peça deve se mover e o turno passa para Jogador 2.
3. Tente clicar em uma posição não-vizinha. O movimento deve ser ignorado.

## Bloqueio por peça
1. Mova peças até que uma peça do Jogador 2 (verde) esteja em uma posição vizinha de uma peça laranja.
2. Selecione a peça laranja e tente movê-la para a posição da verde.
3. Resultado esperado: o movimento é recusado (posição não destacada). É preciso desviar pelo anel.

## Vitória
1. Em Humano vs Humano, jogue até que as 3 peças de um jogador estejam nas 3 posições iniciais do oponente.
2. Resultado esperado: o modal de vitória aparece com o nome do vencedor, o timer para e o botão `Reiniciar` inicia uma nova partida.

## Empate por bloqueio total
1. Cenário (raro): em uma posição extrema, mova até que nenhum jogador possa fazer um movimento legal.
2. Resultado esperado: após dois "turnos passa" consecutivos, o modal mostra "Empate".

## Humano vs Computador
1. Selecione `Humano vs Computador` e cada dificuldade (`Fácil`, `Intermediário`, `Avançado`).
2. Faça um movimento como Jogador 1.
3. Resultado esperado: o computador responde em até ~1s e o turno volta para o Jogador 1.
4. No `Avançado`, o temporizador de 20s deve aparecer no HUD durante seu turno.

## Turno passa (sem movimentos)
1. Em Humano vs Humano, manobre suas peças para que, em algum turno, o jogador da vez não tenha movimentos válidos.
2. Resultado esperado: o status do HUD mostra "Jogador X sem movimentos. Turno passa." e o turno passa automaticamente.
