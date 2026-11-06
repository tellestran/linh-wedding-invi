import { receiveGuest } from '../worker/index.js';

export default {
  fetch(request) {
    return receiveGuest(request, {
      GUEST_LOOKUP_URL: process.env.GUEST_LOOKUP_URL,
      GUEST_LOOKUP_SECRET: process.env.GUEST_LOOKUP_SECRET
    });
  }
};
