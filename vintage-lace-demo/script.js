'use strict';
const wedding = { start: '2026-11-29T09:00:00+07:00' };
const card = document.querySelector('#open-invitation');
const invitation = document.querySelector('#invitation');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const envelope = document.querySelector('#envelope-cover');
const envelopeButton = document.querySelector('#open-envelope');
const siteMain = document.querySelector('#site-main');
let envelopeOpening = false;
document.documentElement.classList.add('has-envelope');

function finishOpeningEnvelope() {
  envelope.hidden = true;
  siteMain.inert = false;
  siteMain.removeAttribute('aria-hidden');
  document.documentElement.classList.remove('has-envelope');
  envelopeOpening = false;
  document.querySelector('.monogram').focus({ preventScroll: true });
}
envelopeButton.addEventListener('click', () => {
  if (envelopeOpening) return;
  envelopeOpening = true;
  window.scrollTo({ top: 0, behavior: 'instant' });
  envelope.classList.add('is-opening');
  if (reducedMotion.matches) finishOpeningEnvelope();
  else setTimeout(finishOpeningEnvelope, 2200);
});
function openInvitation() {
  invitation.hidden = false;
  card.classList.add('is-open');
  card.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => invitation.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' }));
  requestAnimationFrame(updateCarousel);
}
card.addEventListener('click', openInvitation);
document.querySelector('#open-link').addEventListener('click', openInvitation);
document.querySelector('#back-button').addEventListener('click', () => {
  document.querySelector('.hero').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  card.classList.remove('is-open');
});
function updateCountdown() {
  let remaining = Math.max(0, Math.floor((new Date(wedding.start).getTime() - Date.now()) / 1000));
  const units = [['days', 86400], ['hours', 3600], ['minutes', 60], ['seconds', 1]];
  for (const [id, divisor] of units) {
    document.getElementById(id).textContent = String(Math.floor(remaining / divisor)).padStart(2, '0');
    remaining %= divisor;
  }
}
updateCountdown();
setInterval(updateCountdown, 1000);
let toastTimeout;
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message; toast.classList.add('visible');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => toast.classList.remove('visible'), 4000);
}
// Nhạc hộp nhạc tự tổng hợp bằng Web Audio; chỉ phát khi khách chủ động bật.
let audioContext, musicTimer;
let playing = false;
const soundButton = document.querySelector('.sound-toggle');
const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 659.25, 783.99, 987.77, 783.99, 587.33, 698.46, 783.99, 659.25];
let note = 0;
function playNote() {
  const time = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine'; oscillator.frequency.value = melody[note++ % melody.length];
  gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(.055, time + .025); gain.gain.exponentialRampToValueAtTime(.001, time + 1.9);
  oscillator.connect(gain); gain.connect(audioContext.destination);
  oscillator.start(time); oscillator.stop(time + 2);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
soundButton.addEventListener('click', async () => {
  try {
    if (playing) {
      clearInterval(musicTimer); await audioContext.suspend(); playing = false;
    } else {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio unavailable');
      audioContext ||= new Audio(); await audioContext.resume();
      playing = true; playNote(); musicTimer = setInterval(playNote, 650);
    }
    soundButton.setAttribute('aria-pressed', String(playing));
    soundButton.setAttribute('aria-label', playing ? 'Tắt nhạc nền' : 'Bật nhạc nền');
  } catch { showToast('Trình duyệt này chưa hỗ trợ nhạc nền.'); }
});
document.addEventListener('visibilitychange', async () => {
  if (document.hidden && playing) {
    clearInterval(musicTimer); await audioContext.suspend(); playing = false;
    soundButton.setAttribute('aria-pressed', 'false'); soundButton.setAttribute('aria-label', 'Bật nhạc nền');
  }
});

// November 2026 begins on Sunday; dates are rendered in a Monday-first table.
const calendarBody = document.querySelector('#calendar-days');
for (let week = 0; week < 6; week++) {
  const row = document.createElement('tr');
  for (let weekday = 0; weekday < 7; weekday++) {
    const day = week * 7 + weekday - 5;
    const cell = document.createElement('td');
    if (day >= 1 && day <= 30) {
      const label = document.createElement('span');
      label.textContent = day;
      cell.appendChild(label);
      if (day === 27 || day === 29) {
        cell.className = day === 27 ? 'party-day' : 'wedding-day';
        cell.setAttribute('aria-label', `${day} tháng 11, ${day === 27 ? 'Tiệc chung vui' : 'Hôn lễ'}`);
      }
    }
    row.appendChild(cell);
  }
  calendarBody.appendChild(row);
}
const guestQuery = new URLSearchParams(location.search);
const guest = guestQuery.has('id') ? '' : guestQuery.get('khach') || guestQuery.get('guest');
let recipient = guest?.trim().slice(0, 60) || 'Quý khách';
updateGuestName(recipient);

const story = document.querySelector('.story-band');
const storyObserver = new IntersectionObserver(entries => {
  story.classList.toggle('is-visible', entries[0].isIntersecting);
}, { threshold: 0.15 });
storyObserver.observe(story);

document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(button.dataset.copy); showToast('Đã sao chép.'); }
  catch { showToast(`Vui lòng sao chép: ${button.dataset.copy}`); }
}));

