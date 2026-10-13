import {categories, dishes, ui, liveMenuURL} from './data.js';
import {icon} from './icons.js';
import {Steam} from './steam.js';

const mount = document.getElementById('daExperienceRoot');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const storage = {
 get(key, fallback) { try { return JSON.parse(localStorage.getItem(`da.menu.${key}`)) ?? fallback; } catch { return fallback; } },
 set(key, value) { try { localStorage.setItem(`da.menu.${key}`, JSON.stringify(value)); } catch {} },
};
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getDish = id => dishes.find(d => d.id === id);
const getCategory = id => categories.find(c => c.id === id);
const firstDishOf = categoryId => dishes.find(d => d.category === categoryId);
const language = () => document.documentElement.lang === 'bn' ? 'bn' : 'en';
const tr = key => ui[language()][key] || key;
const name = object => object[language()];
const numbers = value => Number(value).toLocaleString(language() === 'bn' ? 'bn-BD' : 'en-US');
const price = value => `৳${numbers(value)}`;
const description = d => language() === 'bn' ? d.descriptionBn : d.descriptionEn;
const portionLabels = d => language() === 'bn' ? d.portionBn : d.portionEn;
const extraLabels = d => language() === 'bn' ? d.extrasBn : d.extrasEn;
// Category artwork already embedded in the original site (shared global lexical scope).
const siteArt = en => { try { return (typeof cats !== 'undefined' ? cats : []).find(c => c.en === en)?.art || null; } catch { return null; } };

const state = {
 last: getDish(storage.get('last', 'double-smash')) ? storage.get('last', 'double-smash') : 'double-smash',
 favorites: new Set((storage.get('favorites', []) || []).filter(id => getDish(id))),
 cart: (storage.get('cart', []) || []).filter(l => getDish(l.id) && Number.isFinite(l.qty) && l.qty > 0 && l.qty <= 20 && Number.isFinite(l.unitPrice) && Array.isArray(l.extras)),
 orders: storage.get('orders', []) || [],
 fulfil: 'pickup',
};
let viewer = null;
let focusBeforeOpen = null;
const count = () => state.cart.reduce((sum, l) => sum + l.qty, 0);
const subtotal = () => state.cart.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
const fee = () => state.fulfil === 'delivery' && state.cart.length ? 39 : 0;
const total = () => subtotal() + fee();

function notify(text, symbol = 'check') {
 const el = document.createElement('div');
 el.className = 'da-toast';
 el.innerHTML = `${icon(symbol, 15)}<span>${escapeHTML(text)}</span>`;
 document.getElementById('daToasts').append(el);
 setTimeout(() => { el.classList.add('exiting'); setTimeout(() => el.remove(), 220); }, 2400);
}
function persistCart() { storage.set('cart', state.cart); updateCounts(); }
function updateCounts() {
 document.querySelectorAll('.da-site-cart-count,.da-cart-badge').forEach(el => { el.hidden = !count(); el.textContent = numbers(count()); });
 viewer?.root.querySelectorAll('[data-da-action="cart-tab"]').forEach(b => b.setAttribute('aria-label', `${tr('openCart')} · ${numbers(count())} ${tr('unit')}`));
}

/* ---------- Main menu category → straight into the full-screen preview ---------- */
function openCategory(originalName) {
 const category = categories.find(c => c.en === originalName || c.id === originalName);
 const dish = category && firstDishOf(category.id);
 if (!dish) return;
 document.getElementById('categoryModal')?.classList.remove('open');
 if (viewer) { jumpToCategory(category.id); return; }
 const card = [...document.querySelectorAll('.app-view.active [data-cat]')].find(el => el.dataset.cat === category.en);
 openViewer(dish.id, card?.querySelector('.category-illustration') || null);
}
function jumpToCategory(categoryId) {
 if (!viewer) return;
 setCategoryMenu(false);
 if (viewer.cartMode) setCartMode(false);
 const dish = firstDishOf(categoryId);
 if (dish && dish.id !== viewer.id) rotateTo(dish.id);
}
function toggleFavorite(id) {
 if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
 storage.set('favorites', [...state.favorites]);
 document.querySelectorAll(`[data-da-favorite="${id}"]`).forEach(el => { el.classList.toggle('saved', state.favorites.has(id)); el.setAttribute('aria-pressed', String(state.favorites.has(id))); });
}

