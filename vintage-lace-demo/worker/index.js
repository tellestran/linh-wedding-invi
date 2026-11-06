const assets = /* SITE_ASSETS */ {};

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function callSheet(payload, env) {
  const endpoint = new URL(env.GUEST_LOOKUP_URL);
  if (endpoint.protocol !== 'https:' || endpoint.hostname !== 'script.google.com'
      || !/^\/macros\/s\/[^/]+\/exec$/.test(endpoint.pathname)) throw new Error('Invalid endpoint');
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, secret: env.GUEST_LOOKUP_SECRET }),
    redirect: 'follow', signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('Upstream failed');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16000) { await reader.cancel(); throw new Error('Response too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function receiveGuest(request, env) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
  const ids = new URL(request.url).searchParams.getAll('id');
  const id = ids[0]?.trim();
  if (ids.length !== 1 || !/^[1-9][0-9]{0,8}$/.test(id || '')) return json({ error: 'invalid_id' }, 400);
  if (!env.GUEST_LOOKUP_URL || !env.GUEST_LOOKUP_SECRET) return json({ error: 'guest_lookup_unavailable' }, 503);
  try {
    const data = await callSheet({ action: 'guest', guest_id: id }, env);
    if (data?.ok === false && data.error === 'guest_not_found') return json({ error: 'guest_not_found' }, 404);
    if (data?.ok !== true || typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 60) {
      throw new Error('Invalid upstream response');
    }
    return json({ name: data.name.trim() });
  } catch { return json({ error: 'guest_lookup_unavailable' }, 503); }
}

export async function receiveRsvp(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Vui lòng gửi dữ liệu JSON.' }, 415);
  if (Number(request.headers.get('Content-Length')) > 16000) return json({ error: 'Nội dung quá dài.' }, 413);
  let body;
  try {
    const text = await request.text();
    if (text.length > 16000) return json({ error: 'Nội dung quá dài.' }, 413);
    body = JSON.parse(text);
  } catch { return json({ error: 'Nội dung không hợp lệ.' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Nội dung không hợp lệ.' }, 400);
  const { id, attendance, guests } = body;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim() : null;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      || !name || name.length > 60 || note === null || note.length > 2000
      || !['both', 'party', 'ceremony', 'no'].includes(attendance)
      || !Number.isInteger(guests) || (attendance === 'no' ? guests !== 0 : guests < 1 || guests > 5)) {
    return json({ error: 'Vui lòng kiểm tra tên và thông tin tham dự.' }, 400);
  }
  if (env.RSVP_STORAGE === 'sheets' || env.GUEST_LOOKUP_URL || env.GUEST_LOOKUP_SECRET) {
    const guestId = body.guest_id;
    if (guestId !== undefined && (typeof guestId !== 'string' || !/^[1-9][0-9]{0,8}$/.test(guestId))) {
      return json({ error: 'Mã khách mời không hợp lệ.' }, 400);
    }
    if (!env.GUEST_LOOKUP_URL || !env.GUEST_LOOKUP_SECRET) {
      return json({ error: 'Chưa thể nhận xác nhận. Vui lòng thử lại sau.' }, 503);
    }
    try {
      const result = await callSheet({ action: 'rsvp', id, guest_id: guestId, name, attendance, guests, note }, env);
      if (result?.ok !== true) {
        if (['guest_not_found', 'invalid_guest_id'].includes(result?.error)) {
          return json({ error: 'Không tìm thấy khách mời. Vui lòng kiểm tra đường dẫn thiệp.' }, 400);
        }
        throw new Error('Sheet did not confirm the write');
      }
      return json({ ok: true });
    } catch {
      return json({ error: 'Chưa nhận được xác nhận. Vui lòng thử gửi lại.' }, 503);
    }
  }
  if (!env.DB) return json({ error: 'Chưa thể nhận xác nhận. Vui lòng thử lại sau.' }, 503);
  try {
    await env.DB.prepare('INSERT INTO rsvps (id, name, attendance, guests, note, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
      .bind(id, name, attendance, guests, note, new Date().toISOString()).run();
    return json({ ok: true });
  } catch {
    return json({ error: 'Chưa nhận được xác nhận. Vui lòng thử lại.' }, 503);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/guest') return receiveGuest(request, env);
    if (url.pathname === '/api/rsvp') return receiveRsvp(request, env);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const asset = assets[path];
    if (!asset) return new Response('Not found', { status: 404 });
    const bytes = Uint8Array.from(atob(asset.data), char => char.charCodeAt(0));
    return new Response(request.method === 'HEAD' ? null : bytes, {
      headers: {
        'Content-Type': asset.type,
        'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=3600' : 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
};
