# CrossGrid

Jogo web simples implementado com HTML/CSS/JS.

Como rodar:
1. Abra `index.html` em um navegador moderno.

Como rodar localmente com Node:
1. Execute `npm start`.
2. Abra `http://localhost:3000`.

Deploy no Railway:
1. Envie este repositorio para o GitHub.
2. No Railway, crie um novo projeto usando o repositorio `FilipeLussana/CrossGrid`.
3. O Railway detecta o `package.json` e executa `npm start`.
4. O servidor usa automaticamente a variavel `PORT` definida pelo Railway.

Recursos:
- Dois modos: Humano vs Humano e Humano vs Computador.
- Três níveis de dificuldade: Fácil, Intermediário, Avançado.
- Espaço reservado para propaganda em `index.html` (div `#ad`).

Para integrar anúncios reais (ex: Google AdSense):
1. Crie conta no provedor e copie o snippet recomendado.
2. Cole o snippet no `index.html` dentro do `div#ad` ou no `head` conforme instruções do provedor.
