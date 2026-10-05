// ─── PRISM LABS AI CHAT ──────────────────────────────────────────────
// Dual-mode chatbot: Prism Chat + ScaleIQ Advisor

const CHAT_MODEL = 'deepseek/deepseek-chat-v3-0324:free';

// ─── LEARNED CONTEXT ─────────────────────────────────────────────────────────
function getLearnedContext() {
    const trends = JSON.parse(localStorage.getItem('pl_chat_trends') || '{}');
    const sessions = JSON.parse(localStorage.getItem('pl_past_sessions') || '[]');

    let ctx = '';

    const sorted = Object.entries(trends).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (sorted.length) {
        ctx += `\n\nLEARNED FROM PAST CLIENTS: The most common needs are: ${sorted.map(([k, v]) => `"${k}" (${v} clients)`).join(', ')}. Use this to offer proactive suggestions.`;
    }

    if (sessions.length) {
        const recent = sessions.slice(-5);
        const bullets = recent.map(s => `- ${s.need}: "${s.insight}"`).join('\n');
        ctx += `\n\nINSIGHTS FROM RECENT CLIENTS:\n${bullets}\nDraw on these patterns for smarter advice.`;
    }

    return ctx;
}

function buildSystemPrompt() {
    const learned = getLearnedContext();
    return `You are Prism, the AI assistant for PRISM LABS — the brand scaling division of PRISM EDGE. We help brands go from invisible to dominant through brand strategy, premium design, digital marketing, and AI-powered growth.

YOUR PERSONALITY:
- Professional, polished, and warm — but conversational and genuinely helpful
- Never robotic or generic. Sound like a knowledgeable friend who happens to be an expert
- Concise: keep responses to 2-4 sentences unless explaining something complex
- Always guide conversations toward understanding the client's needs
- When you have enough context, suggest the most relevant Prism Labs service

YOUR GOALS (in order):
1. Understand what the visitor needs (brand strategy, website, marketing, consulting, or general info)
2. Give them genuinely useful, specific advice based on their situation
3. Encourage them to share contact details (email or WhatsApp) so the team can follow up
4. Once contact info is shared, warmly conclude the chat

PRISM LABS SERVICES:
- Brand Strategy & Positioning: Premium brand analysis and roadmap
- Website Development: High-performance, conversion-focused sites
- Digital Marketing: Social, paid ads, SEO, content strategy
- AI-Powered Consulting: Brand growth through data and frameworks
- E-commerce & Products: Launch and scale online business

RULES:
- Never make up prices. Say "Pricing is custom to your project — share your details and we'll provide a quote."
- Never claim services you don't offer
- If asked outside your scope, offer to connect them with the team
- Always be helpful, never dismissive${learned}`;
}

// ─── STATE ────────────────────────────────────────────────────────────────────
let chatHistory = [];
let chatMessages = [];
let hasLoggedLead = false;
let chatConcluded = false;
let chatMode = 'prism';

// ─── SMART OFFLINE FALLBACK ──────────────────────────────────────────────────
function smartOfflineReply(userMessage) {
    const t = userMessage.toLowerCase();

    if (/hi|hello|hey|good (morning|afternoon|evening)|what's up/i.test(t))
        return `Hey! 👋 I'm Prism, your brand growth advisor at Prism Labs. We help brands scale from invisible to dominant. What's your biggest goal right now?`;

    if (/website|web site|landing page|web app|app/i.test(t))
        return `Websites are our bread and butter. 💻 We engineer high-performance, conversion-focused sites that actually drive results. Are you building from scratch or improving an existing site?`;

    if (/marketing|ads|advertis|social media|instagram|tiktok|facebook|seo|content/i.test(t))
        return `Smart move focusing on marketing — it's the engine of brand growth. 📣 We handle everything from social strategy to paid ads and SEO. What's your current situation — running campaigns or starting fresh?`;

    if (/brand|logo|identity|rebrand|design|positioning/i.test(t))
        return `Brand positioning is everything — it's how people perceive and remember you. 🎨 We help businesses craft premium brands that attract the right audience. What industry are you in?`;

    if (/scale|grow|growth|revenue|sales|clients|customers|expand/i.test(t))
        return `Scaling is where we excel. 🚀 We've helped brands go from unknown to market leaders through strategic positioning and targeted growth. What's your biggest growth challenge?`;

    if (/strategy|consult|advice|plan|direction|help/i.test(t))
        return `That's exactly what we're here for. 🧠 Our AI-powered consulting helps brands get clarity on positioning, growth, and next steps. Want to share a bit about your business?`;

    if (/@|whatsapp|email|call|contact|reach|phone|number/i.test(t))
        return `Perfect! You can reach us directly:\n• WhatsApp: +233 248 607 998\n• Email: prismmedgee@gmail.com\n\nThe team typically responds within a few hours. We look forward to working with you!`;

    const generic = [
        `To point you in the right direction — what does your business do, and what's your #1 goal for the next 6 months? 🎯`,
        `Great question. Could you tell me a bit more about your business so I can give you the most relevant advice? 🚀`,
        `I'd love to help. What industry are you in, and where do you feel your brand is falling short? 💡`,
    ];
    return generic[Math.floor(Math.random() * generic.length)];
}

// ─── AI CALL WITH MULTI-PROXY FALLBACK ───────────────────────────────────────
async function callChatAI(userMessage) {
    chatHistory.push({ role: 'user', content: userMessage });

    const apiUrl = null; // Local-first build: AI will use the secure Vercel backend later.
    const proxies = [
        'https://edge.flowith.io/api-proxy/' + encodeURIComponent(apiUrl),
        'https://corsproxy.io/?' + encodeURIComponent(apiUrl),
        apiUrl
    ];

    const body = JSON.stringify({
        model: CHAT_MODEL,
        messages: [
            { role: 'system', content: buildSystemPrompt() },
            ...chatHistory
        ],
        temperature: 0.75,
        max_tokens: 300
    });

    for (const url of proxies) {
        try {
            if (!apiUrl) throw new Error('Legacy AI module disabled in local-first build');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                signal: AbortSignal.timeout(12000)
            });
            if (!res.ok) continue;
            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content?.trim();
            if (reply) {
                chatHistory.push({ role: 'assistant', content: reply });
                return reply;
            }
        } catch (e) {
            console.warn('Proxy failed, trying next...', url, e.message);
        }
    }

    const offline = smartOfflineReply(userMessage);
    chatHistory.push({ role: 'assistant', content: offline });
    return offline;
}