/* ---------- Markup ---------- */
function siteNavMarkup() {
 const original = document.querySelector('.mobile-nav');
 return original ? original.innerHTML : '';
}
function categoryMenuMarkup() {
 const current = getDish(viewer?.id || state.last)?.category;
 return `<div class="da-cat-menu-head"><strong>${tr('categoryMenu')}</strong><small>${tr('categoryMenuLead')}</small></div><div class="da-cat-grid">${categories.map(c => {
  const art = siteArt(c.en);
  return `<button class="da-cat-item ${c.id === current ? 'active' : ''}" data-da-jump="${c.id}" aria-pressed="${c.id === current}"><span class="da-cat-thumb" style="--tone:${c.tone}">${art ? `<img src="${art}" alt="" draggable="false"/>` : icon(c.icon, 18)}</span><span><b>${escapeHTML(name(c))}</b><small>${numbers(c.listed)} ${tr('unit')}</small></span></button>`;
 }).join('')}</div>`;
}
function viewerMarkup(id, cartMode) {
 const index = dishes.findIndex(d => d.id === id);
 return `<section class="da-experience ${cartMode ? 'da-is-cart' : ''} ${reducedMotion ? 'da-is-paused' : ''}" id="daViewer" role="dialog" aria-modal="true" aria-labelledby="daFoodTitle" style="--da-turn:${-index * 360 / dishes.length}deg">
 <header class="da-exp-header"><button class="da-icon-button" data-da-action="close" aria-label="${tr('close')}">${icon('back', 18)}</button><div class="da-exp-brand"><span class="da-exp-mark">DA</span><span><strong>Da. Appetizer</strong><small>Asian kitchen · Sirajganj</small></span></div><div class="da-exp-header-right"><button class="da-icon-button da-exp-fav" data-da-favorite="${id}" aria-label="${tr('favorite')}" aria-pressed="${state.favorites.has(id)}">${icon('heart', 17)}</button><button class="da-icon-button" data-da-action="categories-menu" aria-label="${tr('openCategories')}" aria-expanded="false" aria-controls="daCatMenu">${icon('grid', 17)}</button></div></header>
 <div class="da-preview-viewport" id="daViewport">
  <div class="da-scene" id="daScene" aria-label="360° menu carousel">
   <div class="da-scene-shadow"></div><div class="da-scene-floor"></div>
   <div class="da-orbit-ring" id="daOrbitRing">${dishes.map((d, i) => `<div class="da-food-tile ${d.id === id ? 'da-current' : ''}" data-da-tile="${d.id}" style="--da-angle:${i * 360 / dishes.length}deg"><div class="da-mini-frame"></div><div class="da-food-tilt"><div class="da-food-bob"><img class="da-food-image" src="${d.image}" alt="${escapeHTML(name(d))} — ${tr('sample')}" draggable="false"/></div></div></div>`).join('')}</div>
   <canvas class="da-steam" id="daSteam" aria-hidden="true"></canvas>
  </div>
  <div class="da-ticker" id="daTicker"></div>
  <div class="da-cat-label" id="daCatLabel"></div>
  <div class="da-food-title" id="daFoodTitleWrap"><h2 id="daFoodTitle"></h2><p>${icon('hand', 11)}<span id="daSwipeHint"></span></p></div>
  <nav class="da-thumb-strip" aria-label="360° menu"><div class="da-thumbs" id="daThumbs">${dishes.map(d => `<button class="da-thumb ${d.id === id ? 'active' : ''}" data-da-slide="${d.id}" aria-label="${escapeHTML(name(d))}" aria-pressed="${d.id === id}"><img src="${d.image}" alt="" draggable="false"/></button>`).join('')}</div></nav>
  <button class="da-side-arrow prev" data-da-action="previous" aria-label="${tr('prev')}">${icon('back', 14)}</button>
  <button class="da-side-arrow next" data-da-action="next" aria-label="${tr('next')}">${icon('arrow', 14)}</button>
  <span class="da-mini-caption" id="daMiniCaption"></span>
 </div>
 <div class="da-price-pill" id="daPricePill" aria-live="polite"></div>
 <button class="da-details-hint" data-da-action="sheet-up" aria-label="${tr('details')}">${icon('arrowUp', 16)}<span>${tr('details')}</span></button>
 <button class="da-cart-fab" data-da-action="cart-tab">${icon('bag', 22)}<span class="da-cart-badge" hidden></span></button>
 <button class="da-cat-fab" data-da-action="categories-menu-bottom" aria-label="${tr('openCategories')}" aria-expanded="false" aria-controls="daCatMenu">${icon('grid', 20)}</button>
 <nav class="da-site-nav" aria-label="Main navigation">${siteNavMarkup()}</nav>
 <section class="da-info-panel" id="daInfoPanel" aria-label="${tr('details')}"></section>
 <section class="da-cart-sheet" id="daCartSheet" aria-label="${tr('cart')}"></section>
 <div class="da-cat-scrim" data-da-action="categories-close"></div>
 <div class="da-cat-menu" id="daCatMenu" role="dialog" aria-label="${tr('categoryMenu')}"></div>
</section>`;
}
function shuffle(list) {
 const a = [...list];
 for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
 return a;
}
function renderTicker() {
 if (!viewer) return;
 const ticker = viewer.root.querySelector('#daTicker');
 const group = (copy) => `<div class="da-ticker-group" ${copy ? 'aria-hidden="true"' : ''}>${viewer.tickerOrder.map(id => {
  const d = getDish(id);
  return `<button class="da-tick ${id === viewer.id ? 'active' : ''}" data-da-slide="${id}" ${copy ? 'tabindex="-1"' : ''} aria-label="${escapeHTML(name(d))}"><img src="${d.image}" alt="" draggable="false"/><span>${escapeHTML(name(d))}</span></button>`;
 }).join('')}</div>`;
 ticker.innerHTML = `<div class="da-ticker-track">${group(false)}${group(true)}</div>`;
 const width = ticker.querySelector('.da-ticker-group').scrollWidth;
 ticker.style.setProperty('--da-ticker-dur', `${Math.max(18, width / 34).toFixed(1)}s`);
}
const selectedImage = () => viewer?.root.querySelector(`[data-da-tile="${viewer.id}"] .da-food-image`);
const selectedTilt = () => viewer?.root.querySelector(`[data-da-tile="${viewer.id}"] .da-food-tilt`);
function unitPrice() {
 const d = getDish(viewer.id);
 return (viewer.portion ? d.large : d.price) + [...viewer.extras].reduce((sum, i) => sum + d.extraPrices[i], 0);
}
function infoMarkup() {
 const d = getDish(viewer.id);
 const effect = (action, on, sym) => `<button class="da-effect-button" data-da-action="${action}" aria-pressed="${on}">${icon(sym, 11)}<span>${tr(action === 'motion' ? 'motion' : 'steam')} ${tr(on ? 'on' : 'off')}</span></button>`;
 return `<button class="da-sheet-handle" data-da-action="sheet-down" aria-label="${tr('closeDetails')}"><span></span></button>
 <div class="da-info-scroll"><div class="da-info-heading"><div><span class="da-info-demo">${tr('sample')}</span><h1 id="daFoodName">${escapeHTML(name(d))}</h1></div><div class="da-price-block"><small>${tr('samplePrice')}</small><strong>${price(unitPrice())}</strong></div></div>
 <p class="da-description">${escapeHTML(description(d))}</p>
 <h2 class="da-option-heading">${tr('portion')}</h2><div class="da-portions" role="group" aria-label="${tr('portion')}">${portionLabels(d).map((label, i) => `<button class="da-portion ${viewer.portion === i ? 'selected' : ''}" data-da-portion="${i}" aria-pressed="${viewer.portion === i}"><i class="da-option-dot" aria-hidden="true"></i><span>${escapeHTML(label)}</span><strong>${price(i ? d.large : d.price)}</strong></button>`).join('')}</div>
 <h2 class="da-option-heading">${tr('spice')}</h2><div class="da-spice-options" role="group" aria-label="${tr('spice')}">${['mild', 'medium', 'hotSpice'].map((s, i) => `<button class="da-spice ${viewer.spice === i ? 'selected' : ''}" data-da-spice="${i}" aria-pressed="${viewer.spice === i}">${icon(i ? 'pepper' : 'leaf', 11)}${tr(s)}</button>`).join('')}</div>
 <h2 class="da-option-heading">${tr('extras')}</h2><div class="da-extra-options" role="group" aria-label="${tr('extras')}">${extraLabels(d).map((label, i) => `<button class="da-extra ${viewer.extras.has(i) ? 'selected' : ''}" data-da-extra="${i}" aria-pressed="${viewer.extras.has(i)}"><span>${escapeHTML(label)}<small>+${price(d.extraPrices[i])}</small></span><span class="da-check-square" aria-hidden="true">${viewer.extras.has(i) ? icon('check', 9) : ''}</span></button>`).join('')}</div>
 <div class="da-effects-row"><span>${icon('info', 11)}${tr('safety')}</span><div class="da-effects">${effect('motion', viewer.motion, viewer.motion ? 'pause' : 'play')}${effect('steam', viewer.steam, 'steam')}</div></div></div>
 <div class="da-item-action"><div class="da-quantity" aria-label="${tr('qty')}"><button data-da-action="less" aria-label="−1" ${viewer.qty <= 1 ? 'disabled' : ''}>${icon('minus', 12)}</button><span aria-live="polite">${numbers(viewer.qty)}</span><button data-da-action="more" aria-label="+1" ${viewer.qty >= 20 ? 'disabled' : ''}>${icon('plus', 12)}</button></div><button class="da-add-button" data-da-action="add"><span>${icon('bag', 16)}${tr('add')}</span><strong>${price(unitPrice() * viewer.qty)}</strong></button><button class="da-sheet-cart" data-da-action="cart-tab">${icon('bag', 18)}<span class="da-cart-badge" ${count() ? '' : 'hidden'}>${numbers(count())}</span></button></div>`;
}
function renderInfo(focusSelector = null) {
 if (!viewer) return;
 const panel = viewer.root.querySelector('#daInfoPanel');
 const scroll = panel.querySelector('.da-info-scroll')?.scrollTop || 0;
 panel.innerHTML = infoMarkup();
 panel.querySelector('.da-info-scroll').scrollTop = scroll;
 renderPrice();
 updateCounts();
 if (focusSelector) panel.querySelector(focusSelector)?.focus({preventScroll: true});
}
function renderPrice() {
 if (!viewer) return;
 viewer.root.querySelector('#daPricePill').innerHTML = `<small>${tr('samplePrice')}</small><strong>${price(unitPrice())}</strong>`;
}
function updateSelection(animateTitle = false) {
 if (!viewer) return;
 const d = getDish(viewer.id), c = getCategory(d.category);
 viewer.root.style.setProperty('--da-turn', `${-viewer.step * 360 / dishes.length}deg`);
 viewer.root.querySelectorAll('[data-da-tile]').forEach((tile, i) => {
  const distance = Math.min((i - viewer.index + dishes.length) % dishes.length, (viewer.index - i + dishes.length) % dishes.length);
  tile.classList.toggle('da-current', tile.dataset.daTile === viewer.id);
  tile.setAttribute('aria-hidden', String(tile.dataset.daTile !== viewer.id));
  tile.style.opacity = distance === 0 ? '1' : distance === 1 ? '.16' : distance === 2 ? '.025' : '0';
 });
 viewer.root.querySelector('#daCatLabel').innerHTML = `<span class="da-cat-label-chip">${icon(c.icon, 14)}${escapeHTML(name(c))}</span><span class="da-cat-label-count">${String(viewer.index + 1).padStart(2, '0')} / ${dishes.length}</span>`;
 const title = viewer.root.querySelector('#daFoodTitle');
 title.textContent = name(d);
 viewer.root.querySelector('#daSwipeHint').textContent = `${tr('sample')} · ${tr('swipeShort')}`;
 viewer.root.querySelector('#daMiniCaption').textContent = name(d);
 if (animateTitle && !reducedMotion) {
  const wrap = viewer.root.querySelector('#daFoodTitleWrap');
  wrap.classList.remove('da-swap'); void wrap.offsetWidth; wrap.classList.add('da-swap');
 }
 viewer.root.querySelectorAll('.da-tick').forEach(t => t.classList.toggle('active', t.dataset.daSlide === viewer.id));
 viewer.root.querySelectorAll('.da-thumb').forEach(t => { const on = t.dataset.daSlide === viewer.id; t.classList.toggle('active', on); t.setAttribute('aria-pressed', String(on)); t.setAttribute('aria-label', name(getDish(t.dataset.daSlide))); });
 centerThumb();
 const fav = viewer.root.querySelector('.da-exp-fav');
 fav.dataset.daFavorite = viewer.id; fav.classList.toggle('saved', state.favorites.has(viewer.id)); fav.setAttribute('aria-pressed', String(state.favorites.has(viewer.id)));
 viewer.root.querySelector('#daCatMenu').innerHTML = categoryMenuMarkup();
 renderPrice();
}

