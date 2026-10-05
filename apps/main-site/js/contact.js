import { showToast } from './toast.js';

const ENDPOINT = 'https://formspree.io/f/mdabjgrv';

export function initContact() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const original = submit?.textContent || 'Send Message';
    if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      if (!response.ok) throw new Error(`Form submission failed: ${response.status}`);
      form.reset();
      showToast('Message sent. We'll be in touch soon.');
    } catch (error) {
      console.error('[CONTACT] Submission failed:', error);
      showToast('Couldn't send the message. Please try again or use WhatsApp/email.');
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = original; }
    }
  });
}