const form = document.querySelector('#rsvp-form');
const submitButton = document.querySelector('#submit-rsvp');
const noteInput = document.querySelector('#guest-note');
const status = document.querySelector('#rsvp-status');
let submissionId = crypto.randomUUID();
let submitted = false;
function updateAttendance() {
  form.elements.guests.disabled = form.elements.attendance.value === 'no';
}
function updateGuestName(name) {
  recipient = name || recipient;
  document.querySelectorAll('[data-guest], [data-envelope-recipient]').forEach(element => { element.textContent = recipient; });
  envelopeButton.setAttribute('aria-label', `Mở phong bì thư mời cưới dành cho ${recipient}`);
}
async function resolveGuest() {
  if (!guestQuery.has('id')) return;
  const ids = guestQuery.getAll('id');
  const id = ids[0].trim();
  if (ids.length !== 1 || !/^[1-9][0-9]{0,8}$/.test(id)) return;
  try {
    const response = await fetch(`/api/guest?id=${encodeURIComponent(id)}`, {
      cache: 'no-store', signal: AbortSignal.timeout(14000)
    });
    if (!response.ok) return;
    const data = await response.json();
    if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 60) return;
    updateGuestName(data.name.trim());
  } catch {}
}
resolveGuest();
form.addEventListener('change', updateAttendance);
function resetSubmission() {
  submissionId = crypto.randomUUID();
  if (submitted) {
    submitted = false;
    submitButton.disabled = false;
    submitButton.querySelector('span').textContent = 'Gửi xác nhận';
    status.textContent = '';
  }
}
form.addEventListener('input', resetSubmission);
noteInput.addEventListener('input', resetSubmission);
updateAttendance();
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitButton.disabled) return;
  const name = recipient;
  const response = { id: submissionId, name, attendance: form.elements.attendance.value, guests: form.elements.attendance.value === 'no' ? 0 : Number(form.elements.guests.value), note: form.elements.note.value.trim() };
  if (guestQuery.has('id')) {
    const ids = guestQuery.getAll('id');
    if (ids.length !== 1 || !/^[1-9][0-9]{0,8}$/.test(ids[0].trim())) {
      status.textContent = 'Mã khách mời không hợp lệ. Vui lòng kiểm tra đường dẫn thiệp.';
      return;
    }
    response.guest_id = ids[0].trim();
  }
  submitButton.disabled = true;
  form.setAttribute('aria-busy', 'true');
  [...form.elements].filter(control => control.matches('input, select, textarea')).forEach(control => { control.disabled = true; });
  submitButton.querySelector('span').textContent = 'Đang gửi…';
  status.textContent = '';
  try {
    const result = await fetch('/api/rsvp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response), signal: AbortSignal.timeout(20000)
    });
    const data = await result.json();
    if (!result.ok || !data.ok) throw new Error(data.error || 'Chưa thể gửi xác nhận. Vui lòng thử lại.');
    submitted = true;
    submitButton.querySelector('span').textContent = 'Đã gửi xác nhận';
    status.textContent = 'Cảm ơn bạn! Phản hồi của bạn đã được gửi thành công.';
  } catch (error) {
    submitButton.disabled = false;
    submitButton.querySelector('span').textContent = 'Gửi xác nhận';
    status.textContent = error.name === 'TimeoutError' ? 'Kết nối hơi chậm. Vui lòng thử gửi lại.' : (error.message || 'Chưa gửi được phản hồi. Vui lòng thử lại.');
  } finally {
    form.removeAttribute('aria-busy');
    [...form.elements].filter(control => control.matches('input, select, textarea')).forEach(control => { control.disabled = false; });
    updateAttendance();
  }
});

const photoDialog = document.querySelector('#photo-dialog');
const galleryButtons = [...document.querySelectorAll('[data-photo]')];
let activePhoto;
let photoIndex = 0;
function showPhoto(index) {
  photoIndex = (index + galleryButtons.length) % galleryButtons.length;
  const button = galleryButtons[photoIndex];
  const image = button.querySelector('img');
  photoDialog.querySelector('img').src = button.dataset.photo;
  photoDialog.querySelector('img').alt = image.alt;
  document.querySelector('#photo-count').textContent = `${String(photoIndex + 1).padStart(2, '0')} / ${galleryButtons.length}`;
}
galleryButtons.forEach((button, index) => button.addEventListener('click', () => {
  activePhoto = button;
  showPhoto(index);
  document.body.classList.add('has-lightbox');
  photoDialog.showModal();
}));
document.querySelector('#close-photo').addEventListener('click', () => photoDialog.close());
document.querySelector('#photo-prev').addEventListener('click', () => showPhoto(photoIndex - 1));
document.querySelector('#photo-next').addEventListener('click', () => showPhoto(photoIndex + 1));
photoDialog.addEventListener('click', event => { if (event.target === photoDialog) photoDialog.close(); });
photoDialog.addEventListener('close', () => {
  document.body.classList.remove('has-lightbox');
  activePhoto?.focus();
});
photoDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
let touchStart;
photoDialog.addEventListener('touchstart', event => {
  touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
}, { passive: true });
photoDialog.addEventListener('touchend', event => {
  if (!touchStart || !event.changedTouches[0]) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) showPhoto(photoIndex + (dx < 0 ? 1 : -1));
}, { passive: true });

const carousel = document.querySelector('#album-carousel');
const carouselPrev = document.querySelector('#carousel-prev');
const carouselNext = document.querySelector('#carousel-next');
function updateCarousel() {
  carouselPrev.disabled = carousel.scrollLeft <= 1;
  carouselNext.disabled = carousel.scrollWidth - carousel.clientWidth - carousel.scrollLeft <= 1;
}
function moveCarousel(direction) {
  carousel.scrollBy({ left: direction * carousel.clientWidth * 0.8, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
carouselPrev.addEventListener('click', () => moveCarousel(-1));
carouselNext.addEventListener('click', () => moveCarousel(1));
carousel.addEventListener('scroll', updateCarousel, { passive: true });
carousel.addEventListener('keydown', event => {
  if (event.target === carousel && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    moveCarousel(event.key === 'ArrowRight' ? 1 : -1);
  }
});
window.addEventListener('resize', updateCarousel);
updateCarousel();
