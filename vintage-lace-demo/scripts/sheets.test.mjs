import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { receiveGuest, receiveRsvp } from '../worker/index.js';
import { GET } from '../api/guest.js';
import { POST } from '../api/rsvp.js';
const env = { GUEST_LOOKUP_URL: 'https://script.google.com/macros/s/test/exec', GUEST_LOOKUP_SECRET: 'test-only-secret', RSVP_STORAGE: 'sheets' };
function script() {
  const tabs = {
    KhachMoi: [['id', 'Tên'], ['1', 'Anh Nam'], ['2', 'Chị Mai']],
    PhanHoi: [['guest_id', 'name', 'attendance', 'guests', 'updated_at', 'submission_id']],
    LoiChuc: [['wish_id', 'guest_id', 'name', 'wish', 'created_at']]
  };
  const sheet = name => ({
    getLastRow: () => tabs[name].length,
    getRange(row, col, height, width) { return {
      getDisplayValues: () => Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => String(tabs[name][row - 1 + y]?.[col - 1 + x] ?? ''))),
      setValues(values) { values.forEach((values, y) => { tabs[name][row - 1 + y] ??= []; values.forEach((value, x) => { tabs[name][row - 1 + y][col - 1 + x] = value; }); }); }
    }; }
  });
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => key === 'SPREADSHEET_ID' ? 'test-sheet' : env.GUEST_LOOKUP_SECRET }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: name => tabs[name] ? sheet(name) : null }), flush() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: { formatDate: () => '2026-11-06 12:00:00' },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: text => ({ setMimeType: () => text }) }
  });
  vm.runInContext(readFileSync(new URL('../integrations/google-apps-script/Code.gs', import.meta.url), 'utf8'), context);
  return { tabs, post: body => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(body) } })) };
}
const body = overrides => ({ id: crypto.randomUUID(), guest_id: '1', name: 'Tên từ trình duyệt', attendance: 'both', guests: 2, note: '=Một lời chúc', ...overrides });
const request = value => new Request('https://wedding.example/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://wedding.example' }, body: JSON.stringify(value) });
function connect(t, app) { t.mock.method(globalThis, 'fetch', async (_url, options) => Response.json(app.post(JSON.parse(options.body)))); }

test('lookup returns only one name; malformed and unknown IDs fail', async t => {
  connect(t, script());
  const response = await receiveGuest(new Request('https://wedding.example/api/guest?id=1'), env);
  assert.deepEqual(await response.json(), { name: 'Anh Nam' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  for (const query of ['', '?id=0', '?id=1&id=2', '?id=abc']) assert.equal((await receiveGuest(new Request('https://wedding.example/api/guest' + query), env)).status, 400);
  assert.equal((await receiveGuest(new Request('https://wedding.example/api/guest?id=99'), env)).status, 404);
});
test('RSVP writes both tabs with canonical name, deduplicates retries and updates attendance', async t => {
  const app = script(); connect(t, app);
  const value = body();
  for (let i = 0; i < 2; i++) assert.deepEqual(await (await receiveRsvp(request(value), env)).json(), { ok: true });
  assert.equal(app.tabs.PhanHoi.length, 2);
  assert.equal(app.tabs.LoiChuc.length, 2);
  assert.equal(app.tabs.PhanHoi[1][1], 'Anh Nam');
  assert.equal(app.tabs.LoiChuc[1][3], "'=Một lời chúc");
  assert.equal((await receiveRsvp(request(body({ attendance: 'no', guests: 0, note: '' })), env)).status, 200);
  assert.equal(app.tabs.PhanHoi.length, 2);
  assert.equal(app.tabs.PhanHoi[1][2], 'no');
});
test('legacy links can send; invalid and unknown IDs cannot write', async t => {
  const app = script(); connect(t, app);
  const value = body({ guest_id: undefined, name: 'Khách từ link cũ' });
  for (let i = 0; i < 2; i++) assert.equal((await receiveRsvp(request(value), env)).status, 200);
  assert.equal(app.tabs.PhanHoi.length, 2);
  assert.equal(app.tabs.PhanHoi[1][0], '');
  for (const guest_id of ['', 'x', 1, '99']) assert.equal((await receiveRsvp(request(body({ guest_id })), env)).status, 400);
  assert.equal(app.tabs.PhanHoi.length, 2);
});
test('missing settings and Google failures never report success or expose secret', async t => {
  assert.equal((await receiveRsvp(request(body()), { RSVP_STORAGE: 'sheets' })).status, 503);
  for (const value of [{ ok: false, error: 'unauthorized' }, { ok: false, error: 'sheet_unavailable' }, {}, '<html>login</html>']) {
    t.mock.method(globalThis, 'fetch', async () => typeof value === 'string' ? new Response(value) : Response.json(value));
    const response = await receiveRsvp(request(body()), env);
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes(env.GUEST_LOOKUP_SECRET), false);
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
  assert.equal((await receiveRsvp(request(body()), env)).status, 503);
});
test('Apps Script rejects wrong secret and recovers a partially written submission', () => {
  const app = script(), value = body();
  assert.equal(app.post({ ...value, action: 'rsvp', secret: 'wrong' }).error, 'unauthorized');
  app.tabs.LoiChuc.push([value.id, 1, 'Anh Nam', 'Đã lưu', 'timestamp']);
  assert.equal(app.post({ ...value, action: 'rsvp', secret: env.GUEST_LOOKUP_SECRET }).ok, true);
  assert.equal(app.tabs.LoiChuc.length, 2);
  assert.equal(app.tabs.PhanHoi.length, 2);
});
test('Vercel entrypoints read server env and send to Sheets', async t => {
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  connect(t, script());
  assert.deepEqual(await (await GET(new Request('https://wedding.example/api/guest?id=2'))).json(), { name: 'Chị Mai' });
  assert.deepEqual(await (await POST(request(body()))).json(), { ok: true });
});