function centerThumb(smooth = true) {
 const strip = viewer?.root.querySelector('#daThumbs'), thumb = strip?.querySelector('.da-thumb.active');
 if (!thumb) return;
 const left = thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2;
 strip.scrollTo({left: Math.max(0, left), behavior: smooth && !reducedMotion ? 'smooth' : 'instant'});
}

/* ---------- Geometry (single source of truth for every state) ---------- */
function resizeScene() {
 if (!viewer) return;
 const W = window.innerWidth, H = window.innerHeight;
 const landscape = W <= 900 && H <= 500;
 const phone = W <= 760 && !landscape;
 const short = H <= 700;
 const vars = {};
 let headerH, vpTop, vpW, vpH, ringY, size, labelH, tickerH = 0;
 if (phone) {
  headerH = short ? 56 : 64;
  const navSpace = 10 + 66 + 12;            // the site's nav + gap
  const rowH = 56;
  const sheetH = Math.round(Math.min(short ? 440 : 500, H - (short ? 170 : 220)));
  vars['--da-sheet-h'] = `${sheetH}px`;
  vars['--da-row-bottom'] = `${navSpace}px`;
  vars['--da-hint-bottom'] = `${navSpace + 8}px`;
  vars['--da-row-bottom-low'] = 'calc(14px + env(safe-area-inset-bottom))';
  vars['--da-hint-bottom-low'] = 'calc(22px + env(safe-area-inset-bottom))';
  vars['--da-side'] = W <= 370 ? '15px' : '18px';
  vpTop = headerH; vpW = W;
  labelH = short ? 38 : 46; tickerH = short ? 36 : 42;
  if (viewer.cartMode) {
   vpH = short ? 158 : 180; size = Math.min(148, vpH * .82); ringY = vpH * .47;
   vars['--da-cart-top'] = `${headerH + vpH + 12}px`;
  } else if (viewer.sheet) {
   vpH = H - headerH - sheetH; ringY = labelH + (vpH - labelH) / 2;
   size = Math.min(W * .8, (vpH - labelH) * .94, 360);
  } else {
   const titleH = short ? 42 : 60, sliderH = short ? 46 : 58;
   vars['--da-title-h'] = `${titleH}px`; vars['--da-slider-h'] = `${sliderH}px`;
   vpH = H - headerH - (navSpace + rowH + 6);
   const foodSpace = vpH - tickerH - labelH - titleH - sliderH;
   ringY = tickerH + labelH + foodSpace / 2;
   size = Math.min(W * .9, foodSpace * .98, 420);
  }
 } else if (landscape) {
  headerH = 50; labelH = 30; tickerH = 30;
  vars['--da-row-bottom'] = '10px'; vars['--da-side'] = '14px'; vars['--da-hint-bottom'] = '70px';
  vars['--da-row-bottom-low'] = '10px'; vars['--da-hint-bottom-low'] = '14px';
  vpTop = headerH;
  if (viewer.cartMode) { vpW = W * .4; vpH = H - headerH - 30; const fullSize = Math.min(W * .4, (H - headerH - 66 - tickerH - labelH - 72) * .98); size = Math.min(vpW * .36, vpH * .4, fullSize * .72); ringY = vpH * .45; }
  else if (viewer.sheet) { vpW = W * .49; vpH = H - headerH - 10; ringY = labelH + (vpH - labelH) / 2; size = Math.min(vpW * .8, (vpH - labelH) * .92); }
  else { vpW = W; vpH = H - headerH - 66; const titleH = 32, sliderH = 40; vars['--da-title-h'] = `${titleH}px`; vars['--da-slider-h'] = `${sliderH}px`; const fs = vpH - tickerH - labelH - titleH - sliderH; ringY = tickerH + labelH + fs / 2; size = Math.min(W * .4, fs * .98); }
 } else {
  headerH = 78; labelH = 52; tickerH = 46;
  vars['--da-row-bottom'] = '26px'; vars['--da-side'] = '28px'; vars['--da-hint-bottom'] = '100px';
  vars['--da-row-bottom-low'] = '26px'; vars['--da-hint-bottom-low'] = '34px';
  vpTop = headerH;
  if (viewer.cartMode) { vpW = W * .43; vpH = H - headerH - 120; size = Math.min(210, vpW * .55); ringY = vpH * .45; }
  else if (viewer.sheet) { vpW = W * (W <= 1000 ? .52 : .58); vpH = H - headerH - 20; ringY = labelH + (vpH - labelH) / 2; size = Math.min(vpW * .8, (vpH - labelH) * .9, 520); }
  else { vpW = W; vpH = H - headerH - 150; const titleH = 66, sliderH = 58; vars['--da-title-h'] = `${titleH}px`; vars['--da-slider-h'] = `${sliderH}px`; const fs = vpH - tickerH - labelH - titleH - sliderH; ringY = tickerH + labelH + fs / 2; size = Math.min(W * .44, fs * .98, 560); }
 }
 Object.assign(vars, {
  '--da-header-h': `${headerH}px`, '--da-vp-top': `${vpTop}px`, '--da-vp-w': `${Math.round(vpW)}px`, '--da-vp-h': `${Math.round(vpH)}px`,
  '--da-ring-y': `${Math.round(ringY)}px`, '--da-size': `${Math.max(78, Math.round(size))}px`, '--da-label-h': `${labelH}px`, '--da-ticker-h': `${tickerH}px`,
  '--da-radius': `${Math.round(Math.max(vpW, 320) * (phone ? 1.1 : .87))}px`,
 });
 for (const [k, v] of Object.entries(vars)) viewer.root.style.setProperty(k, v);
}

