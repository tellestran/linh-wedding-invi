import { receiveRsvp } from '../worker/index.js';

export function POST(request) {
  return receiveRsvp(request, { ...process.env, RSVP_STORAGE: 'sheets' });
}
