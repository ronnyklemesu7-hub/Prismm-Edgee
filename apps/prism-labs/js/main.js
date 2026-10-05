// Main application entry point (non-module version)



function initFooterAndCTAs() {
  const wa = (window.CONFIG && window.CONFIG.whatsapp) ? window.CONFIG.whatsapp : '';
  if (!wa) return;
  const mktEl = document.getElementById('marketing-cta');
  const consultEl = document.getElementById('consult-cta');
  if (mktEl) {
    const mktMsg = encodeURIComponent("Hi Prism Labs! I'm interested in your digital marketing services and would like to learn more.");
    mktEl.href = `https://wa.me/${wa}?text=${mktMsg}`;
  }
  if (consultEl) {
    const consultMsg = encodeURIComponent("Hi Prism Labs, I'd like to book a consultation with your team.");
    consultEl.href = `https://wa.me/${wa}?text=${consultMsg}`;
  }
}

function initApp() {
  initCursor();
  initHero();
  initTemplates();
  initGallery();
  initStories();
  initPrismaChat();
  initFooterAndCTAs();
  initAnimations();
  initInteractiveLogo();
  // initCubeInteraction is handled inside initInteractiveLogo()
  if (window.lucide) lucide.createIcons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
