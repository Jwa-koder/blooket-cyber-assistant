# Project context

Inherits the workspace's `../../AGENTS.md` when present.

- Standalone Chrome MV3 extension for `https://cyber.blooket.com/*` only.
- All distributed implementation was authored for this project. No third-party panel source, legacy menus, or source archives are included.
- MIT licensed, copyright Jwa-koder. Do not add personal account details, saved game IDs, or screenshots from private sessions.
- Supported controls: learned-answer highlighting, learned Auto Answer, question-feedback continuation, first-output selection, answer keys 1–4, and O toggle.
- Unknown/image questions wait for manual input. Reward results need a manual click. Never describe these features as revealing hidden answers or forcing rewards.
- Learned answers stay in page memory and are cleared when closed. No analytics, external updates, or background network calls.
- `node --test` validates extension scope, injection, toggle cleanup, and package source constraints. `python3 scripts/package.py` creates the unpacked folder and ZIP under ignored `dist/`.
- Browser fixture: `python3 -m http.server 8765 --bind 127.0.0.1`, then `/tests/fixture/play/`.
- Previous version's core automation was tested in a private live game; complete-cycle, cleanup, and visual checks also used the local DOM fixture. Changes to game selectors or activation events need a fresh live test.
