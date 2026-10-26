const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const extension = path.join(__dirname, '../extension');
const read = name => fs.readFileSync(path.join(extension, name), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

test('manifest and scripts use only the intended host and local files', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, ['https://cyber.blooket.com/*']);
  assert.deepEqual(manifest.content_scripts[0].matches, manifest.host_permissions);
  assert.deepEqual(manifest.permissions.sort(), ['scripting', 'storage']);
  for (const name of fs.readdirSync(extension).filter(name => name.endsWith('.js'))) {
    new vm.Script(read(name), { filename: name });
    assert.doesNotMatch(read(name), /https?:\/\/(?!cyber\.blooket\.com)/, 'no external services');
  }
});

test('injection rejects other hosts, subframes, missing tabs and disabled state', async () => {
  let listener, enabled = true;
  const executions = [];
  const chrome = {
    runtime: { onMessage: { addListener: value => { listener = value; } } },
    storage: { local: { get: async () => ({ enabled }) } },
    scripting: { executeScript: async options => { executions.push(options); } }
  };
  vm.runInNewContext(read('background.js'), { chrome, URL, Error });
  const ask = sender => new Promise(resolve => listener({ type: 'cyber-assistant:open' }, sender, resolve));
  const sender = { tab: { id: 42 }, frameId: 0, url: 'https://cyber.blooket.com/room/play/player' };
  assert.equal((await ask(sender)).injected, true);
  assert.equal(executions[0].files.join(','), 'assistant.js');
  assert.equal(executions[0].world, 'MAIN');
  for (const invalid of [
    { ...sender, url: 'https://play.blooket.com/' },
    { ...sender, url: 'https://cyber.blooket.com.example.org/' },
    { ...sender, url: 'http://cyber.blooket.com/' },
    { ...sender, frameId: 1 },
    { ...sender, tab: undefined }
  ]) assert.match((await ask(invalid)).error, /limited to/);
  enabled = false;
  assert.equal((await ask(sender)).injected, false);
  assert.equal(executions.length, 1);
});

function controller({ delayed = false, iframe = false } = {}) {
  const handlers = {}, storageListeners = [], callbacks = [];
  const counts = { opens: 0, closes: 0, reloads: 0 };
  let enabled = true;
  const window = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    dispatchEvent: event => { if (event.type === 'cyber-assistant:close') counts.closes++; },
    location: { reload: () => { counts.reloads++; } }
  };
  window.top = iframe ? {} : window;
  const chrome = {
    runtime: { sendMessage: (_message, callback) => {
      counts.opens++;
      if (delayed) callbacks.push(callback); else callback({ injected: true });
    } },
    storage: {
      local: {
        get: async () => ({ enabled }),
        set: async update => {
          const oldValue = enabled; enabled = update.enabled;
          storageListeners.forEach(fn => fn({ enabled: { oldValue, newValue: enabled } }, 'local'));
        }
      },
      onChanged: { addListener: fn => storageListeners.push(fn) }
    }
  };
  class Element {
    constructor(editable = false) { this.isContentEditable = editable; }
    closest() { return this.input ? this : null; }
  }
  const context = { chrome, window, Element, Event, console };
  vm.runInNewContext(read('controller.js'), context);
  const key = overrides => ({ key: 'o', repeat: false, ctrlKey: false, altKey: false,
    metaKey: false, target: null, preventDefault() {}, stopImmediatePropagation() {}, ...overrides });
  return { handlers, chrome, counts, callbacks, Element, key, getEnabled: () => enabled, context };
}

test('O stops and reopens the assistant without reloading a game', async () => {
  const c = controller(); await flush();
  assert.equal(c.counts.opens, 1);
  await c.handlers.keydown(c.key());
  assert.equal(c.getEnabled(), false);
  assert.equal(c.counts.closes, 1);
  await c.handlers.keydown(c.key({ key: 'O' }));
  assert.equal(c.getEnabled(), true);
  assert.equal(c.counts.opens, 2);
  assert.equal(c.counts.reloads, 0);
  vm.runInNewContext(read('controller.js'), c.context);
  assert.equal(c.counts.opens, 2, 'duplicate controllers do not reinject');
});

test('typing, shadow inputs, key repeats and modifier shortcuts do not toggle', async () => {
  const c = controller(); await flush();
  const input = new c.Element(); input.input = true;
  for (const event of [
    c.key({ target: new c.Element(true) }), c.key({ target: input }),
    c.key({ composedPath: () => [input], target: new c.Element() }),
    c.key({ repeat: true }), c.key({ ctrlKey: true }), c.key({ metaKey: true }), c.key({ altKey: true })
  ]) await c.handlers.keydown(event);
  assert.equal(c.getEnabled(), true);
  assert.equal(c.counts.opens, 1);
});

test('an in-flight injection is closed if O was pressed before it completed', async () => {
  const c = controller({ delayed: true }); await flush();
  await c.handlers.keydown(c.key());
  const closed = c.counts.closes;
  c.callbacks[0]({ injected: true });
  assert.equal(c.counts.closes, closed + 1);
  assert.equal(c.getEnabled(), false);
});

test('subframes do not install a controller', async () => {
  const c = controller({ iframe: true }); await flush();
  assert.equal(c.counts.opens, 0);
  assert.equal(c.handlers.keydown, undefined);
});