/* ---------- Open / close ---------- */
function openViewer(id, source = null, cartMode = false) {
 if (viewer || !getDish(id)) return;
 focusBeforeOpen = document.activeElement;
 const sourceRect = source?.getBoundingClientRect();
 mount.innerHTML = viewerMarkup(id, cartMode);
 const root = mount.firstElementChild;
 const index = dishes.findIndex(d => d.id === id);
 viewer = {id, index, step: index, root, cartMode, sheet: false, catMenu: false, catFromBottom: false, navAway: false, navHover: false, navFocus: false, tickerOrder: shuffle(dishes.map(d => d.id)), portion: 0, spice: 1, qty: 1, extras: new Set(), motion: !reducedMotion, steam: !reducedMotion, ready: false, flight: null, confirmed: null, timers: {}};
 state.last = id; storage.set('last', id);
 document.body.classList.add('da-preview-open');
 document.querySelector('main').inert = true;
 renderTicker(); updateSelection(); renderInfo(); renderCart(); resizeScene(); applyInert(); updateCounts(); centerThumb(false);
 bindNavAutoHide(root); scheduleNavHide();
 const ring = root.querySelector('#daOrbitRing'); ring.style.transition = 'none';
 const canvas = root.querySelector('#daSteam');
 viewer.steamEngine = new Steam(canvas, {light: true, strength: 1.02, origin: () => {
  if (!viewer || !viewer.ready) return null;
  const img = selectedImage(), r = img.getBoundingClientRect(), c = canvas.getBoundingClientRect(), d = getDish(viewer.id);
  return {x: r.left + r.width * .5 - c.left, y: r.top + r.height * d.steamY - c.top, spread: r.width * .27};
 }});
 viewer.steamEngine.setEnabled(false);
 viewer.resizeObserver = new ResizeObserver(() => resizeScene());
 viewer.resizeObserver.observe(root);
 bindGestures(root);
 bindSheetDrag(root.querySelector('#daInfoPanel'), '.da-info-scroll', () => setSheet(false));
 bindSheetDrag(root.querySelector('#daCartSheet'), '.da-cart-body', () => setCartMode(false));
 const thisViewer = viewer;
 requestAnimationFrame(() => requestAnimationFrame(() => {
  if (viewer !== thisViewer) return;
  root.classList.add('is-open'); ring.style.transition = '';
  const image = selectedImage();
  if (sourceRect && sourceRect.width && !reducedMotion && !cartMode) {
   image.style.opacity = '0';
   const target = image.getBoundingClientRect();
   const ghost = document.createElement('img');
   ghost.className = 'da-flight'; ghost.src = getDish(id).image; ghost.alt = ''; ghost.setAttribute('aria-hidden', 'true');
   Object.assign(ghost.style, {left: sourceRect.left + 'px', top: sourceRect.top + 'px', width: sourceRect.width + 'px', height: sourceRect.height + 'px'});
   document.body.append(ghost); source.style.opacity = '0';
   const animation = ghost.animate([
    {left: sourceRect.left + 'px', top: sourceRect.top + 'px', width: sourceRect.width + 'px', height: sourceRect.height + 'px', transform: 'rotate(-4deg)'},
    {left: target.left + 'px', top: target.top + 'px', width: target.width + 'px', height: target.height + 'px', transform: 'rotate(-2deg)'},
   ], {duration: 760, easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'forwards'});
   viewer.flight = {ghost, animation, source, image};
   animation.onfinish = () => { ghost.remove(); source.style.opacity = ''; image.style.opacity = ''; if (viewer === thisViewer) { viewer.flight = null; viewer.ready = true; viewer.steamEngine.setEnabled(viewer.steam); } };
  } else { viewer.ready = true; viewer.steamEngine.setEnabled(viewer.steam); }
  root.querySelector('[data-da-action="close"]').focus({preventScroll: true});
 }));
}
function cancelFlight() {
 if (!viewer?.flight) return;
 const {ghost, animation, source, image} = viewer.flight;
 animation.cancel(); ghost.remove(); if (source) source.style.opacity = ''; if (image) image.style.opacity = '';
 viewer.flight = null; viewer.ready = true;
}
function closeViewer() {
 if (!viewer) return;
 cancelFlight();
 Object.values(viewer.timers).forEach(clearTimeout);
 const old = viewer; viewer = null;
 old.steamEngine.destroy(); old.resizeObserver.disconnect();
 old.root.classList.remove('is-open'); old.root.classList.add('is-closing');
 setTimeout(() => {
  old.root.remove();
  document.body.classList.remove('da-preview-open');
  document.querySelector('main').inert = false;
  if (focusBeforeOpen?.isConnected) focusBeforeOpen.focus({preventScroll: true});
 }, reducedMotion ? 0 : 330);
}