// ─── TREND & SESSION LEARNING ─────────────────────────────────────────────────
function recordTrend(text) {
    const lower = text.toLowerCase();
    const trends = JSON.parse(localStorage.getItem('pl_chat_trends') || '{}');
    const keywords = {
        'website': ['website', 'site', 'web', 'landing page', 'app'],
        'marketing': ['marketing', 'ads', 'social media', 'tiktok', 'instagram', 'seo', 'content'],
        'branding': ['brand', 'logo', 'identity', 'rebrand', 'design'],
        'scaling': ['scale', 'grow', 'growth', 'revenue', 'clients', 'customers'],
        'consulting': ['strategy', 'consulting', 'advice', 'direction', 'plan'],
    };
    for (const [key, words] of Object.entries(keywords)) {
        if (words.some(w => lower.includes(w))) {
            trends[key] = (trends[key] || 0) + 1;
        }
    }
    localStorage.setItem('pl_chat_trends', JSON.stringify(trends));
}

function saveSessionInsight(need, insight) {
    const sessions = JSON.parse(localStorage.getItem('pl_past_sessions') || '[]');
    sessions.push({ need, insight, ts: Date.now() });
    if (sessions.length > 20) sessions.splice(0, sessions.length - 20);
    localStorage.setItem('pl_past_sessions', JSON.stringify(sessions));
}

// ─── LEAD LOGGING ─────────────────────────────────────────────────────────────
function logLead(text) {
    if (hasLoggedLead) return;
    hasLoggedLead = true;

    const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || 'Not provided';
    const phone = text.match(/\+?[\d\s\-()]{7,}/)?.[0]?.trim() || 'Not provided';
    const convo = chatHistory
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' | ');

    const leadData = {
        name: 'Prism Labs Chat Lead',
        email,
        whatsapp: phone,
        need: 'Direct Inquiry via Prism Labs Chat',
        message: convo,
        source: 'prism_labs_chat',
        ts: Date.now()
    };

    saveSessionInsight(leadData.need, convo.slice(0, 120));

    fetch('https://formspree.io/f/mdabjgrv', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
    }).catch(err => console.error('Formspree error:', err));

    const waMsg = `Hi Prism Labs Team! 🚀 A new lead just came in via the chat.\n\nEmail: ${email}\nPhone: ${phone}\n\nConversation summary:\n${convo.slice(0, 400)}\n\nPlease follow up!`;
    setTimeout(() => window.open(`https://wa.me/233248607998?text=${encodeURIComponent(waMsg)}`, '_blank'), 2500);
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
function pushMsg(role, text) {
    chatMessages.push({ role, text, ts: Date.now() });
    renderMessages();
}

