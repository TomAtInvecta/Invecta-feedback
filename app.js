/* ==========================================================================
   Invecta — Feedback experience (front-end draft, no backend)
   --------------------------------------------------------------------------
   Responses are kept in the browser only. To wire this to a real destination
   later, set SUBMIT_ENDPOINT below to a form handler (e.g. a Formspree URL or
   a Typeform-connected webhook) — see submitResponses() at the foot of file.
   ========================================================================== */

'use strict';

/* Set to a URL to POST responses as JSON. Leave null for the draft. */
const SUBMIT_ENDPOINT = null;

/* ---------- Question content --------------------------------------------- */

const PRACTICES = [
  'Technology & Transformation',
  'Data & AI',
  'Underwriting & Broking',
  'Actuarial & Pricing',
  'Another area'
];

const TESTIMONIAL_STEP = {
  type: 'yesno',
  id: 'testimonial',
  title: 'Could we share your feedback as a testimonial or case study?',
  desc: 'We would always agree the final wording with you before anything is published.',
  required: true,
  autoAdvance: true,
  options: [
    { value: 'yes', label: 'Yes, happy to help' },
    { value: 'no', label: 'Not at this time' }
  ]
};

/* The opening audience split */
const AUDIENCE_STEP = {
  type: 'choice',
  id: 'audience',
  title: 'First, which best describes you?',
  desc: 'So we can ask the right questions.',
  required: true,
  autoAdvance: true,
  options: [
    { value: 'client', label: 'I worked with Invecta to make a hire' },
    { value: 'candidate', label: 'Invecta supported me as a candidate' }
  ]
};

const CLIENT_FLOW = [
  {
    type: 'choice', id: 'practice', required: true, autoAdvance: true,
    title: 'Which area did we support you with?',
    options: PRACTICES.map(p => ({ value: p, label: p }))
  },
  {
    type: 'rating', id: 'overall', required: true,
    title: 'Overall, how would you rate your experience of working with us?'
  },
  {
    type: 'nps', id: 'recommend', required: true,
    title: 'How likely are you to recommend Invecta to a colleague or peer?',
    minLabel: 'Not likely', maxLabel: 'Very likely'
  },
  {
    type: 'longtext', id: 'didwell', required: false,
    title: 'What did we do well?',
    desc: 'Anything that stood out, from the shortlist to the people we introduced and how we handled the process.'
  },
  {
    type: 'longtext', id: 'improve', required: false,
    title: 'Where could we have done better?',
    desc: 'Honest feedback is welcome. We read every response and use it to improve.'
  },
  TESTIMONIAL_STEP,
  {
    type: 'contact', id: 'contact', required: false,
    title: 'Lastly, who should we thank?',
    desc: 'Optional. Leave this with us if you are happy for us to follow up.',
    fields: [
      { key: 'name', label: 'Name', placeholder: 'Your name', type: 'text' },
      { key: 'company', label: 'Company', placeholder: 'Your organisation', type: 'text' },
      { key: 'email', label: 'Email', placeholder: 'you@company.com', type: 'email' }
    ]
  }
];

const CANDIDATE_FLOW = [
  {
    type: 'choice', id: 'practice', required: true, autoAdvance: true,
    title: 'Which area were you exploring with us?',
    options: PRACTICES.map(p => ({ value: p, label: p }))
  },
  {
    type: 'rating', id: 'overall', required: true,
    title: 'Overall, how would you rate your experience with us?'
  },
  {
    type: 'choice', id: 'communication', required: true, autoAdvance: true,
    title: 'How well did we keep you informed along the way?',
    options: [
      { value: 'very_well', label: 'Very well' },
      { value: 'well', label: 'Well' },
      { value: 'patchy', label: 'It was a little patchy' },
      { value: 'not_well', label: 'Not well enough' }
    ]
  },
  {
    type: 'longtext', id: 'didwell', required: false,
    title: 'What did we do well?',
    desc: 'Anything about how we represented you, kept in touch, or prepared you for conversations.'
  },
  {
    type: 'longtext', id: 'improve', required: false,
    title: 'What could we have done better?',
    desc: 'Honest feedback is welcome. We read every response and use it to improve.'
  },
  {
    type: 'nps', id: 'recommend', required: true,
    title: 'How likely are you to recommend us to others in your network?',
    minLabel: 'Not likely', maxLabel: 'Very likely'
  },
  TESTIMONIAL_STEP,
  {
    type: 'contact', id: 'contact', required: false,
    title: 'Lastly, may we keep in touch?',
    desc: 'Optional. Leave your details if you are happy for us to follow up.',
    fields: [
      { key: 'name', label: 'Name', placeholder: 'Your name', type: 'text' },
      { key: 'email', label: 'Email', placeholder: 'you@email.com', type: 'email' }
    ]
  }
];