/* ---------- State changes ---------- */
function pauseSteamDuringTransition(key = 'steam') {
 if (!viewer) return;
 viewer.steamEngine.setEnabled(false);
 clearTimeout(viewer.timers[key]);
 const current = viewer;
 viewer.timers[key] = setTimeout(() => { if (viewer === current && viewer.ready) viewer.steamEngine.setEnabled(viewer.steam); }, reducedMotion ? 0 : 760);
}
function applyInert() {
 if (!viewer) return;
 const r = viewer.root, up = viewer.sheet && !viewer.cartMode;
 r.querySelector('#daInfoPanel').inert = !up;
 r.querySelector('#daCartSheet').inert = !viewer.cartMode;
 const hidden = up || viewer.cartMode;
 [r.querySelector('#daPricePill'), r.querySelector('.da-details-hint')].forEach(el => { el.inert = hidden; });
 r.querySelector('.da-site-nav').inert = hidden || viewer.navAway;
 r.querySelector('.da-cart-fab').inert = hidden || !viewer.navAway;   // cart shows when the nav has gone
 r.querySelector('.da-cat-fab').inert = hidden || viewer.navAway;     // categories show while the nav is up
 r.querySelector('#daTicker').inert = hidden;
 r.querySelectorAll('.da-side-arrow').forEach(el => { el.inert = viewer.cartMode; });
 r.querySelector('.da-thumb-strip').inert = up || viewer.cartMode;
 r.querySelector('#daCatMenu').inert = !viewer.catMenu;
}
function setNavAway(value) {
 if (!viewer) return;
 viewer.navAway = value;
 viewer.root.classList.toggle('da-nav-away', value);
 applyInert();
}
function scheduleNavHide() {
 if (!viewer) return;
 clearTimeout(viewer.timers.nav);
 const current = viewer;
 viewer.timers.nav = setTimeout(() => {
  if (viewer !== current) return;
  if (viewer.catMenu || viewer.navHover || viewer.navFocus || viewer.sheet || viewer.cartMode) { scheduleNavHide(); return; }
  setNavAway(true);
 }, 2000);
}
function showNav() { if (!viewer) return; setNavAway(false); scheduleNavHide(); }
function bindNavAutoHide(root) {
 const nav = root.querySelector('.da-site-nav'), catFab = root.querySelector('.da-cat-fab');
 // Any touch on the preview brings the nav back — except on the bottom buttons themselves,
 // so a tap on the cart button is never swapped out from under the finger.
 root.addEventListener('pointerdown', e => {
  if (!viewer || viewer.sheet || viewer.cartMode || viewer.catMenu) return;
  if (e.target.closest('.da-cart-fab,.da-cat-fab,.da-price-pill,.da-details-hint,.da-info-panel,.da-cart-sheet,.da-cat-menu')) return;
  showNav();
 }, true);
 for (const el of [nav, catFab]) {
  el.addEventListener('pointerenter', e => { if (viewer && e.pointerType === 'mouse') viewer.navHover = true; });
  el.addEventListener('pointerleave', e => { if (viewer && e.pointerType === 'mouse') { viewer.navHover = false; scheduleNavHide(); } });
  el.addEventListener('focusin', e => { if (viewer && e.target.matches(':focus-visible')) { viewer.navFocus = true; setNavAway(false); } });
  el.addEventListener('focusout', () => { if (viewer) { viewer.navFocus = false; scheduleNavHide(); } });
 }
}
function setSheet(value) {
 if (!viewer || viewer.cartMode || viewer.sheet === value) return;
 cancelFlight();
 viewer.sheet = value;
 viewer.root.classList.toggle('da-sheet-up', value);
 applyInert(); resizeScene(); pauseSteamDuringTransition();
 if (!value) showNav();
}
function setCartMode(value) {
 if (!viewer || viewer.cartMode === value) return;
 cancelFlight(); setCategoryMenu(false);
 viewer.cartMode = value;
 if (value && !viewer.confirmed) renderCart();
 viewer.root.classList.toggle('da-is-cart', value);
 applyInert(); resizeScene(); pauseSteamDuringTransition();
 if (value) viewer.root.querySelector('.da-cart-close')?.focus({preventScroll: true});
 else if (!viewer.sheet) showNav();
}
function setCategoryMenu(value, fromBottom = false) {
 if (!viewer || viewer.catMenu === value) return;
 viewer.catMenu = value;
 if (value) { viewer.catFromBottom = fromBottom; viewer.root.classList.toggle('da-cat-bottom', fromBottom); }
 viewer.root.classList.toggle('da-cat-open', value);
 viewer.root.querySelector('[data-da-action="categories-menu"]').setAttribute('aria-expanded', String(value && !viewer.catFromBottom));
 viewer.root.querySelector('[data-da-action="categories-menu-bottom"]').setAttribute('aria-expanded', String(value && viewer.catFromBottom));
 applyInert();
 if (!value) scheduleNavHide();
 if (value) viewer.root.querySelector('.da-cat-item.active, .da-cat-item')?.focus({preventScroll: true});
}
function rotateTo(id, line = null) {
 if (!viewer || !getDish(id)) return;
 cancelFlight();
 const tilt = selectedTilt(); if (tilt) tilt.style.transform = '';
 const next = dishes.findIndex(d => d.id === id);
 let distance = (next - viewer.index + dishes.length) % dishes.length;
 if (distance > dishes.length / 2) distance -= dishes.length;
 viewer.step += distance; viewer.index = next; viewer.id = id;
 viewer.portion = line?.portionIndex || 0; viewer.spice = line?.spiceIndex ?? 1; viewer.extras = new Set(line?.extras || []); viewer.qty = line?.qty || 1;
 viewer.steamEngine.setEnabled(false); viewer.steamEngine.reset();
 state.last = id; storage.set('last', id);
 updateSelection(true); renderInfo();
 pauseSteamDuringTransition('rotate');
}
function nextDish(direction) { if (!viewer) return; rotateTo(dishes[(viewer.index + direction + dishes.length) % dishes.length].id); }

