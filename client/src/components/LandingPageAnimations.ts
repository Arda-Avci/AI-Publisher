/**
 * LandingPage Animations — CSS-only + Vanilla JS scroll triggers
 * No external dependencies (GSAP/Lottie-free as per user decision)
 */

/** Injected into <style> tag inside LandingPage.tsx */
export const landingPageStyles = `
  /* ===== HERO ANIMATIONS ===== */

  @keyframes heroBadgeEntrance {
    0% { opacity: 0; transform: translateY(-12px) scale(0.95); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes heroTitleEntrance {
    0% { opacity: 0; transform: translateY(20px); filter: blur(4px); }
    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
  }

  @keyframes heroSubtitleEntrance {
    0% { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes heroCTAsEntrance {
    0% { opacity: 0; transform: translateY(12px) scale(0.97); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes heroVideoEntrance {
    0% { opacity: 0; transform: translateY(24px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes heroStatsEntrance {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes heroFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  @keyframes heroGlow {
    0%, 100% { box-shadow: 0 0 40px var(--accent-glow); }
    50% { box-shadow: 0 0 60px var(--accent-glow), 0 0 80px rgba(99,102,241,0.15); }
  }

  @keyframes heroPlayPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  /* Hero entrance classes */
  .hero-badge { animation: heroBadgeEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .hero-title { animation: heroTitleEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
  .hero-subtitle { animation: heroSubtitleEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }
  .hero-ctas { animation: heroCTAsEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }
  .hero-video { animation: heroVideoEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both; }
  .hero-stats { animation: heroStatsEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both; }
  .hero-float { animation: heroFloat 4s ease-in-out infinite; }
  .hero-play-btn { animation: heroGlow 2.5s ease-in-out infinite, heroPlayPulse 3s ease-in-out infinite; }

  /* ===== MARQUEE PAUSE ON HOVER ===== */
  .marquee-container:hover .marquee-track {
    animation-play-state: paused;
  }

  /* ===== GALLERY CARD ANIMATIONS ===== */

  @keyframes cardEntrance {
    0% { opacity: 0; transform: translateY(24px) scale(0.97); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes cardGlowHover {
    0%, 100% { box-shadow: 0 0 0 rgba(99,102,241,0); }
    50% { box-shadow: 0 0 20px rgba(99,102,241,0.2); }
  }

  @keyframes cardReveal {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .gallery-card {
    opacity: 0;
    animation: cardEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .gallery-card:hover .card-glow-effect {
    animation: cardGlowHover 1.5s ease-in-out infinite;
  }

  /* Stagger delays for gallery cards */
  .gallery-card:nth-child(1) { animation-delay: 0.05s; }
  .gallery-card:nth-child(2) { animation-delay: 0.1s; }
  .gallery-card:nth-child(3) { animation-delay: 0.15s; }
  .gallery-card:nth-child(4) { animation-delay: 0.2s; }
  .gallery-card:nth-child(5) { animation-delay: 0.25s; }
  .gallery-card:nth-child(6) { animation-delay: 0.3s; }
  .gallery-card:nth-child(7) { animation-delay: 0.35s; }
  .gallery-card:nth-child(8) { animation-delay: 0.4s; }
  .gallery-card:nth-child(9) { animation-delay: 0.45s; }

  /* ===== FEATURES BENTO ANIMATIONS ===== */

  @keyframes bentoCardEntrance {
    0% { opacity: 0; transform: translateY(30px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes bentoGlowPulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }

  .bento-card {
    opacity: 0;
    animation: bentoCardEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .bento-card:nth-child(1) { animation-delay: 0.1s; }
  .bento-card:nth-child(2) { animation-delay: 0.2s; }
  .bento-card:nth-child(3) { animation-delay: 0.3s; }

  .bento-glow {
    animation: bentoGlowPulse 4s ease-in-out infinite;
  }

  /* ===== STATS SECTION ANIMATIONS ===== */

  @keyframes statsEntrance {
    0% { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes numberCount {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .stat-item {
    opacity: 0;
    animation: statsEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .stat-item:nth-child(1) { animation-delay: 0.1s; }
  .stat-item:nth-child(2) { animation-delay: 0.2s; }
  .stat-item:nth-child(3) { animation-delay: 0.3s; }

  .stat-number { animation: numberCount 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

  /* ===== CTA SECTION ANIMATIONS ===== */

  @keyframes ctaEntrance {
    0% { opacity: 0; transform: translateY(20px) scale(0.98); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  .cta-section {
    opacity: 0;
    animation: ctaEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* ===== FOOTER ANIMATIONS ===== */

  @keyframes footerFadeIn {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .footer-content {
    opacity: 0;
    animation: footerFadeIn 0.5s ease-out 0.2s forwards;
  }

  @keyframes footerLinkHover {
    0% { transform: translateX(0); }
    50% { transform: translateX(3px); color: var(--text-primary); }
    100% { transform: translateX(0); }
  }

  .footer-link:hover {
    animation: footerLinkHover 0.3s ease-in-out;
  }

  /* ===== WAVE SVG FOOTER ===== */

  @keyframes waveMove {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .footer-wave {
    animation: waveMove 12s linear infinite;
  }

  /* ===== SECTION REVEAL ON SCROLL ===== */

  .reveal-on-scroll {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .reveal-on-scroll.revealed {
    opacity: 1;
    transform: translateY(0);
  }

  /* ===== NAVBAR SCROLL EFFECT ===== */

  .navbar-scrolled {
    background: rgba(9, 9, 11, 0.95) !important;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
  }

  /* ===== PARALLAX DECORATIONS ===== */

  @keyframes parallaxFloat1 {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    33% { transform: translate(10px, -15px) rotate(2deg); }
    66% { transform: translate(-5px, 8px) rotate(-1deg); }
  }

  @keyframes parallaxFloat2 {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    50% { transform: translate(-12px, 10px) rotate(-2deg); }
  }

  .parallax-orb-1 {
    animation: parallaxFloat1 8s ease-in-out infinite;
  }

  .parallax-orb-2 {
    animation: parallaxFloat2 10s ease-in-out infinite;
  }

  /* ===== MODAL ANIMATIONS ===== */

  @keyframes modalBackdropIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes modalContentIn {
    0% { opacity: 0; transform: scale(0.95) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-backdrop {
    animation: modalBackdropIn 0.2s ease-out forwards;
  }

  .modal-content {
    animation: modalContentIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* ===== LOGIN FORM ANIMATIONS ===== */

  @keyframes loginFormIn {
    0% { opacity: 0; transform: scale(0.95) translateY(-10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  .login-form {
    animation: loginFormIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* ===== CATEGORY BUTTON ACTIVE ANIMATION ===== */

  @keyframes categoryBtnPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .category-btn-active {
    animation: categoryBtnPop 0.2s ease-out;
  }

  /* ===== SCROLL PROGRESS BAR ===== */

  @keyframes scrollProgress {
    0% { transform: scaleX(0); }
    100% { transform: scaleX(1); }
  }

  .scroll-progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--accent), var(--secondary));
    transform-origin: left;
    z-index: 100;
    animation: scrollProgress 1s ease-out forwards;
  }
`;

