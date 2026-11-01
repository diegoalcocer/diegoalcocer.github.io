// === Reveal-on-scroll observer (replaces AOS) ===
(function() {
  const reveals = document.querySelectorAll('[data-reveal]');
  if (!reveals.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('revealed'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  reveals.forEach(el => io.observe(el));
})();

// === Number count-up on scroll-into-view ===
(function() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll('[data-countup]');
  if (!targets.length || reduceMotion || !('IntersectionObserver' in window)) return;

  function animateValue(el, target, duration, formatter) {
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatter(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function setupCountUp(el) {
    const original = el.textContent.trim();
    const match = original.match(/^(\D*?)([\d,]+)(.*)$/);
    if (!match) return false;
    const [, prefix, numStr, suffix] = match;
    const target = parseInt(numStr.replace(/,/g, ''), 10);
    if (isNaN(target)) return false;
    const hasComma = numStr.includes(',');
    const formatter = (v) => `${prefix}${hasComma ? v.toLocaleString() : v}${suffix}`;
    el.textContent = formatter(0);
    animateValue(el, target, 1500, formatter);
    return true;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setupCountUp(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  targets.forEach(el => io.observe(el));
})();

// Toggle navbar background on scroll
const nav = document.querySelector('.navbar');
const hero = document.querySelector('.hero');
function onScroll() {
  const offset = window.scrollY || window.pageYOffset;
  if (!hero || offset > (hero.offsetHeight - 80)) { nav.classList.add('nav-scrolled'); }
  else { nav.classList.remove('nav-scrolled'); }
}
document.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Awards tile: one-time gentle ping when entering viewport
(function(){
  var el = document.getElementById('awardsTile');
  if (!el) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var seen = false;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (!seen && entry.isIntersecting) {
          seen = true;
          el.classList.add('ping');
          setTimeout(function(){ el.classList.remove('ping'); }, 1000);
          io.disconnect();
        }
      });
    }, { threshold: 0.5 });
    io.observe(el);
  }
})();

// === Journey: pinned horizontal scene (≥992px, motion allowed) ===
// Scroll is never intercepted — the track position is a pure function of
// scroll progress through the runway. Below 992px or under reduced motion
// the section stays a static stack (no .journey-pinned class).
(function(){
  var section = document.getElementById('journey');
  if (!section) return;
  var runway = section.querySelector('.journey-runway');
  var sticky = section.querySelector('.journey-sticky');
  var track = section.querySelector('.journey-track');
  var ticksWrap = section.querySelector('.journey-ticks');
  var panels = track.children;
  var n = panels.length;
  var wideMq = window.matchMedia('(min-width: 992px)');
  var motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var enabled = false, raf = null, ticks = [];

  var chapterNames = Array.prototype.map.call(
    section.querySelectorAll('.journey-chapter-title'),
    function (el) { return el.textContent.trim(); }
  );

  function jump(idx) {
    var top = runway.getBoundingClientRect().top + window.scrollY;
    var span = runway.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: top + span * idx / (n - 1) + 1,
      behavior: motionMq.matches ? 'auto' : 'smooth'
    });
  }

  for (var i = 0; i < n; i++) {
    (function (idx) {
      var b = document.createElement('button');
      b.className = 'journey-tick' + (idx === 0 ? ' on' : '');
      b.type = 'button';
      b.setAttribute('aria-label', 'Chapter ' + (idx + 1) + ': ' + chapterNames[idx]);
      b.addEventListener('click', function () { jump(idx); });
      ticksWrap.appendChild(b);
      ticks.push(b);
    })(i);
  }

  function setTicks(active) {
    for (var i = 0; i < ticks.length; i++) ticks[i].classList.toggle('on', i === active);
  }

  function update() {
    raf = null;
    if (!enabled) return;
    var vh = window.innerHeight;
    var rect = runway.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > vh) return;
    var span = runway.offsetHeight - vh;
    var p = Math.min(1, Math.max(0, -rect.top / span));
    var pos = p * (n - 1);
    track.style.transform = 'translate3d(' + (-pos * sticky.clientWidth).toFixed(1) + 'px,0,0)';
    setTicks(Math.round(pos));
  }

  function onScroll() { if (!raf) raf = requestAnimationFrame(update); }

  function evaluate() {
    var want = wideMq.matches && !motionMq.matches;
    if (want !== enabled) {
      enabled = want;
      section.classList.toggle('journey-pinned', want);
      if (!want) track.style.transform = '';
    }
    if (enabled) onScroll();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', evaluate);
  if (wideMq.addEventListener) {
    wideMq.addEventListener('change', evaluate);
    motionMq.addEventListener('change', evaluate);
  }
  evaluate();
})();

// === Scrollspy: highlight the nav link for the section in view ===
(function(){
  var links = document.querySelectorAll('.navbar .nav-link[href^="#"]');
  if (!links.length) return;
  var pairs = [];
  links.forEach(function (link) {
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (target) pairs.push({ link: link, target: target });
  });
  var raf = null;
  function update() {
    raf = null;
    var probe = window.scrollY + window.innerHeight * 0.35;
    var current = null;
    pairs.forEach(function (p) {
      if (p.target.getBoundingClientRect().top + window.scrollY <= probe) current = p;
    });
    pairs.forEach(function (p) {
      var on = p === current;
      p.link.classList.toggle('active', on);
      if (on) p.link.setAttribute('aria-current', 'true');
      else p.link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () {
    if (!raf) raf = requestAnimationFrame(update);
  }, { passive: true });
  update();
})();

// Mobile menu: close it after a link is tapped, so it doesn't cover the section.
(function(){
  var menu = document.getElementById('mainNav');
  if (!menu || !window.bootstrap) return;
  menu.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      if (menu.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
      }
    });
  });
})();