/* ---------- Gestures ----------
   Scene: slow drag = tilt the food · fast horizontal swipe = 360° carousel
   Anywhere outside the panels: swipe up = details rise · swipe down = details go down */
let suppressClickUntil = 0;
function bindGestures(root) {
 let g = null;
 root.addEventListener('pointerdown', e => {
  if (!viewer || e.button > 0 || viewer.catMenu) return;
  if (e.target.closest('.da-info-panel,.da-cart-sheet,.da-cat-menu,.da-exp-header,.da-site-nav')) return;
  g = {x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, scene: !!e.target.closest('.da-scene'), moved: false};
  if (g.scene && !viewer.cartMode) { cancelFlight(); root.classList.add('da-is-dragging'); }
 });
 const move = e => {
  if (!viewer) return;
  if (g && e.pointerId === g.id) {
   const dx = e.clientX - g.x, dy = e.clientY - g.y;
   if (Math.hypot(dx, dy) > 8) g.moved = true;
   if (g.scene && !viewer.cartMode) selectedTilt().style.transform = `rotateY(${Math.max(-32, Math.min(32, dx * .19))}deg) rotateX(${Math.max(-15, Math.min(15, -dy * .11))}deg)`;
  } else if (!g && e.pointerType === 'mouse' && !viewer.cartMode && e.target.closest?.('.da-scene')) {
   const r = root.querySelector('.da-scene').getBoundingClientRect();
   selectedTilt().style.transform = `rotateY(${(e.clientX - r.left - r.width / 2) / r.width * 8}deg) rotateX(${-(e.clientY - r.top - r.height / 2) / r.height * 5}deg)`;
  }
 };
 const end = e => {
  if (!viewer || !g || e.pointerId !== g.id) return;
  const dx = e.clientX - g.x, dy = e.clientY - g.y, elapsed = Math.max(1, performance.now() - g.t);
  const tilt = selectedTilt(); if (tilt) tilt.style.transform = '';
  root.classList.remove('da-is-dragging');
  const wasScene = g.scene, moved = g.moved; g = null;
  if (e.type === 'pointercancel') return;
  if (moved) suppressClickUntil = performance.now() + 350;
  const horizontal = Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) / elapsed > .28;
  const vertical = Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.3 && (Math.abs(dy) / elapsed > .2 || Math.abs(dy) > 120);
  if (viewer.cartMode) {
   if (!moved && wasScene) setCartMode(false);          // tap the floating food → back to preview
   return;
  }
  if (horizontal && wasScene) nextDish(dx < 0 ? 1 : -1);
  else if (vertical) setSheet(dy < 0);
 };
 window.addEventListener('pointermove', move);
 window.addEventListener('pointerup', end);
 window.addEventListener('pointercancel', end);
 root.addEventListener('pointerleave', () => { if (viewer && !g && !viewer.cartMode) { const t = selectedTilt(); if (t) t.style.transform = ''; } });
 root.addEventListener('click', e => { if (performance.now() < suppressClickUntil && !e.target.closest('.da-info-panel,.da-cart-sheet,.da-cat-menu')) { e.preventDefault(); e.stopPropagation(); } }, true);
 // Mouse wheel / trackpad: scroll down = details up, scroll up = details down.
 let acc = 0, accTimer = 0, lockUntil = 0;
 root.addEventListener('wheel', e => {
  if (!viewer || viewer.catMenu) return;
  const scroller = e.target.closest('.da-info-scroll,.da-cart-body');
  if (scroller) {
   if (e.deltaY > 0 && scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1) return;
   if (e.deltaY < 0 && scroller.scrollTop > 0) return;
  }
  acc += e.deltaY; clearTimeout(accTimer); accTimer = setTimeout(() => { acc = 0; }, 220);
  const now = performance.now(); if (now < lockUntil) return;
  if (acc > 45) { acc = 0; lockUntil = now + 650; if (!viewer.cartMode) setSheet(true); }
  else if (acc < -45) { acc = 0; lockUntil = now + 650; if (viewer.cartMode) setCartMode(false); else setSheet(false); }
 }, {passive: true});
}
// Pull a sheet down (from its top, or when its content is scrolled to the top) to close it.
function bindSheetDrag(panel, scrollerSelector, onClose) {
 let s = null;
 panel.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) return;
  const scroller = panel.querySelector(scrollerSelector);
  const grip = !!e.target.closest('.da-sheet-handle,.da-cart-header,.da-info-heading');
  s = {x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(), grip, dragging: false, allow: grip || !scroller || scroller.scrollTop <= 0, dy: 0};
 }, {passive: true});
 panel.addEventListener('touchmove', e => {
  if (!s || !s.allow) return;
  const dx = e.touches[0].clientX - s.x, dy = e.touches[0].clientY - s.y;
  if (!s.dragging) {
   if (dy > 8 && dy > Math.abs(dx)) {
    const scroller = panel.querySelector(scrollerSelector);
    if (!s.grip && scroller && scroller.scrollTop > 0) { s.allow = false; return; }
    s.dragging = true; panel.classList.add('da-dragging-sheet');
   } else if (dy < -8 || Math.abs(dx) > 12) { s.allow = false; return; } else return;
  }
  e.preventDefault();
  s.dy = Math.max(0, dy);
  panel.style.transform = `translateY(${s.dy}px)`;
 }, {passive: false});
 const finish = () => {
  if (!s) return;
  const {dragging, dy, t} = s; s = null;
  if (!dragging) return;
  panel.classList.remove('da-dragging-sheet'); panel.style.transform = '';
  if (dy > 90 || dy / Math.max(1, performance.now() - t) > .5) onClose();
 };
 panel.addEventListener('touchend', finish);
 panel.addEventListener('touchcancel', finish);
}

