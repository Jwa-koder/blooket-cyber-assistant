(() => {
  'use strict';
  if (document.querySelector('[data-cyber-assistant]')) return;
  const player = /\/play\//.test(location.pathname);
  const host = document.createElement('div');
  host.dataset.cyberAssistant = 'true';
  host.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647';
  if (!player) { host.style.right = 'auto'; host.style.left = '12px'; }
  const root = host.attachShadow({ mode: 'open' });
  // Keep the game's "click anywhere" listeners from consuming panel input.
  for (const event of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick']) {
    root.addEventListener(event, value => value.stopPropagation());
  }
  root.innerHTML = `<style>
    :host{all:initial;font:14px/1.45 system-ui,sans-serif;color:#f5f2ff}
    section{width:300px;max-width:calc(100vw - 24px);background:#20152f;border:1px solid #9e78c9;border-radius:12px;box-shadow:0 5px 24px #0005;overflow:hidden}
    header{display:flex;gap:8px;align-items:center;padding:10px 12px;background:#452a62}
    strong{flex:1;font-size:15px}button{font:inherit;cursor:pointer;border:1px solid #b99ad9;border-radius:6px;background:#48305f;color:#fff;padding:5px 8px}
    button:focus-visible,input:focus-visible{outline:3px solid #d7b9ff;outline-offset:3px}
    main{padding:12px}label{display:flex;align-items:flex-start;gap:8px;margin:10px 0;cursor:pointer}input{accent-color:#b58be4;margin-top:4px}
    p{margin:6px 0 12px;color:#d4c6e3}small{font-size:12px;color:#d4c6e3}output{display:block;padding:9px;background:#130b20;border-radius:7px;margin-bottom:10px}
    [hidden]{display:none!important}
  </style><section aria-label="Cyber Hack assistant"><header><strong>Cyber Hack · 2.0.0</strong><button id="minimize" aria-label="Collapse assistant" aria-expanded="true">−</button><button id="close" aria-label="Close assistant">×</button></header><main>
    <output id="status" aria-live="polite">Waiting for a question.</output>
    <p>Learn answers from the game's visible feedback. Unknown questions wait for you to answer.</p>
    <label><input type="checkbox" id="highlight">Highlight learned answers</label>
    <label><input type="checkbox" id="answer">Auto Answer (learned answers only)</label>
    <label><input type="checkbox" id="continue">Auto Continue after feedback</label>
    <label><input type="checkbox" id="output">Auto Pick Output (first available)</label>
    <label><input type="checkbox" id="keys">Answer keys 1–4</label>
    <small id="learned">0 questions learned this page session. O turns the assistant off or on without reloading.</small>
  </main></section>`;
  document.body.append(host);
  const main = root.querySelector('main');
  const status = root.getElementById('status');
  const learned = root.getElementById('learned');
  const options = Object.fromEntries(['highlight', 'answer', 'continue', 'output', 'keys'].map(id => [id, root.getElementById(id)]));
  const bank = new Map();
  let closed = false;
  let timer;
  let lastAction = 0;
  const marked = new Map();
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const visible = element => element.isConnected && element.getClientRects().length > 0;
  const text = element => normalize(element.innerText || '');
  const setStatus = value => { if (status.textContent !== value) status.textContent = value; };
  function clearMarks() {
    for (const [element, previous] of marked) {
      if (element.style.outline === 'rgb(215, 185, 255) solid 4px') element.style.outline = previous.outline;
      if (element.style.outlineOffset === '-5px') element.style.outlineOffset = previous.offset;
    }
    marked.clear();
  }
  function question() {
    const title = [...document.querySelectorAll('[class*="_questionText_"]')].find(visible);
    const answers = [...document.querySelectorAll('button[class*="_answerButton_"]')].filter(visible);
    if (!title || !answers.length || answers.some(answer => !text(answer))) return null;
    // Text-only questions. A blank/image answer never becomes a guessed answer.
    if (title.querySelector('img') || answers.some(answer => answer.querySelector('img'))) return null;
    const prompt = text(title);
    if (!prompt) return null;
    const key = JSON.stringify([prompt, answers.map(text).sort()]);
    return { key, answers };
  }
  function click(element) {
    if (Date.now() - lastAction < 800 || !visible(element) || element.disabled) return;
    lastAction = Date.now();
    // Current game screens may listen to pointer/mouse presses rather than
    // the click event alone. Stop if a press removes or
    // disables the control so one activation cannot submit two answers.
    const bounds = element.getBoundingClientRect();
    const init = { bubbles: true, cancelable: true, composed: true, button: 0,
      clientX: bounds.x + bounds.width / 2, clientY: bounds.y + bounds.height / 2 };
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
      if (!visible(element) || element.disabled) return;
      const event = type.startsWith('pointer')
        ? new PointerEvent(type, { ...init, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: type.endsWith('down') ? 1 : 0 })
        : new MouseEvent(type, { ...init, buttons: type.endsWith('down') ? 1 : 0 });
      element.dispatchEvent(event);
    }
    if (visible(element) && !element.disabled) element.click();
  }
  function tick() {
    if (closed || !player) return;
    clearMarks();
    const current = question();
    if (current) {
      const feedback = current.answers.every(answer => answer.disabled);
      if (feedback) {
        const confirmed = current.answers.filter(answer => answer.querySelector('svg[data-icon="check"]')).map(text);
        if (confirmed.length) bank.set(current.key, new Set(confirmed));
        learned.textContent = `${bank.size} question${bank.size === 1 ? '' : 's'} learned this page session. O turns the assistant off or on without reloading.`;
        setStatus(confirmed.length ? 'Confirmed answers learned from feedback.' : 'Feedback shown; no confirmed answer found.');
        if (options.continue.checked) {
          const control = [...document.querySelectorAll('div,span,p')].find(element =>
            element.children.length === 0 && text(element) === 'Press Anywhere to Continue' && visible(element));
          if (control) click(control);
        }
        return;
      }
      const known = bank.get(current.key);
      const matches = known ? current.answers.filter(answer => known.has(text(answer))) : [];
      setStatus(matches.length ? 'Learned answer available.' : 'Unknown question — answer manually once to learn.');
      if (options.highlight.checked) for (const answer of matches) {
        const face = answer.querySelector('[class*="_answerFront_"]') || answer;
        marked.set(face, { outline: face.style.outline, offset: face.style.outlineOffset });
        face.style.outline = '4px solid rgb(215, 185, 255)';
        face.style.outlineOffset = '-5px';
      }
      if (options.answer.checked && matches.length) click(matches[0]);
      return;
    }
    const outputs = [...document.querySelectorAll('[role="button"][class*="_choice_"]')].filter(element => visible(element) && text(element) === '?');
    if (outputs.length === 3 && outputs.every(element =>
      text(element.parentElement).includes('Choose an Output') && !element.parentElement.querySelector('img'))) {
      setStatus('Output selection — rewards are determined by the game.');
      if (options.output.checked) click(outputs[0]);
    } else setStatus('Waiting for a supported text question or output selection.');
  }
  function keydown(event) {
    const target = event.composedPath()[0];
    if (!player || !options.keys.checked || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        (target instanceof Element && (target.isContentEditable || target.closest('input,textarea,select,[role="textbox"]')))) return;
    if (!/^[1-4]$/.test(event.key)) return;
    const current = question();
    const answer = current?.answers[Number(event.key) - 1];
    if (!answer || answer.disabled) return;
    event.preventDefault();
    click(answer);
  }
  function close() {
    if (closed) return;
    closed = true;
    clearInterval(timer);
    clearMarks();
    bank.clear();
    host.remove();
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('cyber-assistant:close', close);
  }
  root.getElementById('close').addEventListener('click', close);
  const minimize = root.getElementById('minimize');
  minimize.addEventListener('click', () => {
    main.hidden = !main.hidden;
    minimize.textContent = main.hidden ? '+' : '−';
    minimize.setAttribute('aria-expanded', String(!main.hidden));
    minimize.setAttribute('aria-label', main.hidden ? 'Expand assistant' : 'Collapse assistant');
  });
  window.addEventListener('keydown', keydown);
  window.addEventListener('cyber-assistant:close', close);
  if (player) timer = setInterval(() => {
    try { tick(); } catch (error) {
      Object.values(options).forEach(option => { option.checked = false; });
      clearInterval(timer);
      clearMarks();
      setStatus('The game interface changed. Automation stopped.');
      console.warn('Cyber Hack assistant stopped:', error);
    }
  }, 250);
  else {
    setStatus('Host tab. Open the player tab to use the assistant.');
    main.hidden = true;
    minimize.textContent = '+';
    minimize.setAttribute('aria-expanded', 'false');
    minimize.setAttribute('aria-label', 'Expand assistant');
  }
})();
