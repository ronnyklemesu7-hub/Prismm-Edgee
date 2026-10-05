import { initCursor } from './cursor.js';
import { initAurora } from './aurora.js';
import { initNav } from './nav.js';
import { initHero } from './hero.js';
import { initStats, renderServices, renderTestimonials } from './stats.js';
import { initGallery } from './gallery.js';
import { initChat } from './chat.js';
import { initContact } from './contact.js';

window.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initAurora();
  initNav();
  initHero();
  renderServices();
  renderTestimonials();
  initStats();
  initGallery();
  initChat();
  initContact();

  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 500);
});
