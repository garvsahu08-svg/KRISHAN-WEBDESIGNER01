/* KRISHAN WEBDESIGNERC – site behaviour (no dependencies) */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;

  const WA_NUMBER = '918815639703';
  const WA_MESSAGES = {
    general: 'Hello KRISHAN WEBDESIGNERC, I want to create a professional website. Please share your pricing and details.',
    price: 'Hello KRISHAN WEBDESIGNERC, I’m interested in a website starting from ₹6,949. Please share the details and a quotation for my requirements.',
  };
  const waUrl = (msg) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

  /* ---------- WhatsApp links ---------- */
  $$('[data-wa]').forEach((a) => {
    const msg = WA_MESSAGES[a.dataset.wa] || a.dataset.wa;
    a.href = waUrl(msg);
  });

  /* ---------- footer year ---------- */
  const yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- page transition curtain ---------- */
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('ready')));
  addEventListener('pageshow', (e) => { if (e.persisted) document.body.classList.remove('leaving'); });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-transition]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    e.preventDefault();
    document.body.classList.add('leaving');
    setTimeout(() => { location.href = a.href; }, reduce ? 0 : 520);
  });

  /* ---------- mobile menu ---------- */
  const burger = $('#burger');
  const menu = $('#menu');
  const setMenu = (open) => {
    if (!burger || !menu) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('lock', open);
  };
  burger && burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  addEventListener('resize', () => { if (innerWidth >= 1020) setMenu(false); });

  /* ---------- scroll: progress bar, nav state, active link, timeline ---------- */
  const nav = $('#nav');
  const bar = $('.progress i');
  const spyLinks = $$('[data-spy]');
  const spySections = spyLinks.map((l) => $('#' + l.dataset.spy)).filter(Boolean);
  const timeline = $('#timeline');
  const steps = $$('.step', timeline || document);
  let ticking = false;

  function onScroll() {
    ticking = false;
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    nav.classList.toggle('scrolled', y > 24);

    let current = spySections[0];
    for (const s of spySections) if (s.getBoundingClientRect().top <= innerHeight * 0.35) current = s;
    spyLinks.forEach((l) => l.classList.toggle('active', current && l.dataset.spy === current.id));

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const p = clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1);
      timeline.style.setProperty('--p', p.toFixed(3));
      steps.forEach((s) => s.classList.toggle('done', s.getBoundingClientRect().top < innerHeight * 0.62));
    }
    updateShowcase();
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);

  /* ---------- reveal on scroll ---------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add('in'));

  /* ---------- cursor glow + spotlight cards ---------- */
  const glow = $('.cursor-glow');
  if (finePointer && !reduce && glow) {
    let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty, running = false;
    const loop = () => {
      cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14;
      glow.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) requestAnimationFrame(loop); else running = false;
    };
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY; glow.classList.add('on');
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));
  }
  $$('.spot').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ---------- hero: 3D tilt, spotlight, particles ---------- */
  const hero = $('#home');
  const scene = $('#scene');
  if (hero && !reduce && finePointer) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      scene.style.setProperty('--ry', `${-14 + nx * 18}deg`);
      scene.style.setProperty('--rx', `${7 - ny * 14}deg`);
      hero.style.setProperty('--sx', `${e.clientX - r.left}px`);
      hero.style.setProperty('--sy', `${e.clientY - r.top}px`);
    });
  }

  const canvas = $('#particles');
  if (canvas && !reduce) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [], visible = true, raf = 0;
    const count = () => (innerWidth < 700 ? 28 : 62);
    const init = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: count() }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.25, vy: -Math.random() * 0.35 - 0.05, a: Math.random() * 0.6 + 0.2,
      }));
    };
    const draw = () => {
      if (!visible) { raf = 0; return; }
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
        if (p.x < -4) p.x = w + 4; else if (p.x > w + 4) p.x = -4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = `rgba(167,180,255,${p.a})`; ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    init(); draw();
    addEventListener('resize', init);
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) draw(); }).observe(hero);
  }

  /* ---------- showcase (scroll-driven) ---------- */
  const showcase = $('#work');
  const slides = $$('.slide', showcase);
  const dots = $$('.dot-btn', showcase);
  const sticky = $('.sticky', showcase);
  let cur = -1;

  function setActive(i) {
    if (i === cur) return;
    cur = i;
    slides.forEach((s, k) => {
      s.classList.toggle('active', k === i);
      s.classList.toggle('before', k < i);
      s.setAttribute('aria-hidden', String(k !== i));
      $$('button', s).forEach((b) => (b.tabIndex = k === i ? 0 : -1));
    });
    dots.forEach((d, k) => d.setAttribute('aria-selected', String(k === i)));
  }
  function updateShowcase() {
    if (!showcase || reduce) return;
    const r = showcase.getBoundingClientRect();
    const total = showcase.offsetHeight - innerHeight;
    const p = clamp(-r.top / total, 0, 0.9999);
    const idx = Math.floor(p * slides.length);
    setActive(idx);
    sticky.style.setProperty('--lp', (p * slides.length - idx).toFixed(3));
  }
  if (reduce) { slides.forEach((s) => s.classList.add('active')); }
  dots.forEach((d) => d.addEventListener('click', () => {
    const i = Number(d.dataset.go);
    const total = showcase.offsetHeight - innerHeight;
    const top = showcase.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + ((i + 0.5) / slides.length) * total, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- modal (preview + project details) ---------- */
  const PROJECTS = [
    { title: 'Business Website', blurb: 'A clean corporate website that builds trust with services, team and a clear enquiry path.', pages: ['Home', 'About', 'Services', 'Team', 'Contact'], features: ['Responsive layout', 'Contact form', 'WhatsApp button', 'Basic SEO setup'], type: 'Business Website' },
    { title: 'E-commerce Website', blurb: 'An online store layout with product grid, cart-ready design and easy ordering.', pages: ['Home', 'Shop', 'Product details', 'Cart', 'Contact'], features: ['Product catalogue', 'Cart-ready layout', 'Order enquiries via WhatsApp', 'Admin panel (where applicable)'], type: 'E-commerce Website' },
    { title: 'Portfolio Website', blurb: 'A bold, animated showcase for creatives and professionals to present their best work.', pages: ['Home', 'Work', 'About', 'Contact'], features: ['Project gallery', 'Smooth animations', 'Social media links', 'Fast loading'], type: 'Portfolio Website' },
    { title: 'Landing Page', blurb: 'A focused single page with a strong headline, clear call-to-action and lead form.', pages: ['Single page'], features: ['Hero with call-to-action', 'Lead enquiry form', 'Benefits and social-proof area', 'Speed optimisation'], type: 'Landing Page' },
    { title: 'Restaurant Website', blurb: 'Digital menu, gallery and reservation enquiries in one appetising, mobile-friendly site.', pages: ['Home', 'Menu', 'Gallery', 'Reservations', 'Contact'], features: ['Digital menu', 'Reservation enquiry', 'Location map', 'WhatsApp ordering enquiries'], type: 'Restaurant Website' },
  ];
  const modal = $('#modal');
  const modalBody = $('#modalBody');
  let lastFocus = null;
  const tick = '<svg class="ic"><use href="#i-check"/></svg>';

  function openModal(kind, i) {
    const p = PROJECTS[i];
    const device = slides[i].querySelector('.device').cloneNode(true);
    const wa = waUrl(`Hello KRISHAN WEBDESIGNERC, I liked the demo ${p.title.toLowerCase()} on your website. I want something similar. Please share details and pricing.`);
    if (kind === 'preview') {
      modalBody.innerHTML = `<span class="demo-badge"><i></i>Demo Project</span><h3 id="modalTitle">${p.title} – Preview</h3><p>${p.blurb}</p>`;
      modalBody.appendChild(device);
      modalBody.insertAdjacentHTML('beforeend', `<p class="md-note" style="margin-top:16px">This is a sample design created to show our style – not a live client website.</p><a class="btn btn-primary btn-sm" href="${wa}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-wa"/></svg>I want something like this</a>`);
    } else {
      modalBody.innerHTML = `<span class="demo-badge"><i></i>Demo Project</span><h3 id="modalTitle">${p.title}</h3><p>${p.blurb}</p>` +
        `<div class="md-cols"><div><h4>Typical pages</h4><ul>${p.pages.map((x) => `<li>${tick}${x}</li>`).join('')}</ul></div><div><h4>Features</h4><ul>${p.features.map((x) => `<li>${tick}${x}</li>`).join('')}</ul></div></div>` +
        `<p class="md-note">This is a demo project created to show our design style. Real client projects will be added here when available.</p>` +
        `<div class="s-btns"><a class="btn btn-primary" href="${wa}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-wa"/></svg>Get a similar website</a><a class="btn btn-ghost" href="#contact" data-pick="${p.type}"><span>Send an enquiry</span><svg class="ic"><use href="#i-arrow"/></svg></a></div>`;
    }
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('lock');
    $('.modal-x', modal).focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('lock');
    modalBody.innerHTML = '';
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) { openModal(opener.dataset.open, Number(opener.dataset.i)); return; }
    if (e.target.closest('[data-close]')) { closeModal(); return; }
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const sel = $('#f-type');
      if (sel) sel.value = pick.dataset.pick;
      closeModal();
    }
  });
  addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') { // simple focus trap
      const f = $$('button,a[href]', modal).filter((x) => !x.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- FAQ accordion ---------- */
  $$('.faq').forEach((item) => {
    const btn = $('.faq-q', item);
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('open');
      $$('.faq.open').forEach((o) => { if (o !== item) { o.classList.remove('open'); $('.faq-q', o).setAttribute('aria-expanded', 'false'); } });
      item.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- contact form ---------- */
  const form = $('#contactForm');
  const statusBox = $('#formStatus');
  const showStatus = (kind, html) => {
    statusBox.className = `form-status show ${kind}`;
    statusBox.innerHTML = html;
  };
  const fieldOf = (name) => form.elements[name] && form.elements[name].closest('.field');
  const setErr = (name, msg) => {
    const f = fieldOf(name); if (!f) return;
    f.classList.toggle('invalid', Boolean(msg));
    const s = $('.err', f); if (s) s.textContent = msg || '';
  };
  function clientValidate(d) {
    const e = {};
    if (d.name.trim().length < 2) e.name = 'Please enter your name.';
    if (!/^\+?[\d\s\-()]{7,18}$/.test(d.phone.trim()) || d.phone.replace(/\D/g, '').length < 7) e.phone = 'Please enter a valid phone number.';
    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.email = 'Please enter a valid email address.';
    if (!d.websiteType) e.websiteType = 'Please choose a website type.';
    if (d.message.trim().length < 5) e.message = 'Please tell us a little about your project.';
    return e;
  }
  const waFallback = (d) => waUrl(`Hello KRISHAN WEBDESIGNERC, my name is ${d.name}. I want a ${d.websiteType || 'website'}${d.budget ? ` (budget: ${d.budget})` : ''}. ${d.message}`.slice(0, 900));

  if (form) {
    ['name', 'phone', 'email', 'websiteType', 'budget', 'message'].forEach((n) => {
      form.elements[n].addEventListener('input', () => setErr(n, ''));
      form.elements[n].addEventListener('change', () => setErr(n, ''));
    });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      statusBox.className = 'form-status';
      const fd = new FormData(form);
      const d = Object.fromEntries(['name', 'phone', 'email', 'websiteType', 'budget', 'message', 'company'].map((k) => [k, String(fd.get(k) || '')]));
      const errs = clientValidate(d);
      ['name', 'phone', 'email', 'websiteType', 'budget', 'message'].forEach((n) => setErr(n, errs[n]));
      const firstBad = Object.keys(errs)[0];
      if (firstBad) { form.elements[firstBad].focus(); return; }

      form.classList.add('loading');
      $('#submitBtn .lbl').textContent = 'Sending…';
      try {
        const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
        let data = {};
        try { data = await res.json(); } catch { /* non-JSON response */ }
        if (res.ok && data.ok) {
          showStatus('ok', '<b>Thank you!</b> Your enquiry has been sent. We’ll contact you shortly.');
          form.reset();
        } else if (res.status === 422 && data.fields) {
          Object.entries(data.fields).forEach(([n, m]) => setErr(n, m));
          showStatus('bad', data.error || 'Please check the highlighted fields.');
        } else {
          showStatus('bad', `${data.error || 'Something went wrong. Please try again.'}<br><a href="${waFallback(d)}" target="_blank" rel="noopener">Send this on WhatsApp instead</a>`);
        }
      } catch {
        showStatus('bad', `We couldn’t reach the server. Please check your connection and try again.<br><a href="${waFallback(d)}" target="_blank" rel="noopener">Send this on WhatsApp instead</a>`);
      } finally {
        form.classList.remove('loading');
        $('#submitBtn .lbl').textContent = 'Send Enquiry';
      }
    });
  }

  onScroll();
})();
