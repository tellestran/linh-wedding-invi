import { receiveGuest } from '../worker/index.js';

export function GET(request) {
  return receiveGuest(request, process.env);
}