const WELCOME_STEP = { type: 'welcome', id: 'welcome' };
const THANKYOU_STEP = { type: 'thankyou', id: 'thankyou' };

const RATING_CAPTIONS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/* ---------- State -------------------------------------------------------- */

const state = {
  steps: [WELCOME_STEP, AUDIENCE_STEP],
  index: 0,
  answers: {},
  audience: null
};

const stage = document.getElementById('stage');
const navbar = document.getElementById('navbar');
const btnOk = document.getElementById('btnOk');
const btnOkLabel = document.getElementById('btnOkLabel');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const navHint = document.getElementById('navHint');
const progressFill = document.getElementById('progressFill');

/* ---------- Helpers ------------------------------------------------------ */

function current() { return state.steps[state.index]; }

function buildSteps(audience) {
  const flow = audience === 'client' ? CLIENT_FLOW : CANDIDATE_FLOW;
  state.steps = [WELCOME_STEP, AUDIENCE_STEP, ...flow, THANKYOU_STEP];
}

function questionNumber() {
  // count only real questions (exclude welcome, audience, thankyou) up to current
  let n = 0;
  for (let i = 2; i <= state.index; i++) {
    const s = state.steps[i];
    if (s && s.type !== 'thankyou') n++;
  }
  return n;
}

function totalQuestions() {
  return state.steps.filter((s, i) => i >= 2 && s.type !== 'thankyou').length;
}

function updateProgress() {
  const total = state.steps.length - 1;
  const pct = Math.max(0, Math.min(100, (state.index / total) * 100));
  progressFill.style.width = pct + '%';
}

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

const TICK = '<svg class="option-tick" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

/* ---------- Rendering ---------------------------------------------------- */

function render(direction) {
  const step = current();
  const wrap = el('div', 'step');

  switch (step.type) {
    case 'welcome':  renderWelcome(wrap); break;
    case 'choice':   renderChoice(wrap, step); break;
    case 'yesno':    renderChoice(wrap, step); break;
    case 'rating':   renderRating(wrap, step); break;
    case 'nps':      renderNps(wrap, step); break;
    case 'longtext': renderText(wrap, step, true); break;
    case 'shorttext':renderText(wrap, step, false); break;
    case 'contact':  renderContact(wrap, step); break;
    case 'thankyou': renderThankYou(wrap); break;
  }

  // Swap with animation. Keep exactly one live step: animate the current one
  // out, and remove any stragglers immediately so steps can never stack up.
  const existing = Array.from(stage.children);
  const old = existing.pop();
  existing.forEach(n => n.remove());
  if (old) {
    old.classList.remove('step-enter', 'step-enter-down');
    old.classList.add(direction === 'back' ? 'step-exit-down' : 'step-exit-up');
    setTimeout(() => old.remove(), 450);
  }
  wrap.classList.add(direction === 'back' ? 'step-enter-down' : 'step-enter');
  stage.appendChild(wrap);

  // nav visibility
  const showNav = step.type !== 'welcome' && step.type !== 'thankyou';
  navbar.hidden = !showNav;
  if (showNav) configureNav(step);

  updateProgress();
  focusFirst(wrap, step);
}

function qHeader(step) {
  const head = document.createDocumentFragment();
  const n = questionNumber();
  if (n > 0) {
    const idx = el('span', 'q-index', `${n} ${ARROW}`);
    head.appendChild(idx);
  }
  const optional = !step.required && step.type !== 'contact'
    ? ' <span class="opt">(optional)</span>' : '';
  head.appendChild(el('h2', 'q-title', step.title + optional));
  if (step.desc) head.appendChild(el('p', 'q-desc', step.desc));
  return head;
}

function renderWelcome(wrap) {
  wrap.classList.add('cover');
  wrap.innerHTML = `
    <div class="dots"><span></span><span></span><span></span></div>
    <h1>Tell us how we <span class="accent">did</span>.</h1>
    <p>Your experience matters to us. A few short questions help us understand what we are getting right and where we can be better.</p>
    <p class="meta">Around two minutes · One question at a time</p>
    <div class="cover-actions">
      <button class="btn-primary" id="btnStart">Start ${ARROW}</button>
      <span class="enter-hint">press <kbd>Enter</kbd> ↵</span>
    </div>`;
  wrap.querySelector('#btnStart').addEventListener('click', goNext);
}

