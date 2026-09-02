(() => {
  const track = document.getElementById('track');
  const slides = [...document.querySelectorAll('.slide')];
  const current = document.getElementById('current');
  const progress = document.getElementById('progress');
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  let active = 0;
  let wheelLocked = false;
  let touchStartX = 0;

  const goTo = (index) => {
    const target = Math.max(0, Math.min(slides.length - 1, index));
    if (target === active) return;
    active = target;
    track.style.setProperty('--slide', active);
    current.textContent = String(active + 1).padStart(2, '0');
    progress.style.width = ((active + 1) / slides.length * 100) + '%';
    previous.disabled = active === 0;
    next.disabled = active === slides.length - 1;
    slides.forEach((slide, slideIndex) => {
      const selected = slideIndex === active;
      slide.classList.toggle('is-active', selected);
      slide.setAttribute('aria-hidden', String(!selected));
    });
    history.replaceState(null, '', '#slide-' + (active + 1));
  };

  previous.addEventListener('click', () => goTo(active - 1));
  next.addEventListener('click', () => goTo(active + 1));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') goTo(active + 1);
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') goTo(active - 1);
    if (event.key === 'Home') goTo(0);
    if (event.key === 'End') goTo(slides.length - 1);
  });
  window.addEventListener('wheel', (event) => {
    if (wheelLocked || Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY)) < 18) return;
    wheelLocked = true;
    goTo(active + (event.deltaX + event.deltaY > 0 ? 1 : -1));
    window.setTimeout(() => { wheelLocked = false; }, 850);
  }, { passive: true });
  window.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  window.addEventListener('touchend', (event) => {
    const distance = touchStartX - event.changedTouches[0].clientX;
    if (Math.abs(distance) > 54) goTo(active + (distance > 0 ? 1 : -1));
  }, { passive: true });

  const requestedSlide = Number(location.hash.replace('#slide-', '')) - 1;
  if (Number.isInteger(requestedSlide) && requestedSlide > 0) goTo(requestedSlide);
})();
