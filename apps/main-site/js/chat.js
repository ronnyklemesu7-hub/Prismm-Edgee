import { showToast } from './toast.js';

const responses = [
  { keys: ['website', 'site', 'web'], reply: 'Great! We build stunning, high-performance websites. Can you tell me more about your business?' },
  { keys: ['scale', 'grow', 'marketing', 'brand'], reply: "That's exactly what Prism Labs is for! What industry are you in?" },
  { keys: ['product', 'sell', 'shop', 'store'], reply: 'Edge Products might be perfect for you! What are you selling?' },
  { keys: ['email', '@', 'whatsapp', 'phone', 'number'], reply: "Thanks for sharing! We've logged your contact info and our team will reach out within 24 hours. 🚀", contact: true },
];

const fallback = "Thanks for reaching out! Our team will contact you very soon. Can you drop your email or WhatsApp number so we can follow up? 📩";

let messages = [];
let idleTimer = null;
let hasContact = false;

export function initChat() {
  const bubble = document.getElementById('chat-bubble');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('chat-close');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  const stored = localStorage.getItem('pe_chat');
  messages = stored ? JSON.parse(stored) : [];

  bubble.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      if (messages.length === 0) {
        setTimeout(() => botSay("Hey! 👋 Welcome to Prism Edge. I'm your virtual assistant. Tell me about your brand and what you need — our team will reach out shortly! What's your name?"), 400);
      } else {
        renderMessages();
      }
    }
  });

  closeBtn.addEventListener('click', () => panel.classList.add('hidden'));

  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    pushMsg('user', text);
    input.value = '';
    resetIdle();
    setTimeout(() => botReply(text), 600);
  };

  sendBtn.addEventListener('click', send);
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') send(); });
}

function botSay(text) {
  showTyping();
  setTimeout(() => {
    hideTyping();
    pushMsg('bot', text);
  }, 900);
}

function botReply(userText) {
  const lower = userText.toLowerCase();
  let matched = null;
  for (const r of responses) {
    if (r.keys.some(k => lower.includes(k))) { matched = r; break; }
  }
  const reply = matched ? matched.reply : fallback;
  if (matched?.contact) hasContact = true;
  botSay(reply);
  resetIdle();
}

function pushMsg(role, text) {
  messages.push({ role, text, ts: Date.now() });
  localStorage.setItem('pe_chat', JSON.stringify(messages));
  renderMessages();
}

function renderMessages() {
  const box = document.getElementById('chat-messages');
  box.innerHTML = messages.map(m => {
    const time = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `<div class="flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}">
      <div class="chat-msg ${m.role}">${m.text}</div>
      <div class="msg-time">${time}</div>
    </div>`;
  }).join('');
  box.scrollTop = box.scrollHeight;
}

function showTyping() {
  const box = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.id = 'typing';
  el.className = 'flex items-start';
  el.innerHTML = `<div class="chat-msg bot"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

function hideTyping() {
  document.getElementById('typing')?.remove();
}

function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (messages.length > 1) sendTranscript();
  }, 120000);
}

function sendTranscript() {
  const transcript = messages.map(m => `[${new Date(m.ts).toLocaleString()}] ${m.role.toUpperCase()}: ${m.text}`).join('\n');
  console.log('📧 Mock email to hello@prismedge.com:\n', transcript);
  showToast('Chat transcript sent to our team');
}