function renderChoice(wrap, step) {
  wrap.appendChild(qHeader(step));
  const opts = el('div', 'options');
  step.options.forEach((opt, i) => {
    const key = String.fromCharCode(65 + i); // A, B, C
    const btn = el('button', 'option');
    btn.type = 'button';
    btn.dataset.value = opt.value;
    btn.innerHTML = `<span class="option-key">${key}</span><span>${opt.label}</span>${TICK}`;
    if (state.answers[step.id] === opt.value) btn.classList.add('is-selected');
    btn.addEventListener('click', () => selectChoice(step, opt.value, wrap));
    opts.appendChild(btn);
  });
  wrap.appendChild(opts);
  wrap.appendChild(el('div', 'note', ''));
}

function selectChoice(step, value, wrap) {
  state.answers[step.id] = value;
  wrap.querySelectorAll('.option').forEach(b => {
    b.classList.toggle('is-selected', b.dataset.value === value);
  });
  clearNote(wrap);

  // The audience step changes which flow we use
  if (step.id === 'audience') {
    state.audience = value;
    buildSteps(value);
  }
  if (step.autoAdvance) {
    setTimeout(goNext, 320);
  }
}

function renderRating(wrap, step) {
  wrap.appendChild(qHeader(step));
  const row = el('div', 'rating');
  const caption = el('div', 'rating-caption', RATING_CAPTIONS[state.answers[step.id]] || '');
  for (let v = 1; v <= 5; v++) {
    const b = el('button', 'rating-star');
    b.type = 'button';
    b.dataset.value = v;
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.6 6.1 21.3l1.2-6.6L2.5 9.5l6.6-.9z"/></svg>`;
    if (v <= (state.answers[step.id] || 0)) b.classList.add('is-on');
    b.addEventListener('mouseenter', () => paintStars(row, v, caption, true));
    b.addEventListener('mouseleave', () => paintStars(row, state.answers[step.id] || 0, caption, false));
    b.addEventListener('click', () => {
      state.answers[step.id] = v;
      paintStars(row, v, caption, false);
      clearNote(wrap);
      setTimeout(goNext, 360);
    });
    row.appendChild(b);
  }
  wrap.appendChild(row);
  wrap.appendChild(caption);
  wrap.appendChild(el('div', 'note', ''));
}

function paintStars(row, v, caption, hover) {
  row.querySelectorAll('.rating-star').forEach(s => {
    s.classList.toggle('is-on', Number(s.dataset.value) <= v);
  });
  caption.textContent = RATING_CAPTIONS[v] || '';
}

function renderNps(wrap, step) {
  wrap.appendChild(qHeader(step));
  const row = el('div', 'scale');
  for (let v = 0; v <= 10; v++) {
    const b = el('button', 'scale-btn');
    b.type = 'button';
    b.dataset.value = v;
    b.textContent = v;
    if (state.answers[step.id] === v) b.classList.add('is-selected');
    b.addEventListener('click', () => {
      state.answers[step.id] = v;
      row.querySelectorAll('.scale-btn').forEach(x => x.classList.toggle('is-selected', Number(x.dataset.value) === v));
      clearNote(wrap);
      setTimeout(goNext, 320);
    });
    row.appendChild(b);
  }
  wrap.appendChild(row);
  const labels = el('div', 'scale-labels');
  labels.appendChild(el('span', null, step.minLabel || '0'));
  labels.appendChild(el('span', null, step.maxLabel || '10'));
  wrap.appendChild(labels);
  wrap.appendChild(el('div', 'note', ''));
}

function renderText(wrap, step, multiline) {
  wrap.appendChild(qHeader(step));
  const field = multiline ? el('textarea', 'field') : el('input', 'field');
  if (!multiline) field.type = 'text';
  field.placeholder = multiline ? 'Type your answer here…' : 'Type your answer…';
  field.value = state.answers[step.id] || '';
  field.setAttribute('rows', '1');
  field.addEventListener('input', () => {
    state.answers[step.id] = field.value.trim();
    if (multiline) autoGrow(field);
  });
  if (multiline) {
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); goNext(); }
    });
  }
  wrap.appendChild(field);
  wrap.appendChild(el('div', 'note', ''));
  if (multiline) setTimeout(() => autoGrow(field), 0);
}

function autoGrow(field) {
  field.style.height = 'auto';
  field.style.height = Math.min(field.scrollHeight, 320) + 'px';
}

function renderContact(wrap, step) {
  wrap.appendChild(qHeader(step));
  const group = el('div', 'field-group');
  const saved = state.answers[step.id] || {};
  step.fields.forEach(f => {
    const rowEl = el('div', 'field-row');
    rowEl.appendChild(el('label', 'field-label', f.label));
    const input = el('input', 'field field-small');
    input.type = f.type || 'text';
    input.placeholder = f.placeholder || '';
    input.value = saved[f.key] || '';
    input.dataset.key = f.key;
    input.addEventListener('input', () => {
      const obj = state.answers[step.id] || {};
      obj[f.key] = input.value.trim();
      state.answers[step.id] = obj;
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); goNext(); } });
    rowEl.appendChild(input);
    group.appendChild(rowEl);
  });
  wrap.appendChild(group);
  wrap.appendChild(el('div', 'note', ''));
}

