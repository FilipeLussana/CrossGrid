# CrossGrid - plano de testes manuais

## Inicio e posicionamento
1. Abra `index.html` no navegador.
2. Confirme que o tabuleiro aparece com 5 pecas do Jogador A na linha superior e 5 pecas do Jogador B na linha inferior.
3. Clique em `Iniciar Jogo` e confirme que o HUD mostra `Turno: Jogador A` e `Movimentos: 0`.

## Movimento e ocupacao
1. Em `Facil`, selecione uma peca do Jogador A.
2. Confirme que apenas intersecoes vizinhas validas recebem destaque.
3. Tente mover para uma intersecao ocupada por qualquer peca.
4. Resultado esperado: a peca nao se move e nao ocorre empilhamento.

## Bloqueio no Intermediario
1. Selecione `Intermediario` e inicie o jogo.
2. Mova uma peca do Jogador A para uma casa vizinha vazia.
3. Resultado esperado: a casa de origem fica marcada visualmente como bloqueada.
4. No turno do Jogador B, tente mover uma peca para essa casa bloqueada.
5. Resultado esperado: o movimento e recusado.
6. Avance os turnos ate o bloqueio expirar.
7. Resultado esperado: a marcacao visual desaparece.

## Captura no Avancado
1. Selecione `Avancado` e inicie o jogo.
2. Posicione, por movimentos validos, uma peca adjacente a uma peca adversaria.
3. Mova a peca para a intersecao ocupada pelo adversario.
4. Resultado esperado: a peca adversaria e removida, aparece um efeito visual de captura e o contador de movimentos aumenta em 1.

## Humano vs Computador
1. Selecione `Humano vs Computador`.
2. Teste as dificuldades `Facil`, `Intermediario` e `Avancado`.
3. Faca um movimento como Jogador A.
4. Resultado esperado: o Jogador B responde automaticamente e o turno volta para A.

## Vitoria
1. Continue movendo as pecas de um jogador ate todas alcancarem a linha-base adversaria.
2. Resultado esperado: o modal de vitoria aparece, o timer para e o botao `Reiniciar` inicia uma nova partida.
