export function initNav() {
  const nav = document.getElementById('main-nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });

  const menuBtn = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const closeBtn = document.getElementById('menu-close');

  menuBtn?.addEventListener('click', () => {
    menu.classList.remove('hidden');
    menu.classList.add('flex');
    const links = menu.querySelectorAll('.mobile-link');
    links.forEach((l, i) => {
      l.style.opacity = 0;
      l.style.transform = 'translateY(20px)';
      setTimeout(() => {
        l.style.transition = 'all 0.4s cubic-bezier(.2,.8,.2,1)';
        l.style.opacity = 1;
        l.style.transform = 'translateY(0)';
      }, 80 * i);
    });
  });

  closeBtn?.addEventListener('click', () => {
    menu.classList.add('hidden');
    menu.classList.remove('flex');
  });

  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.add('hidden');
    menu.classList.remove('flex');
  }));
}