function renderMessages() {
    const box = document.getElementById('chat-messages');
    if (!box) return;
    box.innerHTML = chatMessages.map(m => {
        const time = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isBot = m.role === 'bot';
        return `<div class="flex flex-col ${isBot ? 'items-start' : 'items-end'}">
      <div class="chat-msg ${m.role}">${m.text}</div>
      <div class="msg-time">${time}</div>
    </div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
}

function showTyping() {
    const box = document.getElementById('chat-messages');
    if (!box) return;
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

function concludeChat() {
    chatConcluded = true;
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    if (input) { input.placeholder = 'Conversation concluded'; input.disabled = true; input.style.opacity = '0.5'; }
    if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '0.5'; }

    const box = document.getElementById('chat-messages');
    if (!box) return;
    const lastUserMsg = chatHistory.filter(m => m.role === 'user').pop()?.content || '';
    const waText = encodeURIComponent(`Hi Prism Labs! I'd love to follow up on our chat.\n\nMy message: ${lastUserMsg}`);
    const el = document.createElement('div');
    el.className = 'text-center py-4 flex flex-col items-center gap-3';
    el.innerHTML = `
    <div class="text-xs font-mono opacity-60 italic" style="color:#E8C97A">— Session Concluded —</div>
    <a href="https://wa.me/233248607998?text=${waText}" target="_blank"
      class="inline-flex items-center gap-2 px-4 py-2 text-white text-xs font-bold rounded-full hover:scale-105 transition shadow-lg"
      style="background:#25D366">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
      Continue on WhatsApp
    </a>`;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
}

// ─── CONTACT DETECTION ────────────────────────────────────────────────────────
function containsContact(text) {
    return text.includes('@') || /\+?[\d\s\-()]{9,}/.test(text);
}

// ─── MODE SWITCHING ───────────────────────────────────────────────────────────
function switchChatMode(mode) {
    chatMode = mode;

    chatHistory = [];
    chatMessages = [];
    hasLoggedLead = false;
    chatConcluded = false;

    const prismBtn = document.getElementById('mode-prism-btn');
    const advisorBtn = document.getElementById('mode-advisor-btn');
    const header = document.getElementById('chat-header-title');
    const subtitle = document.getElementById('chat-header-subtitle');

    if (prismBtn) prismBtn.classList.toggle('active', mode === 'prism');
    if (advisorBtn) advisorBtn.classList.toggle('active', mode === 'advisor');

    if (mode === 'advisor') {
        if (header) header.textContent = 'ScaleIQ Advisor';
        if (subtitle) subtitle.textContent = 'Business Growth Consultant';
    } else {
        if (header) header.textContent = 'Prism Chat';
        if (subtitle) subtitle.textContent = 'Brand Growth Specialist';
    }

    const box = document.getElementById('chat-messages');
    if (box) box.innerHTML = '';

    const greeting = mode === 'advisor'
        ? `Hey! I'm ScaleIQ — your AI business growth partner from Prism Labs. I help founders and operators make smarter scaling decisions through sharp analysis and actionable frameworks.\n\nWhat stage is your business at, and what's your biggest challenge right now?`
        : `Hey there! 👋 I'm Prism, your brand growth advisor at Prism Labs. I'm here to help you scale your brand through smart strategy and execution.\n\nWhat brings you here today?`;

    setTimeout(() => {
        chatHistory.push({ role: 'assistant', content: greeting });
        pushMsg('bot', greeting);
    }, 300);
}

window.switchChatMode = switchChatMode;

// ─── INIT ─────────────────────────────────────────────────────────────────────
function initChat() {
    const bubble = document.getElementById('chat-bubble');
    const panel = document.getElementById('chat-panel');
    const closeBtn = document.getElementById('chat-close');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');

    if (!bubble || !panel) return;

    chatHistory = [];
    chatMessages = [];
    hasLoggedLead = false;
    chatConcluded = false;
    chatMode = 'prism';

    bubble.addEventListener('click', () => {
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden') && chatMessages.length === 0) {
            const greeting = `Hey there! 👋 I'm Prism, your brand growth advisor at Prism Labs. We help brands scale through premium strategy, design, and execution.\n\nWhat's your biggest goal right now?`;
            setTimeout(() => {
                chatHistory.push({ role: 'assistant', content: greeting });
                pushMsg('bot', greeting);
            }, 400);
        }
    });

    closeBtn.addEventListener('click', () => panel.classList.add('hidden'));

    const send = async () => {
        if (chatConcluded) return;
        const text = input.value.trim();
        if (!text) return;

        pushMsg('user', text);
        input.value = '';

        if (chatMode === 'advisor') {
            recordAdvisorTrend(text);
        } else {
            recordTrend(text);
        }

        if (containsContact(text)) {
            if (chatMode === 'advisor') {
                logAdvisorLead(text);
            } else {
                logLead(text);
            }
        }

        showTyping();
        let reply;
        if (chatMode === 'advisor') {
            reply = await callAdvisorAI(text);
        } else {
            reply = await callChatAI(text);
        }
        hideTyping();
        pushMsg('bot', reply);

        if (hasLoggedLead && !chatConcluded) {
            setTimeout(() => concludeChat(), 1200);
        }
    };

    sendBtn.addEventListener('click', send);
    input.addEventListener('keypress', e => { if (e.key === 'Enter') send(); });
}

window.initChat = initChat;
