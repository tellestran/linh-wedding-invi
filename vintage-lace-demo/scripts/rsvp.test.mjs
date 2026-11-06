import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0000_wedding_rsvps.sql', import.meta.url), 'utf8'));
  return { sqlite, DB: { prepare(sql) { return { bind(...args) { return { async run() { return sqlite.prepare(sql).run(...args); } }; } }; } } };
}
function submission(overrides = {}) {
  return { id:crypto.randomUUID(), name:'Khách kiểm thử', attendance:'both', guests:2, note:'Chúc hai bạn hạnh phúc!', ...overrides };
}
function request(body, overrides = {}) {
  return new Request('https://wedding.example/api/rsvp', { method:'POST', headers:{ 'Content-Type':'application/json', Origin:'https://wedding.example' }, body:JSON.stringify(body), ...overrides });
}

test('a successful send persists the response on the server and retries do not duplicate it', async () => {
  const { sqlite, DB } = database();
  try {
    const body = submission({name:"  Nguyễn O'Nam  "});
    for (let i=0;i<2;i++) {
      const result = await worker.fetch(request(body), { DB });
      assert.equal(result.status, 200);
      assert.deepEqual(await result.json(), {ok:true});
    }
    const rows = sqlite.prepare('SELECT * FROM rsvps').all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name,"Nguyễn O'Nam");
    assert.equal(rows[0].guests,2);
    assert.equal(rows[0].note,body.note);
  } finally { sqlite.close(); }
});
test('declined invitations are received with zero guests', async () => {
  const { sqlite, DB } = database();
  try {
    const result = await worker.fetch(request(submission({attendance:'no',guests:0})),{DB});
    assert.equal(result.status,200);
    assert.equal(sqlite.prepare('SELECT guests FROM rsvps').get().guests,0);
  } finally { sqlite.close(); }
});
test('invalid submissions never enter the database', async () => {
  const { sqlite, DB } = database();
  try {
    for (const changes of [{name:' '},{name:'a'.repeat(61)},{attendance:'invalid'},{guests:0},{guests:6},{guests:1.5},{attendance:'no',guests:2},{note:'x'.repeat(2001)},{id:'bad-id'}]) {
      assert.equal((await worker.fetch(request(submission(changes)),{DB})).status,400);
    }
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM rsvps').get().count,0);
  } finally { sqlite.close(); }
});
test('cross-origin requests and unsupported content types are rejected', async () => {
  assert.equal((await worker.fetch(request(submission(),{headers:{Origin:'https://other.example','Content-Type':'application/json'}}),{})).status,403);
  assert.equal((await worker.fetch(request(submission(),{headers:{'Content-Type':'text/plain'}}),{})).status,415);
});
test('storage failures never return success', async () => {
  assert.equal((await worker.fetch(request(submission()),{})).status,503);
  const DB = { prepare(){throw new Error('Database unavailable');} };
  assert.equal((await worker.fetch(request(submission()),{DB})).status,503);
});
test('guest responses cannot be listed by public visitors', async () => {
  assert.equal((await worker.fetch(new Request('https://wedding.example/api/rsvp'),{})).status,405);
  assert.equal((await worker.fetch(new Request('https://wedding.example/api/rsvps'),{})).status,404);
});
