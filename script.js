/**
 * VALDUB API KEY - Client-side interactions
 * No API keys are collected or stored.
 */

(function () {
  'use strict';

  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');

  function revealOnScroll() {
    const windowHeight = window.innerHeight;
    const revealPoint = 80;

    reveals.forEach(function (el) {
      const top = el.getBoundingClientRect().top;
      if (top < windowHeight - revealPoint) {
        el.classList.add('visible');
      }
    });
  }

  // Initial + scroll
  window.addEventListener('scroll', revealOnScroll, { passive: true });
  window.addEventListener('load', revealOnScroll);
  revealOnScroll();

  // Smooth offset for sticky header on anchor clicks
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        const headerOffset = 64;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // Subtle logo interaction
  const logoIcon = document.querySelector('.logo-icon');
  if (logoIcon) {
    logoIcon.addEventListener('click', function () {
      this.style.animation = 'none';
      // Force reflow
      void this.offsetWidth;
      this.style.animation = 'logoPulse 0.6s ease';
    });
  }
})();
