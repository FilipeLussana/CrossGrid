Context:
- Repo root: c:/Users/FL-Test-PC/Documents/VS_CODE/CrossGrid
- AI currently in `app.js` uses A* with basic heuristics and simple tie-breaking.

Task:
Improve the AI behavior for `CrossGrid` across difficulties:
- Easy: make AI choose random valid moves but prefer forward progress (towards target row).
- Medium: use A* but add simple threat avoidance (prefer moves that don't allow immediate capture by opponent next turn).
- Hard: implement lookahead of 2 plies (AI move + opponent best reply) using heuristic combining distance to goal and piece safety; prefer captures when available.

Implementation expectations:
- Add helper functions: `simulateMove(pieceId, nodeId)`, `evaluateBoard(state)` and a simple minimax-like selection limited to depth 2 for `hard`.
- Keep performance reasonable; reuse existing `aStar` function where useful.
- Document key heuristics as comments.

Deliverables:
- Suggested code edits for `app.js` implementing above.
- Brief explanation of heuristics and trade-offs.
