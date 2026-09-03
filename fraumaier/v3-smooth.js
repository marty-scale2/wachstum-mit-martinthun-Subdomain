(() => {
  const root = document.documentElement;
  const viewport = document.querySelector('.viewport');
  const ambientField = document.querySelector('.ambient-field');
  const track = document.getElementById('track');
  const progressBar = document.getElementById('progress');
  const cue = document.getElementById('cue');
  const slides = [...document.querySelectorAll('.slide')];
  const heroCards = [...document.querySelectorAll('.hero-card')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileQuery = window.matchMedia('(max-width: 760px)');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  slides.forEach((slide) => {
    const light = document.createElement('span');
    light.className = 'scene-light';
    light.setAttribute('aria-hidden', 'true');
    slide.prepend(light);
  });

  const entries = slides.map((slide) => ({
    slide,
    reveals: [...slide.querySelectorAll('[data-reveal]')],
    left: 0,
    center: 0,
    shown: false
  }));

  let mobile = mobileQuery.matches;
  let viewportWidth = root.clientWidth;
  let maxX = 0;
  let currentX = 0;
  let targetX = 0;
  let previousTime = performance.now();
  let animationFrame = 0;
  let resizeFrame = 0;
  let drag = null;
  let nextReveal = 0;
  let sceneIndex = -1;
  let heroAmount = -1;
  let needsPaint = true;

  function reveal(entry) {
    if (entry.shown) return;
    entry.shown = true;
    entry.slide.classList.add('is-active');
    entry.reveals.forEach((element) => element.classList.add('revealed'));
  }

  function revealVisible() {
    while (
      nextReveal < entries.length &&
      entries[nextReveal].left - currentX < viewportWidth * .97
    ) {
      reveal(entries[nextReveal]);
      nextReveal += 1;
    }
  }

  function updateSceneState() {
    const viewportCenter = currentX + viewportWidth * .5;
    let closest = 0;
    let smallestDistance = Infinity;

    entries.forEach((entry, index) => {
      const distance = Math.abs(entry.center - viewportCenter);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        closest = index;
      }
    });

    if (closest === sceneIndex) return;
    sceneIndex = closest;
    entries.forEach((entry, index) => {
      entry.slide.classList.toggle('is-current-scene', index === closest);
      entry.slide.classList.toggle('is-previous-scene', index === closest - 1);
      entry.slide.classList.toggle('is-next-scene', index === closest + 1);
    });
    const ratio = entries.length > 1 ? closest / (entries.length - 1) : 0;
    // Auf dem Ambient-Layer statt auf <html>: eine Custom Property auf dem
    // Wurzelelement zwingt den Browser sonst zum Neuberechnen des ganzen Dokuments.
    if (ambientField) {
      ambientField.style.setProperty('--scene-position', `${(ratio * 100).toFixed(2)}vw`);
      ambientField.style.setProperty('--orb-position', `${(ratio * 24).toFixed(2)}vw`);
    }
  }

  function paintHero() {
    if (reducedMotion || !heroCards.length) return;
    const amount = clamp(currentX / Math.max(1, viewportWidth * .92), 0, 1);
    if (Math.abs(amount - heroAmount) < .0005) return;
    heroAmount = amount;

    const motions = [
      { x: -74, y: 228, start: -8, turn: -9, scale: .9, fade: .64, imageY: -22 },
      { x: 82, y: 174, start: 7, turn: 10, scale: .93, fade: .54, imageY: 18 },
      { x: -14, y: 304, start: -1.5, turn: -5, scale: .95, fade: .45, imageY: -14 }
    ];

    heroCards.forEach((card, index) => {
      const motion = motions[index];
      const scale = 1 - amount * (1 - motion.scale);
      card.style.transform = `translate3d(${(amount * motion.x).toFixed(2)}px,${(amount * motion.y).toFixed(2)}px,0) rotate(${(motion.start + amount * motion.turn).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      card.style.opacity = String(1 - amount * motion.fade);
      const image = card.querySelector('img');
      if (image) {
        image.style.transform = `translate3d(0,${(amount * motion.imageY).toFixed(2)}px,0) scale(${(1 + amount * .075).toFixed(4)})`;
      }
    });
  }

  function paint() {
    if (mobile) return;
    track.style.transform = `translate3d(${-currentX.toFixed(2)}px,0,0)`;
    const progress = maxX > 0 ? currentX / maxX : 0;
    if (progressBar) progressBar.style.transform = `scaleX(${progress.toFixed(5)})`;
    if (cue) cue.classList.toggle('is-gone', targetX > 90);
    paintHero();
    revealVisible();
    updateSceneState();
  }

  function loop(time) {
    animationFrame = 0;
    if (mobile) return;

    const elapsed = Math.min(40, Math.max(1, time - previousTime));
    const distance = targetX - currentX;

    if (Math.abs(distance) < .08) {
      currentX = targetX;
    } else {
      const speed = drag ? .032 : .021;
      const smoothing = reducedMotion ? 1 : 1 - Math.exp(-elapsed * speed);
      currentX += distance * smoothing;
    }

    paint();
    previousTime = time;

    if (Math.abs(targetX - currentX) >= .08) {
      animationFrame = requestAnimationFrame(loop);
    }
  }

  function wake() {
    if (mobile || animationFrame) return;
    previousTime = performance.now();
    animationFrame = requestAnimationFrame(loop);
  }

  function measure() {
    mobile = mobileQuery.matches;
    viewportWidth = root.clientWidth;

    if (mobile) {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      track.style.transform = '';
      entries.forEach((entry) => {
        entry.slide.classList.remove('is-current-scene', 'is-previous-scene', 'is-next-scene');
      });
      heroCards.forEach((card) => {
        card.style.removeProperty('transform');
        card.style.removeProperty('opacity');
        const image = card.querySelector('img');
        if (image) image.style.removeProperty('transform');
      });
      heroAmount = -1;
      sceneIndex = -1;
      mobileFrame();
      return;
    }

    maxX = Math.max(0, track.scrollWidth - viewportWidth);
    targetX = clamp(targetX, 0, maxX);
    currentX = clamp(currentX, 0, maxX);
    entries.forEach((entry) => {
      entry.left = entry.slide.offsetLeft;
      entry.center = entry.left + entry.slide.offsetWidth * .5;
    });
    needsPaint = true;
    wake();
  }

  function wheelDistance(event) {
    const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? viewportWidth : 1;
    const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    return raw * unit;
  }

  window.addEventListener('wheel', (event) => {
    if (mobile || maxX <= 0) return;
    event.preventDefault();

    const delta = clamp(wheelDistance(event), -180, 180);
    // Wie weit das Ziel dem Bild vorauslaufen darf. Zu viel Vorlauf fühlt sich
    // an, als würde die Seite nach dem Loslassen noch ewig weitergleiten.
    const maxLead = viewportWidth * .58;
    targetX = clamp(targetX + delta * 1.38, 0, maxX);
    targetX = clamp(targetX, currentX - maxLead, currentX + maxLead);
    needsPaint = true;
    wake();
  }, { passive: false });

  viewport.addEventListener('pointerdown', (event) => {
    if (mobile || event.button !== 0) return;
    drag = { x: event.clientX, target: targetX };
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!drag || mobile) return;
    targetX = clamp(drag.target - (event.clientX - drag.x) * 1.22, 0, maxX);
    needsPaint = true;
    wake();
  });

  function endDrag(event) {
    if (!drag) return;
    drag = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  }

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  window.addEventListener('keydown', (event) => {
    if (mobile) return;
    const distances = {
      ArrowRight: viewportWidth * .38,
      PageDown: viewportWidth * .78,
      ArrowLeft: viewportWidth * -.38,
      PageUp: viewportWidth * -.78
    };

    if (event.key === 'Home') {
      event.preventDefault();
      targetX = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      targetX = maxX;
    } else if (event.key in distances) {
      event.preventDefault();
      targetX = clamp(targetX + distances[event.key], 0, maxX);
    } else {
      return;
    }

    needsPaint = true;
    wake();
  });

  function mobileFrame() {
    if (!mobile) return;
    const height = window.innerHeight;
    entries.forEach((entry) => {
      const rect = entry.slide.getBoundingClientRect();
      if (rect.top < height * .92 && rect.bottom > 0) reveal(entry);
    });
    const available = root.scrollHeight - height;
    const progress = available > 0 ? clamp(window.scrollY / available, 0, 1) : 0;
    if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
    if (cue) cue.classList.toggle('is-gone', window.scrollY > 80);
  }

  let mobileTicking = false;
  window.addEventListener('scroll', () => {
    if (!mobile || mobileTicking) return;
    mobileTicking = true;
    requestAnimationFrame(() => {
      mobileTicking = false;
      mobileFrame();
    });
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      measure();
    });
  }, { passive: true });
  window.addEventListener('orientationchange', measure, { passive: true });
  window.addEventListener('load', measure);

  const roadmapMark = document.querySelector('.roadmap-mark');
  if (roadmapMark && !reducedMotion) {
    let markFrame = 0;
    let markPointer = null;

    const paintMark = () => {
      markFrame = 0;
      if (!markPointer) return;
      const rect = roadmapMark.getBoundingClientRect();
      const x = clamp((markPointer.x - rect.left) / rect.width, 0, 1);
      const y = clamp((markPointer.y - rect.top) / rect.height, 0, 1);
      const nx = x * 2 - 1;
      const ny = y * 2 - 1;
      roadmapMark.style.setProperty('--mark-x', `${(nx * 6).toFixed(2)}px`);
      roadmapMark.style.setProperty('--mark-y', `${(ny * 6).toFixed(2)}px`);
    };

    roadmapMark.addEventListener('pointermove', (event) => {
      markPointer = { x: event.clientX, y: event.clientY };
      if (!markFrame) markFrame = requestAnimationFrame(paintMark);
    });

    roadmapMark.addEventListener('pointerleave', () => {
      markPointer = null;
      roadmapMark.style.setProperty('--mark-x', '0px');
      roadmapMark.style.setProperty('--mark-y', '0px');
    });
  }

  const proofImages = [...document.querySelectorAll('.slide-14 .proof-shot img')];
  if (proofImages.length) {
    const lightbox = document.createElement('div');
    lightbox.className = 'proof-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-hidden', 'true');

    const lightboxImage = document.createElement('img');
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'proof-lightbox__close';
    closeButton.setAttribute('aria-label', 'Schließen');
    closeButton.textContent = '×';
    lightbox.append(lightboxImage, closeButton);
    document.body.append(lightbox);

    const closeLightbox = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('proof-is-open');
    };

    const openLightbox = (source) => {
      lightboxImage.src = source.currentSrc || source.src;
      lightboxImage.alt = source.alt;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('proof-is-open');
      closeButton.focus({ preventScroll: true });
    };

    proofImages.forEach((image) => {
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.addEventListener('click', () => openLightbox(image));
      image.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openLightbox(image);
      });
    });

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox || event.target === lightboxImage || event.target === closeButton) closeLightbox();
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
  }

  measure();

  window.setTimeout(() => {
    if (!entries.some((entry) => entry.shown)) entries.forEach(reveal);
  }, 1600);
})();
