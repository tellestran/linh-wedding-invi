function doGet() {
  return output_({ ok: true, service: 'wedding-sheet', version: 1 });
}

function doPost(e) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const secret = properties.getProperty('GUEST_LOOKUP_SECRET');
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    if (!secret || !spreadsheetId) return output_({ ok: false, error: 'not_configured' });
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 16000) return output_({ ok: false, error: 'invalid_request' });
    let body;
    try { body = JSON.parse(raw); }
    catch (_) { return output_({ ok: false, error: 'invalid_json' }); }
    if (!body || Array.isArray(body) || body.secret !== secret) {
      return output_({ ok: false, error: 'unauthorized' });
    }
    if (!['guest', 'rsvp'].includes(body.action)) return output_({ ok: false, error: 'invalid_action' });
    const guestId = String(body.guest_id || '').trim();
    if (!/^[1-9][0-9]{0,8}$/.test(guestId)) return output_({ ok: false, error: 'invalid_guest_id' });
    const book = SpreadsheetApp.openById(spreadsheetId);
    const guestSheet = sheet_(book, 'KhachMoi', ['id', 'Tên']);
    const matches = rows_(guestSheet, 2).filter(row => row[0].trim() === guestId);
    if (matches.length !== 1 || !matches[0][1].trim()) {
      return output_({ ok: false, error: matches.length > 1 ? 'duplicate_guest_id' : 'guest_not_found' });
    }
    const invitedName = matches[0][1].trim();
    if (body.action === 'guest') return output_({ ok: true, name: invitedName });

    const id = typeof body.id === 'string' ? body.id : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
        || !name || name.length > 60 || note.length > 2000
        || !['both', 'party', 'ceremony', 'no'].includes(body.attendance)
        || !Number.isInteger(body.guests)
        || (body.attendance === 'no' ? body.guests !== 0 : body.guests < 1 || body.guests > 5)) {
      return output_({ ok: false, error: 'invalid_rsvp' });
    }
    const responses = sheet_(book, 'PhanHoi', ['guest_id', 'name', 'attendance', 'guests', 'updated_at', 'submission_id']);
    const wishes = sheet_(book, 'LoiChuc', ['wish_id', 'guest_id', 'name', 'wish', 'created_at']);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(3000)) return output_({ ok: false, error: 'busy_retry' });
    try {
      const existing = rows_(responses, 6);
      const matchingRows = existing.map((row, index) => ({ row, index })).filter(item => item.row[0].trim() === guestId);
      if (matchingRows.length > 1) return output_({ ok: false, error: 'duplicate_response' });
      const previous = matchingRows[0];
      const reusedId = existing.find(row => row[5] === id && row[0].trim() !== guestId);
      if (reusedId) return output_({ ok: false, error: 'submission_conflict' });
      if (previous && previous.row[5] === id) return output_({ ok: true, duplicate: true });
      const timestamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
      const wish = rows_(wishes, 5).find(row => row[0] === id);
      if (wish && wish[1].trim() !== guestId) return output_({ ok: false, error: 'submission_conflict' });
      if (note && !wish) {
        wishes.getRange(wishes.getLastRow() + 1, 1, 1, 5).setValues([
          [id, Number(guestId), literal_(name), literal_(note), timestamp]
        ]);
        SpreadsheetApp.flush();
      }
      responses.getRange(previous ? previous.index + 2 : responses.getLastRow() + 1, 1, 1, 6).setValues([
        [Number(guestId), literal_(name), body.attendance, body.guests, timestamp, id]
      ]);
      SpreadsheetApp.flush();
      return output_({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (_) {
    return output_({ ok: false, error: 'sheet_unavailable' });
  }
}

function sheet_(book, name, headers) {
  const sheet = book.getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet');
  const actual = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  if (headers.some((header, index) => actual[index] !== header)) throw new Error('Unexpected headers');
  return sheet;
}

function rows_(sheet, width) {
  const count = sheet.getLastRow() - 1;
  return count > 0 ? sheet.getRange(2, 1, count, width).getDisplayValues() : [];
}

function literal_(value) {
  return /^[=+\-@']/.test(value) ? "'" + value : value;
}

function output_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function checkSetup() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('GUEST_LOOKUP_SECRET')) throw new Error('Set GUEST_LOOKUP_SECRET first');
  const book = SpreadsheetApp.openById(properties.getProperty('SPREADSHEET_ID'));
  sheet_(book, 'KhachMoi', ['id', 'Tên']);
  sheet_(book, 'PhanHoi', ['guest_id', 'name', 'attendance', 'guests', 'updated_at', 'submission_id']);
  sheet_(book, 'LoiChuc', ['wish_id', 'guest_id', 'name', 'wish', 'created_at']);
  console.log('Setup verified. No response or wish was written.');
}
