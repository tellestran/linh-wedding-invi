'use strict';

// THÔNG TIN CÓ THỂ CHỈNH SỬA — tên và thông tin hai gia đình ở index.html.
const WEDDING_DATE = '2026-11-29T09:00:00+07:00';
const RSVP_ENDPOINT = ''; // URL HTTPS nhận POST JSON. Để trống = bản xem thử.
const ADDRESS = '21 Hưng Thọ, Phường Quảng Phú, Thanh Hóa';
const PHOTO_PATH = './assets/couple.jpg';
const ALBUM_PHOTOS = ['', '', '', '', '']; // Điền đường dẫn ảnh cho 5 ô còn lại.
const GIFT_ACCOUNTS = [
  { name: 'Thùy Linh', bank: '', account: '', qr: '' },
  { name: 'Đức Tuấn', bank: '', account: '', qr: '' },
];

(() => {
  const root = document.documentElement;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);
  const cover = $('#cover');
  const main = $('#invitation');
  const seal = $('#open-invitation');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let opened = false;
  let coverObserver;
  let countdownTimer;

  function measureCover() {
    const w = cover.clientWidth, h = cover.clientHeight;
    const scale = Math.min(2, Math.max(1, w / 520));
    const angle = Math.atan2(.24 * h, .5 * w) * 180 / Math.PI;
    const length = Math.hypot(.5 * w, .24 * h) + 80 * scale;
    cover.style.setProperty('--lace-angle', `${angle}deg`);
    cover.style.setProperty('--lace-length', `${length}px`);
    cover.style.setProperty('--lace-height', `${76 * scale}px`);
    cover.querySelectorAll('[data-lace-height]').forEach(el => el.setAttribute('height', String(76 * scale)));
    $('#laceP').setAttribute('patternTransform', `scale(${scale})`);
  }
  const random = (index, key) => {
    const number = Math.sin(index * 12.9898 + key * 78.233) * 43758.5453;
    return number - Math.floor(number);
  };
  function makeParticles(container, kind, count) {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < count; index++) {
      const particle = document.createElement('span');
      particle.className = kind;
      if (kind === 'bdot') {
        const angle = index / count * Math.PI * 2;
        const radius = 90 + random(index, 11) * 90;
        particle.style.setProperty('--bx', `${Math.round(Math.cos(angle) * radius)}px`);
        particle.style.setProperty('--by', `${Math.round(Math.sin(angle) * radius)}px`);
        particle.style.setProperty('--delay', `${(random(index, 12) * .12).toFixed(2)}s`);
      } else {
        const petal = kind === 'petal';
        const size = petal ? 9 + Math.round(random(index, 1) * 11) : 2 + Math.round(random(index, 7) * 3);
        const duration = petal ? 12 + random(index, 3) * 10 : 6 + random(index, 8) * 6;
        particle.style.left = `${(random(index, petal ? 5 : 9) * 100).toFixed(1)}%`;
        particle.style.width = `${size}px`;
        particle.style.height = `${petal ? Math.round(size * 1.3) : size}px`;
        particle.style.setProperty('--duration', `${duration.toFixed(1)}s`);
        particle.style.setProperty('--delay', `-${(random(index, petal ? 4 : 10) * duration).toFixed(1)}s`);
        if (petal) particle.style.setProperty('--dx', `${Math.round((random(index, 2) - .5) * 200)}px`);
      }
      fragment.append(particle);
    }
    container.append(fragment);
  }


  function revealContent() {
    const native = window.CSS?.supports('animation-timeline', 'view()');
    if (native || reduced.matches || !('IntersectionObserver' in window)) return;
    root.classList.add('reveal-fallback');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .1 });
    $$('.rv,.rv-l,.rv-r,.rv-z').forEach(el => observer.observe(el));
  }
  function finishOpening() {
    window.removeEventListener('resize', measureCover);
    coverObserver?.disconnect();
    cover.remove();
    main.hidden = false;
    root.classList.remove('is-locked');
    root.classList.add('is-revealed');
    revealContent();
    if (!reduced.matches) makeParticles($('#petals-origin').parentElement, 'petal', 14);
    $('#couple-title').focus({ preventScroll: true });
  }
  seal.addEventListener('click', () => {
    if (opened) return;
    opened = true;
    seal.disabled = true;
    seal.setAttribute('aria-expanded', 'true');
    root.classList.add('is-opened');
    if (reduced.matches) finishOpening();
    else {
      makeParticles($('#burst-origin').parentElement, 'bdot', 16);
      setTimeout(finishOpening, 2800);
    }
  });

  const target = new Date(WEDDING_DATE).getTime();
  function tick() {
    const diff = Number.isFinite(target) ? Math.max(0, target - Date.now()) : 0;
    const values = { days: Math.floor(diff / 86400000), hours: Math.floor(diff / 3600000) % 24, minutes: Math.floor(diff / 60000) % 60, seconds: Math.floor(diff / 1000) % 60 };
    Object.entries(values).forEach(([key, n]) => {
      const el = $(`#${key}`), value = String(n).padStart(key === 'days' ? 3 : 2, '0');
      if (el.textContent === value) return;
      el.textContent = value;
      if (opened && !reduced.matches && !document.hidden) {
        el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip');
      }
    });
    if (!diff) clearInterval(countdownTimer);
  }
  tick();
  if (target > Date.now()) countdownTimer = setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('is-backgrounded', document.hidden);
    if (!document.hidden) tick();
  });

  const query = new URLSearchParams(window.location.search);
  const guest = Array.from((query.get('khach') || query.get('guest') || '').trim()).slice(0, 60).join('');
  if (guest) { $('#guest-name').textContent = guest; $('#guest-greeting').hidden = false; }
  $('#map-link').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;
  let statusTimer;
  function status(message) {
    clearTimeout(statusTimer);
    $('#copy-status').textContent = message;
    $('#copy-status').classList.add('show');
    statusTimer = setTimeout(() => $('#copy-status').classList.remove('show'), 2400);
  }
  const copyTimers = new Map();
  async function copyText(button, text, confirmation) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      const label = button.dataset.originalLabel || button.textContent;
      button.dataset.originalLabel = label;
      button.textContent = confirmation;
      clearTimeout(copyTimers.get(button));
      copyTimers.set(button, setTimeout(() => { button.textContent = label; copyTimers.delete(button); }, 2200));
    } catch { status('Không thể sao chép tự động. Bạn vui lòng chọn và sao chép nội dung.'); }
  }
  $('#copy-address').addEventListener('click', event => copyText(event.currentTarget, ADDRESS, 'Đã sao chép địa chỉ'));
  GIFT_ACCOUNTS.forEach((gift, i) => {
    $(`[data-gift-bank="${i}"]`).textContent = gift.bank || '[Tên ngân hàng]';
    $(`[data-gift-account="${i}"]`).textContent = gift.account || '[Số tài khoản]';
    const button = $(`[data-copy-gift="${i}"]`);
    button.disabled = !gift.account;
    button.title = gift.account ? 'Sao chép số tài khoản' : 'Số tài khoản sẽ được cập nhật';
    button.addEventListener('click', () => copyText(button, gift.account, 'Đã sao chép'));
    const qr = $(`[data-gift-qr="${i}"]`);
    if (gift.qr) {
      const image = document.createElement('img');
      image.src = gift.qr; image.alt = `Mã QR mừng cưới ${gift.name}`; image.loading = 'lazy';
      qr.replaceChildren(image); qr.removeAttribute('aria-hidden');
    } else {
      qr.setAttribute('aria-label', '[Mã QR — sẽ cập nhật]');
      const label = document.createElement('span'); label.className = 'qr-note'; label.textContent = '[Mã QR — sẽ cập nhật]';
      qr.append(label);
    }
  });

  $$('img[src="./assets/couple.jpg"],image[href="./assets/couple.jpg"]').forEach(image => image.setAttribute(image.tagName.toLowerCase() === 'image' ? 'href' : 'src', PHOTO_PATH));
  const slots = Array.from($$('#album .phbox'));
  ALBUM_PHOTOS.forEach((path, i) => {
    if (!path || !slots[i]) return;
    const button = document.createElement('button'); button.className = 'tile rv-z'; button.type = 'button'; button.dataset.openPhoto = path; button.setAttribute('aria-label', `Phóng to ảnh cưới ${i + 2}`);
    const image = document.createElement('img'); image.src = path; image.alt = `Ảnh cưới ${i + 2}`; image.loading = 'lazy'; button.append(image); slots[i].replaceWith(button);
  });
  const lightbox = $('#lightbox');
  let photoTrigger;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-open-photo]');
    if (!button) return;
    photoTrigger = button;
    lightbox.querySelector('img').src = button.dataset.openPhoto || PHOTO_PATH;
    lightbox.showModal(); root.classList.add('modal-open');
  });
  $('#close-lightbox').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('close', () => { root.classList.remove('modal-open'); photoTrigger?.focus({ preventScroll: true }); });

  const form = $('#rsvp-form');
  const nameInput = $('#f-name'), guestsInput = $('#f-guests'), noteInput = $('#f-note');
  let choice = 'both', submitting = false;
  const hasEndpoint = Boolean(RSVP_ENDPOINT.trim());
  $('#rsvp-preview-note').hidden = hasEndpoint;
  $('#success-preview-note').hidden = hasEndpoint;
  $$('[data-choice]').forEach(button => button.addEventListener('click', () => {
    choice = button.dataset.choice;
    $$('[data-choice]').forEach(pill => pill.setAttribute('aria-pressed', String(pill === button)));
    $('#guest-count-field').hidden = choice === 'no';
    guestsInput.disabled = choice === 'no';
  }));
  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    nameInput.setCustomValidity(nameInput.value.trim() ? '' : 'Vui lòng nhập họ và tên.');
    if (!form.reportValidity()) return;
    const payload = { name: nameInput.value.trim(), attendance: choice, guests: choice === 'no' ? 0 : Number(guestsInput.value), note: noteInput.value.trim() };
    const controls = Array.from(form.querySelectorAll('button,input,textarea,select'));
    const priorDisabled = controls.map(control => control.disabled);
    submitting = true;
    controls.forEach(control => { control.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    $('#rsvp-error').hidden = true;
    let timeout;
    try {
      if (hasEndpoint) {
        const controller = new AbortController(); timeout = setTimeout(() => controller.abort(), 12000);
        const response = await fetch(RSVP_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, credentials: 'omit', body: JSON.stringify(payload), signal: controller.signal });
        if (!response.ok) throw new Error('Request rejected');
      }
      $('#thanks-name').textContent = payload.name.split(/\s+/u).at(-1);
      $('#thanks-message').textContent = hasEndpoint
        ? (choice === 'no' ? 'Gia đình rất tiếc và cảm ơn bạn đã báo trước. Chúc bạn luôn bình an.' : 'Gia đình đã nhận được xác nhận của bạn. Rất mong được đón tiếp bạn.')
        : 'Cảm ơn bạn đã điền thông tin trong bản xem thử.';
      form.hidden = true; $('#rsvp-success').hidden = false;
      $('#rsvp-success').focus({ preventScroll: true });
    } catch (error) {
      $('#rsvp-error').textContent = error.name === 'AbortError' ? 'Kết nối quá lâu. Vui lòng thử lại.' : 'Chưa gửi được xác nhận. Vui lòng thử lại hoặc liên hệ gia đình.';
      $('#rsvp-error').hidden = false;
    } finally {
      clearTimeout(timeout); submitting = false;
      controls.forEach((control, i) => { control.disabled = priorDisabled[i]; });
      form.removeAttribute('aria-busy');
    }
  });
  $('#edit-rsvp').addEventListener('click', () => { form.hidden = false; $('#rsvp-success').hidden = true; nameInput.focus({ preventScroll: true }); });

  // Progressive enhancement: no JavaScript leaves the invitation visible.
  root.classList.add('has-js', 'is-locked');
  main.hidden = true;
  cover.hidden = false;
  seal.setAttribute('aria-controls', 'invitation');
  seal.setAttribute('aria-expanded', 'false');
  measureCover();
  window.addEventListener('resize', measureCover, { passive: true });
  if ('ResizeObserver' in window) { coverObserver = new ResizeObserver(measureCover); coverObserver.observe(cover); }
  if (!reduced.matches) makeParticles($('#dust-origin').parentElement, 'dustp', 16);
})();
