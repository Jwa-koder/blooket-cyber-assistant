# Blooket Cyber Assistant

A small Chrome extension for Blooket's current Cyber Hack interface. It learns from answer feedback that the game displays, then helps with repeated questions. It runs only on `https://cyber.blooket.com/`.

## Features

- Highlight answers that have already been confirmed in visible feedback.
- Automatically select a learned answer when the same text question and answer choices repeat.
- Continue past question-answer feedback automatically.
- Select the first available output automatically. The game determines the reward.
- Use number keys **1–4** to answer by the displayed order.
- Press **O** to stop or start the assistant across Cyber Hack tabs without reloading the game. O is ignored while typing and when combined with modifier keys.

All automation options start off. The assistant opens automatically on player pages and starts collapsed on host pages. Closing it stops its timer and shortcuts, removes its highlighting, and clears learned answers.

Unknown questions wait for a manual answer. Learning requires visible correctness feedback. Image questions and blank answers are skipped. Reward-result screens still require a manual click to continue. Learned answers stay in memory for the current page session and are cleared on close or reload. The extension cannot predict hidden rewards or guarantee future compatibility with Blooket updates.

## Install in Chrome

1. Download the ZIP from [Releases](https://github.com/Jwa-koder/blooket-cyber-assistant/releases) and extract it.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the extracted `blooket-cyber-assistant` folder containing `manifest.json`.
4. Open a Cyber Hack game. The compact panel appears automatically.

When installing from a source checkout, select the `extension` folder instead. The source is plain JavaScript; no dependencies or build step are required to load it. To update an installed copy, replace its files, click **Reload** in Chrome's extension manager, and refresh the Cyber Hack page.

## Privacy and permissions

There are no analytics, remote executable updates, or extension network requests. Only the enabled/disabled preference is saved in Chrome's local extension storage. Learned answers are not sent anywhere or written to storage. Automated selections use the same visible controls as manual gameplay and cause the game to submit those normal selections to Blooket.

The extension requests `storage` for the O/popup preference and `scripting` to open its local panel. Host access is restricted to `https://cyber.blooket.com/*`.

## Development and verification

Requires Node.js 22+ and Python 3.9+ for tests and packaging:

```sh
node --test
python3 scripts/package.py
```

The package command writes an unpacked extension folder and versioned ZIP under `dist/`. GitHub Actions runs the tests and packages the extension for pull requests and `main`.

For the interactive regression fixture:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/tests/fixture/play/`. The fixture reproduces visible question, correctness, and output controls. It supports checking unknown-question waiting, learned answering, continued feedback, output selection, highlighting, shortcuts, and cleanup. It uses synthetic test questions and contains no account data or saved game sessions.

The core adapter was also tested in a private live Cyber Hack game on October 25, 2026: it learned a manually answered question, answered a repeated question automatically, continued answer feedback, selected outputs, and submitted a number-key answer. The host recorded 20 credits from normal game rewards. The standalone package removes the former menu and narrows the extension to this adapter; automated browser tests and live testing have different scopes.

## License

[MIT](LICENSE), copyright 2026 Jwa-koder. This independent project is not affiliated with Blooket.