/* ---------- Cart ---------- */
function addCurrentDish() {
 if (!viewer) return;
 const d = getDish(viewer.id), extras = [...viewer.extras].sort((a, b) => a - b);
 const key = [d.id, viewer.portion, viewer.spice, extras.join('.')].join('-');
 const existing = state.cart.find(l => l.key === key);
 if (existing && existing.qty + viewer.qty > 20) { notify(language() === 'bn' ? 'একই আইটেম সর্বোচ্চ ২০টি নেওয়া যাবে।' : 'A maximum of 20 per configuration.', 'info'); return; }
 if (existing) existing.qty += viewer.qty;
 else state.cart.push({key, id: d.id, portionIndex: viewer.portion, spiceIndex: viewer.spice, extras, qty: viewer.qty, unitPrice: unitPrice()});
 viewer.confirmed = null; persistCart(); renderCart();
 notify(`${numbers(viewer.qty)} × ${name(d)} · ${tr('added')}`, 'bag');
}
function lineMarkup(line, index) {
 const d = getDish(line.id);
 return `<article class="da-cart-line"><button class="da-line-photo-button" data-da-line-preview="${index}" aria-label="${tr('viewItem')}"><img src="${d.image}" alt="${escapeHTML(name(d))}"/></button><div class="da-line-info"><h3>${escapeHTML(name(d))}</h3><p class="da-line-details">${escapeHTML(portionLabels(d)[line.portionIndex])} · ${tr(['mild', 'medium', 'hotSpice'][line.spiceIndex])}${line.extras.length ? `<br>+ ${line.extras.map(i => escapeHTML(extraLabels(d)[i])).join(', ')}` : ''}</p><div class="da-line-controls"><strong>${price(line.unitPrice * line.qty)}</strong><div class="da-quantity"><button data-da-line-less="${index}" aria-label="−1">${icon(line.qty === 1 ? 'trash' : 'minus', 11)}</button><span>${numbers(line.qty)}</span><button data-da-line-more="${index}" aria-label="+1" ${line.qty >= 20 ? 'disabled' : ''}>${icon('plus', 11)}</button></div></div></div></article>`;
}
function cartMarkup() {
 const close = `<button class="da-cart-close" data-da-action="cart-close" aria-label="${tr('backPreview')}">${icon('down', 16)}</button>`;
 if (viewer.confirmed) {
  const order = viewer.confirmed;
  return `<header class="da-cart-header"><div><h2>${tr('receipt')}</h2></div><div class="da-cart-header-actions">${close}</div></header><div class="da-cart-body"><div class="da-saved-order"><span class="da-saved-check">${icon('check', 27)}</span><h3>${tr('saved')}</h3><p>${tr('savedCopy')}</p><div class="da-receipt"><span>${tr('receipt')}<br><strong>${order.reference}</strong></span><strong>${price(order.total)}</strong></div><button data-da-action="continue">${tr('continue')}${icon('arrow', 15)}</button></div></div>`;
 }
 const header = `<header class="da-cart-header"><div><h2>${tr('cartTitle')}</h2><p>${numbers(count())} ${tr('unit')} · ${tr('cartLead')}</p></div><div class="da-cart-header-actions">${state.cart.length ? `<button class="da-cart-clear" data-da-action="clear-cart">${tr('clear')}</button>` : ''}${close}</div></header>`;
 if (!state.cart.length) return header + `<div class="da-cart-body"><div class="da-empty-cart"><span class="da-empty-icon">${icon('bag', 28)}</span><h3>${tr('empty')}</h3><p>${tr('emptyCopy')}</p><button data-da-action="add">${icon('plus', 15)}${tr('emptyAdd')}</button></div></div><footer class="da-cart-footer"><p class="da-cart-disclaimer">${tr('disclaimer')}</p></footer>`;
 return header + `<div class="da-cart-body"><div class="da-fulfil" role="group" aria-label="Demo fulfilment"><button class="${state.fulfil === 'pickup' ? 'active' : ''}" data-da-fulfil="pickup" aria-pressed="${state.fulfil === 'pickup'}">${icon('bag', 14)}${tr('pickup')}</button><button class="${state.fulfil === 'delivery' ? 'active' : ''}" data-da-fulfil="delivery" aria-pressed="${state.fulfil === 'delivery'}">${icon('truck', 14)}${tr('delivery')}</button></div>${state.cart.map(lineMarkup).join('')}</div><footer class="da-cart-footer"><div class="da-summary-row"><span>${tr('subtotal')}</span><span>${price(subtotal())}</span></div><div class="da-summary-row"><span>${tr('charge')}</span><span>${fee() ? price(fee()) : tr('free')}</span></div><div class="da-summary-total"><span>${tr('grandTotal')}</span><strong>${price(total())}</strong></div><button class="da-save-order" data-da-action="save-order"><span>${tr('save')}</span>${icon('arrow', 16)}</button><p class="da-cart-disclaimer">${tr('disclaimer')}</p><a class="da-real-order-link" href="${liveMenuURL}" target="_blank" rel="noopener">${tr('realOrder')} ↗</a></footer>`;
}
function renderCart(focusSelector = null) {
 if (!viewer) return;
 const sheet = viewer.root.querySelector('#daCartSheet');
 const scroll = sheet.querySelector('.da-cart-body')?.scrollTop || 0;
 sheet.innerHTML = cartMarkup();
 const body = sheet.querySelector('.da-cart-body'); if (body) body.scrollTop = scroll;
 if (focusSelector) sheet.querySelector(focusSelector)?.focus({preventScroll: true});
}
function saveDemoOrder() {
 if (!viewer || !state.cart.length) return;
 const order = {reference: `DA-${Date.now().toString(36).slice(-5).toUpperCase()}`, date: new Date().toISOString(), lines: JSON.parse(JSON.stringify(state.cart)), total: total(), fulfil: state.fulfil, demo: true};
 state.orders.unshift(order); storage.set('orders', state.orders);
 state.cart = []; persistCart(); viewer.confirmed = order; renderCart();
 viewer.root.querySelector('[data-da-action="continue"]').focus({preventScroll: true});
}

