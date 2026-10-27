/* ==========================================================================
   MARKSTAV – interakce webu (bez knihoven)
   ========================================================================== */
(() => {
  'use strict';

  window.MARKSTAV_READY = true;

  const root = document.documentElement;
  root.classList.add('js');

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const PHONE_HTML = '<a href="tel:+420739510250">+420 739 510 250</a>';
  const EMAIL_HTML = '<a href="mailto:info@mmconstruction.cz">info@mmconstruction.cz</a>';

  /* ---------- Rok v patičce ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Hero: „spárování“ fotografie ---------- */
  const hero = $('.hero');
  if (hero) {
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-loaded')));
  }

  /* ---------- Hlavička při scrollu ---------- */
  const header = $('[data-header]');
  if (header) {
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Mobilní menu ---------- */
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-mobile-menu]');
  if (header && toggle && menu) {
    const label = $('.menu-toggle__label', toggle);
    const focusables = () => [toggle, ...$$('a[href], button:not([disabled])', menu)];

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const openMenu = () => {
      header.classList.add('is-menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'Zavřít';
      menu.inert = false;
      root.classList.add('is-locked');
      document.addEventListener('keydown', onKey);
    };

    function closeMenu(returnFocus) {
      if (!header.classList.contains('is-menu-open')) return;
      header.classList.remove('is-menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'Menu';
      menu.inert = true;
      root.classList.remove('is-locked');
      document.removeEventListener('keydown', onKey);
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', () => {
      if (header.classList.contains('is-menu-open')) closeMenu(false);
      else openMenu();
    });

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu(false);
    });

    const desktop = window.matchMedia('(min-width: 1080px)');
    const onChange = () => { if (desktop.matches) closeMenu(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onChange);
    else desktop.addListener(onChange);
  }

  /* ---------- Zvýraznění aktivní sekce v navigaci ---------- */
  const navLinks = $$('[data-nav-link]');
  const sections = $$('[data-section]');
  if (navLinks.length && sections.length && 'IntersectionObserver' in window) {
    const setActive = (id) => {
      navLinks.forEach((link) => {
        const active = id && link.getAttribute('href') === `#${id}`;
        link.classList.toggle('is-active', Boolean(active));
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.dataset.section);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((section) => spy.observe(section));
  }

  /* ---------- Jemné odhalení fotografií ---------- */
  const reveals = $$('.reveal');
  if (reveals.length) {
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      reveals.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
      reveals.forEach((el) => io.observe(el));
    }
  }

  /* ---------- Galerie: filtr ---------- */
  const gallery = $('[data-gallery]');
  const cells = gallery ? $$('.gallery__cell', gallery) : [];
  const filterButtons = $$('[data-filter]');

  if (gallery && filterButtons.length) {
    $$('[data-count]').forEach((el) => {
      const key = el.dataset.count;
      const n = key === 'vse' ? cells.length : cells.filter((c) => c.dataset.category === key).length;
      el.textContent = String(n);
    });

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.filter;
        filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        cells.forEach((cell) => {
          cell.hidden = !(key === 'vse' || cell.dataset.category === key);
        });
      });
    });
  }

  /* ---------- Galerie: lightbox ---------- */
  const dialog = $('[data-lightbox]');
  if (gallery && dialog && typeof dialog.showModal === 'function') {
    const img = $('[data-lightbox-img]', dialog);
    const caption = $('[data-lightbox-caption]', dialog);
    const counter = $('[data-lightbox-counter]', dialog);
    const btnPrev = $('[data-lightbox-prev]', dialog);
    const btnNext = $('[data-lightbox-next]', dialog);
    const btnClose = $('[data-lightbox-close]', dialog);
    let current = 0;
    let trigger = null;
    let token = 0;

    const visibleItems = () => cells.filter((c) => !c.hidden).map((c) => $('.gallery__item', c));

    const preload = (link) => {
      if (!link) return;
      const pre = new Image();
      pre.decoding = 'async';
      pre.src = link.href;
    };

    const show = (index) => {
      const list = visibleItems();
      if (!list.length) return;
      current = (index + list.length) % list.length;
      const link = list[current];
      const thumb = $('img', link);
      const myToken = ++token;

      img.width = Number(link.dataset.width) || thumb.naturalWidth || 1440;
      img.height = Number(link.dataset.height) || thumb.naturalHeight || 1920;
      img.alt = thumb.alt;
      if (thumb.currentSrc) img.src = thumb.currentSrc;
      caption.textContent = link.dataset.caption || thumb.alt;
      counter.textContent = `${current + 1} / ${list.length}`;
      dialog.classList.add('is-loading');

      const full = new Image();
      full.onload = () => {
        if (myToken !== token) return;
        img.src = link.href;
        dialog.classList.remove('is-loading');
      };
      full.onerror = () => {
        if (myToken !== token) return;
        dialog.classList.remove('is-loading');
      };
      full.src = link.href;

      const single = list.length < 2;
      btnPrev.hidden = single;
      btnNext.hidden = single;
      preload(list[(current + 1) % list.length]);
      preload(list[(current - 1 + list.length) % list.length]);
    };

    const open = (link) => {
      trigger = link;
      show(visibleItems().indexOf(link));
      dialog.showModal();
      root.classList.add('is-locked');
      btnClose.focus();
    };

    gallery.addEventListener('click', (event) => {
      const link = event.target.closest('.gallery__item');
      if (!link) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      open(link);
    });

    btnPrev.addEventListener('click', () => show(current - 1));
    btnNext.addEventListener('click', () => show(current + 1));
    btnClose.addEventListener('click', () => dialog.close());

    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
    });

    // klik mimo fotografii zavře náhled
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog || event.target.classList.contains('lightbox__frame')) dialog.close();
    });

    dialog.addEventListener('close', () => {
      root.classList.remove('is-locked');
      token++;
      if (trigger && document.contains(trigger)) trigger.focus();
    });

    // přejetí prstem na mobilu
    const stage = $('.lightbox__stage', dialog);
    let startX = 0;
    let startY = 0;
    let tracking = false;
    stage.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      tracking = true;
      startX = event.clientX;
      startY = event.clientY;
    });
    stage.addEventListener('pointerup', (event) => {
      if (!tracking) return;
      tracking = false;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) show(dx < 0 ? current + 1 : current - 1);
    });
    stage.addEventListener('pointercancel', () => { tracking = false; });
  }

  /* ---------- Odkazy „Poptat…“ předvyplní službu ---------- */
  const serviceSelect = $('#f-service');
  $$('[data-service]').forEach((link) => {
    link.addEventListener('click', () => {
      if (!serviceSelect) return;
      serviceSelect.value = link.dataset.service;
      serviceSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  /* ---------- Poptávkový formulář ---------- */
  const form = $('[data-form]');
  if (!form) return;

  const statusBox = $('[data-form-status]');
  const successBox = $('[data-form-success]');
  const submitBtn = $('[data-submit]', form);
  const elapsedInput = $('[data-elapsed]', form);
  const touched = new Set();
  const FIELDS = ['name', 'email', 'phone', 'service', 'message'];

  const rules = {
    name: (v) => (v.length < 2 ? 'Vyplňte jméno a příjmení.' : ''),
    email: (v) => {
      if (!v) return 'Vyplňte e-mail, abychom vám mohli odpovědět.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Zkontrolujte e-mail – správný tvar je např. jan.novak@email.cz.';
      return '';
    },
    phone: (v) => {
      if (!v) return '';
      const digits = v.replace(/\D/g, '');
      if (!/^\+?[0-9\s()\-]+$/.test(v) || digits.length < 9 || digits.length > 15) {
        return 'Telefon zadejte číslicemi, případně s předvolbou +420.';
      }
      return '';
    },
    service: (v) => (v ? '' : 'Vyberte, o jakou práci jde.'),
    message: (v) => {
      if (!v) return 'Napište, co plánujete.';
      if (v.length < 10) return 'Popište požadavek trochu podrobněji – alespoň 10 znaků.';
      return '';
    },
  };

  const setError = (name, message) => {
    const field = form.elements[name];
    const errorEl = $(`[data-error-for="${name}"]`, form);
    if (!field || !errorEl) return;
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    errorEl.textContent = message;
    errorEl.hidden = !message;
  };

  const validate = (name) => {
    const field = form.elements[name];
    if (!field) return true;
    const message = rules[name](field.value.trim());
    setError(name, message);
    return !message;
  };

  FIELDS.forEach((name) => {
    const field = form.elements[name];
    if (!field) return;
    field.addEventListener('blur', () => {
      if (field.value.trim() || touched.has(name)) {
        touched.add(name);
        validate(name);
      }
    });
    const live = () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(name);
    };
    field.addEventListener('input', live);
    field.addEventListener('change', live);
  });

  const showStatus = (type, html) => {
    statusBox.className = `form-status${type === 'info' ? ' form-status--info' : ''}`;
    statusBox.innerHTML = html;
    statusBox.hidden = false;
  };
  const hideStatus = () => {
    statusBox.hidden = true;
    statusBox.textContent = '';
  };
  const setLoading = (state) => {
    submitBtn.classList.toggle('is-loading', state);
    submitBtn.disabled = state;
    $('.btn__label', submitBtn).textContent = state ? 'Odesílám…' : 'Odeslat poptávku';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideStatus();

    const results = FIELDS.map((name) => { touched.add(name); return validate(name); });
    if (results.includes(false)) {
      const firstInvalid = FIELDS.map((n) => form.elements[n]).find((f) => f && f.getAttribute('aria-invalid') === 'true');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    if (elapsedInput) elapsedInput.value = String(Math.round(performance.now() / 1000));

    // Otevřeno přímo ze souboru – není server, který by poptávku odeslal.
    if (window.location.protocol === 'file:') {
      showStatus('info', `Tohle je náhled webu bez serveru, takže poptávku nelze odeslat. Formulář začne fungovat po nahrání na hosting s&nbsp;PHP (soubor poptavka.php). Zatím volejte ${PHONE_HTML} nebo pište na ${EMAIL_HTML}.`);
      return;
    }

    setLoading(true);
    const controller = 'AbortController' in window ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 20000) : null;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json', 'X-Requested-With': 'fetch' },
        signal: controller ? controller.signal : undefined,
      });

      let data = null;
      try { data = await response.json(); } catch (_) { data = null; }

      if (response.ok && data && data.ok === true) {
        form.hidden = true;
        successBox.hidden = false;
        successBox.focus({ preventScroll: true });
        successBox.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
        return;
      }

      if (data && data.errors && typeof data.errors === 'object') {
        Object.entries(data.errors).forEach(([name, message]) => setError(name, String(message)));
        const firstInvalid = FIELDS.map((n) => form.elements[n]).find((f) => f && f.getAttribute('aria-invalid') === 'true');
        if (firstInvalid) firstInvalid.focus();
      }

      const serverMessage = data && typeof data.message === 'string' ? data.message : '';
      showStatus('error', '');
      statusBox.textContent = serverMessage || 'Poptávku se nepodařilo odeslat.';
      statusBox.insertAdjacentHTML('beforeend', ` Zkuste to prosím znovu, nebo nám zavolejte na ${PHONE_HTML}.`);
    } catch (_) {
      showStatus('error', `Poptávku se nepodařilo odeslat – spojení se serverem selhalo. Zkuste to prosím znovu, nebo nám zavolejte na ${PHONE_HTML} či napište na ${EMAIL_HTML}.`);
    } finally {
      if (timer) clearTimeout(timer);
      setLoading(false);
    }
  });
})();
