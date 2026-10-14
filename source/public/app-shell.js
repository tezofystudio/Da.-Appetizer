/* App-shell interactions added without replacing the existing application logic. */
/* Escape the sticky header's backdrop-filter containing block so dialogs can center in the viewport. */
document.querySelectorAll('.header-popover').forEach(panel => document.body.append(panel));

function closeHeaderPopovers(exceptPanel = null, restoreFocus = false) {
  let lastClosedToggle = null;
  document.querySelectorAll('[data-popover-toggle]').forEach(toggle => {
    const panel = document.getElementById(toggle.dataset.popoverToggle);
    if (!panel || panel === exceptPanel) return;
    if (!panel.hidden) lastClosedToggle = toggle;
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  });
  if (restoreFocus && lastClosedToggle) lastClosedToggle.focus({preventScroll: true});
}

function openHeaderPopover(toggle) {
  const panel = document.getElementById(toggle.dataset.popoverToggle);
  if (!panel) return;
  const shouldOpen = panel.hidden;
  closeHeaderPopovers(shouldOpen ? panel : null);
  if (!shouldOpen) {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    return;
  }
  const header = document.querySelector('.topbar');
  if (header) panel.style.top = `${Math.round(header.getBoundingClientRect().bottom + 8)}px`;
  panel.hidden = false;
  toggle.setAttribute('aria-expanded', 'true');
}

document.addEventListener('click', event => {
  const toggle = event.target.closest?.('[data-popover-toggle]');
  if (toggle) {
    openHeaderPopover(toggle);
    return;
  }

  if (!event.target.closest?.('.header-control-anchor, .header-popover')) closeHeaderPopovers();

  const featureCard = event.target.closest?.('[data-demo-category]');
  if (featureCard && typeof window.openCategory === 'function') {
    window.openCategory(featureCard.dataset.demoCategory);
  }

  if (event.target.closest?.('.address-search')) {
    window.setTimeout(() => {
      document.getElementById('menuSearch')?.focus({preventScroll: true});
    }, 420);
  }

  if (event.target.closest?.('.address-details-link') || !event.target.closest?.('.home-address-bar')) closeLocationDetails();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  closeHeaderPopovers(null, true);
  closeLocationDetails(true);
});
window.addEventListener('scroll', () => closeHeaderPopovers(), {passive: true});
window.addEventListener('resize', () => {
  const header = document.querySelector('.topbar');
  if (!header) return;
  document.querySelectorAll('.header-popover:not([hidden])').forEach(panel => {
    panel.style.top = `${Math.round(header.getBoundingClientRect().bottom + 8)}px`;
  });
}, {passive: true});

/* Tapping the raised pin reveals the complete existing address without leaving the page. */
const locationToggle = document.getElementById('locationToggle');
const locationDetails = document.getElementById('locationDetails');
function closeLocationDetails(restoreFocus = false) {
  if (!locationDetails || locationDetails.hidden) return;
  locationDetails.hidden = true;
  locationToggle?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) locationToggle?.focus({preventScroll: true});
}
locationToggle?.addEventListener('click', () => {
  if (!locationDetails) return;
  const opening = locationDetails.hidden;
  locationDetails.hidden = !opening;
  locationToggle.setAttribute('aria-expanded', String(opening));
});