function renderThankYou(wrap) {
  wrap.classList.add('cover');
  const t = state.answers.testimonial === 'yes'
    ? 'Thank you. We may be in touch to agree wording before anything is shared.'
    : 'Thank you for taking the time. Every response helps us improve the service we provide.';
  wrap.innerHTML = `
    <div class="tick-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
    <h1>That's everything.</h1>
    <p>${t}</p>
    <div class="cover-actions">
      <a class="btn-ghost" href="https://invectagroup.com" target="_blank" rel="noopener">Visit invectagroup.com ${ARROW}</a>
    </div>`;
  navbar.hidden = true;
  progressFill.style.width = '100%';
}

/* ---------- Navigation --------------------------------------------------- */

function configureNav(step) {
  const next = state.steps[state.index + 1];
  const isLastQuestion = next && next.type === 'thankyou';
  btnOkLabel.textContent = isLastQuestion ? 'Submit' : 'OK';
  btnPrev.disabled = state.index <= 1;

  // tailor hint text
  if (step.type === 'longtext') {
    navHint.innerHTML = 'press <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line';
  } else if (!step.required) {
    navHint.innerHTML = 'press <kbd>Enter</kbd> ↵ · optional';
  } else {
    navHint.innerHTML = 'press <kbd>Enter</kbd> ↵';
  }
}

function focusFirst(wrap, step) {
  const target = wrap.querySelector('textarea, input');
  if (target) setTimeout(() => target.focus(), 60);
}

function validate(step) {
  if (!step.required) return true;
  const a = state.answers[step.id];
  if (a === undefined || a === null || a === '') {
    showNote(stage, 'Please choose an answer to continue.');
    return false;
  }
  return true;
}

function showNote(scope, msg) {
  const note = scope.querySelector('.note');
  if (note) { note.textContent = msg; note.classList.add('show'); }
}
function clearNote(scope) {
  const note = scope.querySelector('.note');
  if (note) { note.textContent = ''; note.classList.remove('show'); }
}

function goNext() {
  const step = current();
  if (step.type !== 'welcome' && !validate(step)) return;

  if (state.index >= state.steps.length - 1) return;

  // about to enter the thank-you step → submit
  if (state.steps[state.index + 1].type === 'thankyou') {
    submitResponses();
  }
  state.index++;
  render('next');
}

function goPrev() {
  if (state.index <= 0) return;
  state.index--;
  render('back');
}

btnOk.addEventListener('click', goNext);
btnNext.addEventListener('click', goNext);
btnPrev.addEventListener('click', goPrev);

document.addEventListener('keydown', (e) => {
  const step = current();

  // Enter to advance (textarea handles its own Enter)
  if (e.key === 'Enter') {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea') return;
    if (tag === 'input') { e.preventDefault(); goNext(); return; }
    e.preventDefault();
    goNext();
    return;
  }

  // Letter keys select choice options
  if ((step.type === 'choice' || step.type === 'yesno') && /^[a-zA-Z]$/.test(e.key)) {
    const i = e.key.toUpperCase().charCodeAt(0) - 65;
    if (step.options[i]) {
      const wrap = stage.querySelector('.step');
      selectChoice(step, step.options[i].value, wrap);
    }
  }

  // Number keys for rating (1-5) and nps (0-10)
  if (step.type === 'rating' && /^[1-5]$/.test(e.key)) {
    const wrap = stage.querySelector('.step');
    const b = wrap.querySelector(`.rating-star[data-value="${e.key}"]`);
    if (b) b.click();
  }
});

/* ---------- Submission (draft: local only) ------------------------------- */

function submitResponses() {
  const payload = {
    submittedAt: new Date().toISOString(),
    audience: state.audience,
    answers: state.answers
  };

  // Keep a local copy so the draft can be inspected / demoed.
  try {
    const all = JSON.parse(localStorage.getItem('invecta_feedback') || '[]');
    all.push(payload);
    localStorage.setItem('invecta_feedback', JSON.stringify(all));
  } catch (err) { /* storage may be unavailable */ }

  console.log('[Invecta feedback] response captured:', payload);

  // To send somewhere real later, set SUBMIT_ENDPOINT at the top of this file.
  if (SUBMIT_ENDPOINT) {
    fetch(SUBMIT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.warn('[Invecta feedback] submit failed:', err));
  }
}

/* ---------- Boot --------------------------------------------------------- */
render('next');
