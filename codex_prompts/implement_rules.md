Context:
- Repo root: c:/Users/FL-Test-PC/Documents/VS_CODE/CrossGrid
- Main game file: `app.js`
- UI: `index.html`, `style.css`

Task:
Implement and formalize game rules for `CrossGrid` according to the specification below. Update `app.js` and add any small helper functions or UI hooks required. Keep changes minimal and focused.

Rules to implement:
1. Capture (Hard difficulty): when a player moves onto an intersection occupied by an opponent, remove the opponent piece from the board. Provide a visual effect (temporary CSS class `captured`) and update move counts.
2. Block (Medium difficulty): when a piece moves off a node, that node becomes blocked for the opponent for exactly 2 turns. Blocked nodes should be visually indicated with class `blocked` on the intersection element. Blocks do not apply to the piece owner.
3. Occupation rules: pieces cannot stack. Moving into an occupied node is only allowed in `hard` difficulty (capture). In `easy`, movement simply disallows moves into occupied nodes.
4. Edge cases: ensure blocked nodes are decremented at the start of every player's turn and removed when turns expire. Prevent moves into blocked nodes when blocked against the mover.

Implementation details and constraints:
- Modify only `app.js` and `style.css` (add `.blocked` and `.captured` styles). Keep code style consistent with existing file.
- Add short comments for new functions. Do not refactor unrelated code.
- Ensure `renderPieces()` updates DOM to reflect captures and blocking visuals.
- Use minimal DOM APIs (existing code uses SVG elements and classes).

Deliverables expected from Codex:
- Patch suggestions for `app.js` and `style.css` implementing the above rules.
- Short explanation of changes and where they were made.