/* ---------- One delegated handler for the site and the viewer ---------- */
document.addEventListener('click', e => {
 // The site's own navigation inside the preview: leave the preview, then go there.
 const siteNav = e.target.closest('.da-site-nav [data-view]');
 if (siteNav && viewer) { const view = siteNav.dataset.view; closeViewer(); window.showView?.(view); return; }
 if (viewer?.catMenu && !e.target.closest('.da-cat-menu,[data-da-action="categories-menu"],[data-da-action="categories-menu-bottom"]')) { setCategoryMenu(false); return; }
 const b = e.target.closest('[data-da-action],[data-da-favorite],[data-da-jump],[data-da-slide],[data-da-portion],[data-da-extra],[data-da-spice],[data-da-line-more],[data-da-line-less],[data-da-line-preview],[data-da-fulfil]');
 if (!b) return;
 if (b.dataset.daFavorite) { toggleFavorite(b.dataset.daFavorite); return; }
 if (b.dataset.daJump) { jumpToCategory(b.dataset.daJump); return; }
 if (b.dataset.daSlide) { rotateTo(b.dataset.daSlide); return; }
 if (b.dataset.daPortion !== undefined && viewer) { viewer.portion = Number(b.dataset.daPortion); renderInfo(`[data-da-portion="${b.dataset.daPortion}"]`); return; }
 if (b.dataset.daExtra !== undefined && viewer) { const i = Number(b.dataset.daExtra); viewer.extras.has(i) ? viewer.extras.delete(i) : viewer.extras.add(i); renderInfo(`[data-da-extra="${i}"]`); return; }
 if (b.dataset.daSpice !== undefined && viewer) { viewer.spice = Number(b.dataset.daSpice); renderInfo(`[data-da-spice="${viewer.spice}"]`); return; }
 if (b.dataset.daLineMore !== undefined) { const i = Number(b.dataset.daLineMore); if (state.cart[i]?.qty < 20) state.cart[i].qty++; persistCart(); renderCart(`[data-da-line-more="${i}"]`); return; }
 if (b.dataset.daLineLess !== undefined) { const i = Number(b.dataset.daLineLess); if (state.cart[i]?.qty > 1) state.cart[i].qty--; else state.cart.splice(i, 1); persistCart(); renderCart(); return; }
 if (b.dataset.daLinePreview !== undefined) { const line = state.cart[Number(b.dataset.daLinePreview)]; if (line) rotateTo(line.id, line); return; }
 if (b.dataset.daFulfil) { state.fulfil = b.dataset.daFulfil; renderCart(`[data-da-fulfil="${state.fulfil}"]`); return; }
 const action = b.dataset.daAction;
 if (action === 'cart') { if (viewer) setCartMode(true); else openViewer(state.last, null, true); return; }
 if (!viewer) return;
 switch (action) {
  case 'close': closeViewer(); break;
  case 'categories-menu': setCategoryMenu(!viewer.catMenu, false); break;
  case 'categories-menu-bottom': setCategoryMenu(!viewer.catMenu, true); break;
  case 'categories-close': setCategoryMenu(false); break;
  case 'sheet-up': setSheet(true); viewer.root.querySelector('.da-sheet-handle')?.focus({preventScroll: true}); break;
  case 'sheet-down': setSheet(false); break;
  case 'cart-tab': setCartMode(true); break;
  case 'cart-close': setCartMode(false); break;
  case 'previous': nextDish(-1); break;
  case 'next': nextDish(1); break;
  case 'less': if (viewer.qty > 1) { viewer.qty--; renderInfo('[data-da-action="less"]'); } break;
  case 'more': if (viewer.qty < 20) { viewer.qty++; renderInfo('[data-da-action="more"]'); } break;
  case 'add': addCurrentDish(); break;
  case 'clear-cart': state.cart = []; persistCart(); renderCart(); break;
  case 'save-order': saveDemoOrder(); break;
  case 'continue': viewer.confirmed = null; renderCart(); setCartMode(false); break;
  case 'motion':
   viewer.motion = !viewer.motion;
   viewer.root.classList.toggle('da-is-paused', !viewer.motion);
   viewer.root.classList.toggle('da-allow-motion', viewer.motion);
   renderInfo('[data-da-action="motion"]'); break;
  case 'steam':
   viewer.steam = !viewer.steam;
   viewer.steamEngine.setEnabled(viewer.steam && viewer.ready);
   renderInfo('[data-da-action="steam"]'); break;
 }
});
document.addEventListener('keydown', e => {
 if (!viewer) return;
 if (e.key === 'Escape') {
  e.preventDefault();
  if (viewer.catMenu) { const fromBottom = viewer.catFromBottom; setCategoryMenu(false); viewer.root.querySelector(fromBottom && !viewer.navAway ? '[data-da-action="categories-menu-bottom"]' : '[data-da-action="categories-menu"]').focus(); }
  else if (viewer.cartMode) setCartMode(false);
  else if (viewer.sheet) setSheet(false);
  else closeViewer();
  return;
 }
 if (viewer.catMenu) return;
 if (e.key === 'ArrowLeft') { e.preventDefault(); nextDish(-1); }
 if (e.key === 'ArrowRight') { e.preventDefault(); nextDish(1); }
 const inScroller = e.target.closest?.('.da-info-scroll,.da-cart-body');
 if (e.key === 'ArrowUp' && !inScroller && !viewer.cartMode) { e.preventDefault(); setSheet(true); }
 if (e.key === 'ArrowDown' && !inScroller && !viewer.cartMode) { e.preventDefault(); setSheet(false); }
 if (e.key === 'Tab') {
  const all = [...viewer.root.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(el => el.offsetParent !== null && !el.closest('[inert]') && getComputedStyle(el).visibility !== 'hidden');
  const first = all[0], last = all.at(-1);
  if (!viewer.root.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first)?.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
 }
});
window.addEventListener('resize', resizeScene);
new MutationObserver(records => {
 if (!records.some(r => r.attributeName === 'lang')) return;
 if (viewer) {
  viewer.root.querySelector('.da-site-nav').innerHTML = siteNavMarkup();
  viewer.root.querySelector('.da-details-hint span').textContent = tr('details');
  renderTicker();
  updateSelection(); renderInfo(); renderCart(); applyInert();
 }
 updateCounts();
}).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});

window.DAExperience = {openCategory, openFood: openViewer, openCart: () => viewer ? setCartMode(true) : openViewer(state.last, null, true)};
window.setLang?.(document.documentElement.lang === 'bn' ? 'bn' : 'en');
updateCounts();
dishes.forEach(d => { const img = new Image(); img.src = d.image; });