/* Random, no-immediate-repeat food slideshow using only the existing sample image assets. */
(() => {
  const frame = document.getElementById('heroFoodFrame');
  const homeView = document.getElementById('view-home');
  const layers = Array.from(document.querySelectorAll('[data-hero-food-layer]'));
  if (!frame || layers.length < 2) return;

  const foods = [
    {src: './images/biryani.webp', en: 'Biryani', bn: 'বিরিয়ানি'},
    {src: './images/burger.webp', en: 'Burger', bn: 'বার্গার'},
    {src: './images/chicken.webp', en: 'Chicken', bn: 'চিকেন'},
    {src: './images/chowmein.webp', en: 'Chowmein', bn: 'চাওমিন'},
    {src: './images/curry.webp', en: 'Curry', bn: 'কারি'},
    {src: './images/pasta.webp', en: 'Pasta', bn: 'পাস্তা'},
    {src: './images/pizza.webp', en: 'Pizza', bn: 'পিৎজা'},
    {src: './images/rice.webp', en: 'Rice dish', bn: 'রাইস ডিশ'},
    {src: './images/set.webp', en: 'Set menu', bn: 'সেট মেনু'},
    {src: './images/soup.webp', en: 'Soup', bn: 'স্যুপ'},
  ];
  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference?.matches ?? false;
  let activeLayer = 0;
  let currentFood = 0;
  let shuffledBag = [];
  let slideshowTimer = null;

  foods.forEach(food => { const image = new Image(); image.src = food.src; });
  layers[0].src = foods[0].src;
  layers[0].alt = 'Illustrative Biryani preview; menu availability is not verified.';
  layers[0].classList.add('is-active');
  layers[1].src = foods[6].src;
  layers[1].alt = '';

  function nextFoodIndex() {
    if (!shuffledBag.length) {
      shuffledBag = foods.map((_, index) => index).filter(index => index !== currentFood);
      for (let i = shuffledBag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledBag[i], shuffledBag[j]] = [shuffledBag[j], shuffledBag[i]];
      }
    }
    return shuffledBag.pop();
  }

  function showFood(index) {
    const incomingLayer = 1 - activeLayer;
    const incoming = layers[incomingLayer];
    const outgoing = layers[activeLayer];
    const food = foods[index];
    incoming.classList.remove('is-active', 'is-leaving');
    incoming.src = food.src;
    incoming.alt = `Illustrative ${food.en} preview; menu availability is not verified.`;
    incoming.removeAttribute('aria-hidden');

    const reveal = () => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        incoming.classList.add('is-active');
        outgoing.classList.remove('is-active');
        outgoing.classList.add('is-leaving');
        outgoing.setAttribute('aria-hidden', 'true');
        frame.classList.remove('is-smoking');
        void frame.offsetWidth;
        frame.classList.add('is-smoking');
        window.setTimeout(() => {
          outgoing.classList.remove('is-leaving');
          frame.classList.remove('is-smoking');
        }, 2500);
        activeLayer = incomingLayer;
        currentFood = index;
      }));
    };

    if (incoming.complete && incoming.naturalWidth > 0) reveal();
    else {
      incoming.onload = reveal;
      incoming.onerror = () => { incoming.onload = null; };
    }
  }

  function advanceFood() {
    if (reducedMotion || document.hidden || !homeView?.classList.contains('active')) return;
    showFood(nextFoodIndex());
  }
  function startSlideshow() {
    if (slideshowTimer || reducedMotion) return;
    slideshowTimer = window.setInterval(advanceFood, 6900);
  }
  function stopSlideshow() {
    if (!slideshowTimer) return;
    window.clearInterval(slideshowTimer);
    slideshowTimer = null;
  }
  startSlideshow();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopSlideshow(); else startSlideshow(); });
  motionPreference?.addEventListener?.('change', event => {
    reducedMotion = event.matches;
    if (reducedMotion) stopSlideshow(); else startSlideshow();
  });
})();

/* A small home rating card cycles through the three existing, attributed review paraphrases. */
(() => {
  const quote = document.getElementById('homeReviewQuote');
  const source = document.getElementById('homeReviewSource');
  const card = quote?.closest('.rating-card');
  const homeView = document.getElementById('view-home');
  if (!quote || !source || !card) return;

  let currentIndex = 0;
  let language = document.documentElement.lang || 'en';
  let dictionary = window.DAGetDictionary?.() || {};
  let timer = null;
  let reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  function applyReview() {
    quote.dataset.i18n = `review${currentIndex + 1}`;
    source.dataset.i18n = `reviewSource${currentIndex + 1}`;
    const activeDictionary = dictionary || {};
    quote.textContent = activeDictionary[quote.dataset.i18n] || quote.textContent;
    source.textContent = activeDictionary[source.dataset.i18n] || source.textContent;
  }
  function rotateReview() {
    if (reducedMotion || document.hidden || !homeView?.classList.contains('active')) return;
    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) nextIndex = Math.floor(Math.random() * 3);
    card.classList.add('is-swapping');
    window.setTimeout(() => {
      currentIndex = nextIndex;
      applyReview();
      card.classList.remove('is-swapping');
    }, 240);
  }
  function startTicker() {
    if (timer || reducedMotion) return;
    timer = window.setInterval(rotateReview, 9500);
  }
  function stopTicker() {
    if (!timer) return;
    window.clearInterval(timer);
    timer = null;
  }

  window.DAReviewTicker = {
    setLanguage(nextLanguage, nextDictionary) {
      language = nextLanguage;
      dictionary = nextDictionary || window.DAGetDictionary?.() || {};
      applyReview();
    },
  };
  applyReview();
  startTicker();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopTicker(); else startTicker(); });
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.addEventListener?.('change', event => {
    reducedMotion = event.matches;
    if (reducedMotion) stopTicker(); else startTicker();
  });
})();

