import { gsap } from 'gsap';

export const fadeIn = (element: HTMLElement) => {
  gsap.fromTo(
    element,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
  );
};

export const scaleIn = (element: HTMLElement) => {
  gsap.fromTo(
    element,
    { scale: 0.9, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
  );
};

export const staggerChildren = (element: HTMLElement) => {
  gsap.fromTo(
    element.children,
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
  );
};