/**
 * Initialize scroll-triggered reveal animations
 * Call this in useEffect with empty deps
 */
export function initScrollAnimations(): () => void {
  // Use Intersection Observer for better performance
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  const reveals = document.querySelectorAll('.reveal-on-scroll');
  reveals.forEach((el) => observer.observe(el));

  // Also handle navbar scroll state
  const navbar = document.querySelector('.navbar');
  const handleNavbarScroll = () => {
    if (window.scrollY > 20) {
      navbar?.classList.add('navbar-scrolled');
    } else {
      navbar?.classList.remove('navbar-scrolled');
    }
  };

  window.addEventListener('scroll', handleNavbarScroll, { passive: true });
  handleNavbarScroll();

  return () => {
    observer.disconnect();
    window.removeEventListener('scroll', handleNavbarScroll);
  };
}

/**
 * Animate number counting when element comes into view
 */
export function initNumberAnimations(): void {
  const statNumbers = document.querySelectorAll('[data-count]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          const endValue = target.dataset.count || '0';
          const duration = 1500;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(parseFloat(endValue.replace(/[^0-9.]/g, '')) * eased);

            target.textContent = endValue.replace(/[\d.]+/, currentValue.toString());

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
          observer.unobserve(target);
        }
      });
    },
    { threshold: 0.5 }
  );

  statNumbers.forEach((el) => observer.observe(el));
}

/**
 * Add staggered entrance animation to children of a container
 */
export function staggerChildren(
  containerSelector: string,
  childSelector: string,
  baseDelay: number = 50
): void {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const children = container.querySelectorAll(childSelector);
  children.forEach((child, index) => {
    (child as HTMLElement).style.animationDelay = `${index * baseDelay}ms`;
  });
}