/* Continuous, touch/drag-friendly loop for the dish-mention cards below menu categories. */
(() => {
  const rail = document.getElementById('mentions');
  if (!rail) return;

  const menuView = document.getElementById('view-menu');
  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference?.matches ?? false;
  const speed = 25; // px/second, slow enough to read each card.
  let loopWidth = 0;
  let currentSignature = '';
  let lastFrame = 0;
  let pauseUntil = 0;
  let focused = false;
  let pointerDown = false;
  let pointerFocusDeadline = 0;
  let draggingPointer = null;
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragMoved = false;

  const originals = () => Array.from(rail.children).filter(element =>
    element.matches?.('.mention-card') && !element.hasAttribute('data-mentions-carousel-clone')
  );

  function measureLoop() {
    const firstClone = rail.querySelector(':scope > .mention-card[data-mentions-carousel-clone]');
    if (!firstClone) {
      loopWidth = 0;
      return;
    }
    const railRect = rail.getBoundingClientRect();
    loopWidth = Math.max(0, firstClone.getBoundingClientRect().left - railRect.left + rail.scrollLeft);
    if (loopWidth > 0 && rail.scrollLeft >= loopWidth) rail.scrollLeft %= loopWidth;
  }

  function refreshSlides() {
    const cards = originals();
    const signature = cards.map(card => card.textContent.replace(/\s+/g, ' ').trim()).join('|');
    const clones = rail.querySelectorAll(':scope > .mention-card[data-mentions-carousel-clone]');

    if (reducedMotion) {
      clones.forEach(clone => clone.remove());
      currentSignature = signature;
      loopWidth = 0;
      rail.classList.remove('mentions-slider-ready');
      return;
    }

    if (signature === currentSignature && clones.length === cards.length && cards.length > 0) {
      measureLoop();
      return;
    }

    clones.forEach(clone => clone.remove());
    currentSignature = signature;
    loopWidth = 0;
    rail.classList.toggle('mentions-slider-ready', cards.length > 1);
    if (cards.length < 2) return;

    const duplicateCards = cards.map(card => {
      const clone = card.cloneNode(true);
      clone.dataset.mentionsCarouselClone = 'true';
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('inert', '');
      clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
      clone.querySelectorAll('img').forEach(image => { image.draggable = false; });
      return clone;
    });
    rail.append(...duplicateCards);
    requestAnimationFrame(measureLoop);
  }

  const observer = new MutationObserver(() => requestAnimationFrame(refreshSlides));
  observer.observe(rail, {childList: true});
  refreshSlides();
  motionPreference?.addEventListener?.('change', event => {
    reducedMotion = event.matches;
    refreshSlides();
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => requestAnimationFrame(measureLoop)).observe(rail);
  }
  window.addEventListener('resize', () => requestAnimationFrame(measureLoop), {passive: true});

  function pauseFor(milliseconds = 1200) {
    pauseUntil = performance.now() + milliseconds;
  }

  rail.addEventListener('focusin', () => {
    if (performance.now() > pointerFocusDeadline) focused = true;
  });
  rail.addEventListener('focusout', event => {
    if (!rail.contains(event.relatedTarget)) {
      focused = false;
      pauseFor(700);
    }
  });
  rail.addEventListener('wheel', () => pauseFor(1400), {passive: true});

  rail.addEventListener('pointerdown', event => {
    pointerDown = true;
    focused = false;
    pointerFocusDeadline = performance.now() + 1000;
    pauseUntil = Infinity;
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    draggingPointer = event.pointerId;
    dragStartX = event.clientX;
    dragStartScroll = rail.scrollLeft;
    dragMoved = false;
    rail.classList.add('is-dragging');
    try { rail.setPointerCapture(event.pointerId); } catch (_) { /* capture is optional */ }
  });

  rail.addEventListener('pointermove', event => {
    if (draggingPointer !== event.pointerId) return;
    const delta = event.clientX - dragStartX;
    if (Math.abs(delta) > 4) dragMoved = true;
    if (dragMoved) rail.scrollLeft = dragStartScroll - delta;
  });

  function finishPointer(event) {
    pointerDown = false;
    if (draggingPointer === event.pointerId) {
      rail.classList.remove('is-dragging');
      draggingPointer = null;
    }
    pauseFor(1500);
  }
  rail.addEventListener('pointerup', finishPointer);
  rail.addEventListener('pointercancel', finishPointer);

  function animate(now) {
    if (!lastFrame) lastFrame = now;
    const elapsed = Math.min(48, Math.max(0, now - lastFrame));
    lastFrame = now;

    const menuIsVisible = menuView?.classList.contains('active') && !document.hidden;
    if (!loopWidth && menuIsVisible) measureLoop();
    if (!reducedMotion && loopWidth > 0 && menuIsVisible && !focused && !pointerDown && now >= pauseUntil) {
      rail.scrollLeft += speed * elapsed / 1000;
      if (rail.scrollLeft >= loopWidth) rail.scrollLeft %= loopWidth;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
