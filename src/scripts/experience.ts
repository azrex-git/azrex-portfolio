import type { LaptopScene } from './laptop-scene';

const root = document.documentElement;
const intro = document.querySelector<HTMLElement>('.intro')!;
const container = document.querySelector<HTMLElement>('#laptop-scene')!;
const copy = document.querySelector<HTMLElement>('.hero-copy')!;
const landing = document.querySelector<HTMLElement>('.screen-landing')!;
const hero = document.querySelector<HTMLElement>('#hero')!;
const bottom = document.querySelector<HTMLElement>('.intro-bottom')!;
const toggle = document.querySelector<HTMLButtonElement>('#effects-toggle')!;
const note = document.querySelector<HTMLElement>('#render-note')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let scene: LaptopScene | undefined;
let pendingScene: AbortController | undefined;
let switching = false;
let cleanupAnimation: (() => void) | undefined;
let generation = 0;
let failed = false;
let wanted = root.dataset.effects !== 'off';

function isEnabled() { return wanted && !reducedMotion.matches && !failed; }
function reset() {
  generation++;
  pendingScene?.abort(); pendingScene = undefined;
  cleanupAnimation?.(); cleanupAnimation = undefined;
  scene?.dispose(); scene = undefined;
  root.classList.remove('scene-ready');
  copy.style.cssText = '';
  copy.inert = false;
  hero.style.opacity = '';
  hero.inert = false;
  container.style.opacity = '';
  bottom.style.opacity = '';
  landing.style.opacity = ''; landing.style.visibility = '';
}
function updateToggle() {
  const enabled = isEnabled();
  toggle.hidden = false;
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.setAttribute('aria-label', enabled ? 'Turn off 3D effects' : 'Turn on 3D effects');
  toggle.querySelector('span')!.textContent = enabled ? '3D on' : '3D off';
  toggle.disabled = reducedMotion.matches || switching;
  toggle.setAttribute('aria-busy', String(switching));
  toggle.title = reducedMotion.matches ? 'Your device prefers reduced motion' : 'Toggle the 3D workspace';
  root.classList.toggle('experience-static', !enabled);
  document.querySelectorAll<HTMLAnchorElement>('[data-home]').forEach(link => { link.href = enabled ? '#top' : '#hero'; });
}
function fallback(error?: unknown) {
  failed = true; reset(); updateToggle();
  note.hidden = false;
  if (error) console.warn('3D workspace unavailable; showing the lightweight portfolio.', error);
}
function presentProgress(p: number) {
  scene?.setProgress(Math.min(1, p / 0.94));
  copy.style.opacity = String(Math.max(0, 1 - p * 4));
  copy.inert = p > 0.25;
  copy.style.transform = `translateY(${-p * 65}px)`;
  bottom.style.opacity = String(Math.max(0, 1 - p * 3));
  const blend = Math.max(0, Math.min(1, (p - 0.76) / 0.14));
  landing.style.opacity = String(blend);
  landing.style.visibility = blend > 0 ? 'visible' : 'hidden';
  // The outgoing screen is the only text layer; the incoming layer is just atmosphere.
  container.style.opacity = String(1 - blend);
  hero.style.opacity = String(Math.max(0, Math.min(1, (p - 0.90) / 0.10)));
  hero.inert = p < 0.90;
}
function syncPresentation() {
  if (!isEnabled()) return;
  const rect = intro.getBoundingClientRect();
  presentProgress(Math.max(0, Math.min(1, -rect.top / Math.max(1, intro.offsetHeight - container.clientHeight))));
}
async function start() {
  reset(); updateToggle(); note.hidden = true;
  if (!isEnabled()) return;
  syncPresentation();
  const current = generation;
  const controller = new AbortController();
  pendingScene = controller;
  try {
    const [{ createLaptopScene }, { gsap }, { ScrollTrigger }] = await Promise.all([
      import('./laptop-scene'), import('gsap'), import('gsap/ScrollTrigger'),
    ]);
    if (current !== generation || !isEnabled()) return;
    gsap.registerPlugin(ScrollTrigger);
    const created = await createLaptopScene(container, {
      name: intro.dataset.name!,
      signal: controller.signal,
      onError: (error) => { if (current === generation) fallback(error); },
    });
    if (current !== generation || !isEnabled()) { created.dispose(); return; }
    pendingScene = undefined;
    scene = created;
    const state = { progress: 0 };
    const render = () => { if (current === generation) presentProgress(state.progress); };
    const tween = gsap.to(state, {
      progress: 1, ease: 'none', onUpdate: render,
      scrollTrigger: { trigger: intro, start: 'top top', end: 'bottom bottom', scrub: 0.35, invalidateOnRefresh: true },
    });
    const bounds = intro.getBoundingClientRect();
    tween.progress(Math.max(0, Math.min(1, -bounds.top / Math.max(1, intro.offsetHeight - container.clientHeight))));
    render();
    const revealFrame = requestAnimationFrame(() => {
      if (current === generation) root.classList.add('scene-ready');
    });
    const observer = new IntersectionObserver(([entry]) => scene?.setActive(entry.isIntersecting && !document.hidden));
    observer.observe(intro);
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      scene?.setPointer((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * -2);
    };
    const visibility = () => scene?.setActive(!document.hidden && intro.getBoundingClientRect().bottom > 0);
    window.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    cleanupAnimation = () => {
      cancelAnimationFrame(revealFrame); observer.disconnect();
      tween.scrollTrigger?.kill(); tween.kill();
      window.removeEventListener('pointermove', pointer);
      document.removeEventListener('visibilitychange', visibility);
    };
  } catch (error) { if (current === generation) fallback(error); }
}
toggle.addEventListener('click', async () => {
  // Serialize renderer setup and its initial layout/scroll commit. Rapid clicks
  // cannot create concurrent GPU contexts or stack competing scroll restores.
  if (switching || reducedMotion.matches) return;
  switching = true;
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section'));
  const visibleSection = sections.filter(section => section.getBoundingClientRect().top <= 110).at(-1) ?? intro;
  const anchor = visibleSection === intro ? hero : visibleSection;
  const previousTop = anchor.getBoundingClientRect().top;
  wanted = !wanted || failed; failed = false;
  root.dataset.effects = wanted ? 'on' : 'off';
  try { localStorage.setItem('portfolio-effects', wanted ? 'on' : 'off'); } catch {}
  const completion = start();
  const nextTop = anchor.getBoundingClientRect().top;
  window.scrollTo({ top: Math.max(0, window.scrollY + nextTop - (visibleSection === intro || visibleSection === hero ? 0 : previousTop)), behavior: 'instant' });
  syncPresentation();
  try {
    await completion;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  } finally {
    switching = false;
    updateToggle();
  }
});
reducedMotion.addEventListener('change', () => { void start(); });
void start();

// One honest project preview, with native focus management and Escape support.
const dialog = document.querySelector<HTMLDialogElement>('#project-dialog')!;
document.querySelector('[data-project-open]')!.addEventListener('click', () => dialog.showModal());
document.querySelector('#dialog-close')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

// Gentle glass-card tilt is decorative and disabled for touch/reduced motion.
document.querySelectorAll<HTMLElement>('[data-tilt]').forEach(card => {
  card.addEventListener('pointermove', (event) => {
    if (!isEnabled() || event.pointerType !== 'mouse') return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    card.style.transform = `perspective(1000px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg)`;
    card.style.setProperty('--shine-x', `${(x + .5) * 100}%`);
    card.style.setProperty('--shine-y', `${(y + .5) * 100}%`);
  });
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
});
window.addEventListener('pagehide', reset);
window.addEventListener('pageshow', (event) => { if (event.persisted) void start(); });
