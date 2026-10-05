// ─── PRISMA AI — Prism Labs Brand Strategy Chatbot ───────────────────────────

const MAX_TURNS = 5;

// Models to try in order (free tier)
const MODELS = [
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'google/gemma-3-1b-it:free',
  'deepseek/deepseek-r1-0528:free',
  'meta-llama/llama-4-scout:free'
];

// Global Memory State (Loaded from Unified Server)
let _prismaSessions = [];
let _prismaPatterns = { industries: {}, challenges: {} };

async function loadPrismaMemory() {
  try {
    const storedSessions = JSON.parse(
      localStorage.getItem('prisma_sessions') || '[]'
    );

    const storedPatterns = JSON.parse(
      localStorage.getItem('prisma_trends') || '{}'
    );

    _prismaSessions = Array.isArray(storedSessions)
      ? storedSessions.slice(-20)
      : [];

    if (storedPatterns && typeof storedPatterns === 'object') {
      _prismaPatterns = {
        industries: storedPatterns.industries || {},
        challenges: storedPatterns.challenges || {}
      };
    }
  } catch (e) {
    console.warn('[PRISMA] Local memory load failed:', e);
    _prismaSessions = [];
    _prismaPatterns = { industries: {}, challenges: {} };
  }
}

// ─── LEARNED CONTEXT FROM PAST CLIENTS ───────────────────────────────────────
function getPrismaLearnedContext() {
  let ctx = '';

  const industries = Object.entries(_prismaPatterns.industries || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const challenges = Object.entries(_prismaPatterns.challenges || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (industries.length) {
    ctx += `\n\nCLIENT INDUSTRY TRENDS: The most common industries from past Prism Labs clients are: ${industries.map(([k, v]) => `${k} (${v} clients)`).join(', ')}. Recognise patterns from these sectors.`;
  }
  if (challenges.length) {
    ctx += `\n\nCOMMON CLIENT CHALLENGES: Past clients most frequently struggled with: ${challenges.map(([k, v]) => `"${k}"`).join(', ')}. Proactively ask about these if relevant.`;
  }
  if (_prismaSessions.length) {
    const recent = _prismaSessions.slice(-4).map(s => `- ${s.industry} business: "${s.keyChallenge}" → recommended: ${s.recommendation}`).join('\n');
    ctx += `\n\nRECENT PRISMA SESSION INSIGHTS:\n${recent}\nUse these patterns to give more targeted, experienced advice to new clients.`;
  }

  return ctx;
}

function buildPrismaSystemPrompt() {
  const learned = getPrismaLearnedContext();
  return `You are BrandIQ, an elite AI business consultant and brand strategist for Prism Labs — the digital growth division of Prism Edge.
You operate like a senior partner at a top-tier consulting firm — direct, insightful, and always client-outcome focused. You never give generic advice. Every response is specific, actionable, and grounded in the client's actual situation.

# RESPONSE FRAMEWORK
When a user presents a question, problem, or scenario, structure your response using the following framework. DO NOT sound like a rigid questionnaire, but ensure these elements are present in your advice.

1. DIAGNOSIS: Identify the core issue behind the question. Address what actually matters. State the real problem in 1–2 sentences.
2. STRATEGIC ANSWER: Give a clear, direct, professional answer. Use plain language. Be opinionated.
3. DO THIS ✅: List 3–5 specific, prioritized actions. Start with a strong verb, be concrete, include a brief "why".
4. DON'T DO THIS ❌: List 2–4 specific traps or mistakes to avoid. Explain the consequence.
5. CONSULTING INSIGHT: End with one sharp, memorable insight that reframes how the client should think about this problem long-term.

# BEHAVIORAL GUIDELINES
Tone: Authoritative but accessible. Think McKinsey substance with human warmth. Never condescending.
Specificity: Generic advice is malpractice. Always anchor your answer to the client's stated context.
Honesty: If a client's idea is flawed, say so — diplomatically but clearly.
Proactive questions: If input lacks critical context, ask one focused clarifying question before answering.

WHAT YOU NEVER DO:
- Never give a list of options without recommending one.
- Never say "it depends" without explaining what it depends on.
- Never give advice that contradicts itself.

HANDLING GREETINGS:
- If the user simply says "hi", "hello", or offers a casual greeting without any business context, do NOT run the 5-part framework. Instead, reply with a warm, brief, 1-2 sentence greeting and ask them how you can help them with their brand today.

# BRAND ANALYSIS & VISUALIZATION (CRITICAL)
After 4-6 exchanges, you MUST deliver a structured brand analysis. Instead of outputting HTML/SVG charts, you MUST output this exact JSON block at the very end of your response, wrapped in <ANALYSIS> tags. The frontend will automatically generate the chart based on this data.

<ANALYSIS>
{
  "businessName": "Name if mentioned, else 'Your Brand'",
  "scores": {
    "Online Presence": 0-100,
    "Content Quality": 0-100,
    "Target Audience Clarity": 0-100,
    "Conversion Strategy": 0-100,
    "Brand Identity": 0-100
  },
  "working": ["3 genuine strengths based on the conversation"],
  "fix": ["3 specific, honest improvement areas with how to fix each"],
  "roadmap": [
    {"step": "Step name", "detail": "Specific, actionable detail with projected growth impact"},
    {"step": "Step name", "detail": "Specific, actionable detail with projected growth impact"},
    {"step": "Step name", "detail": "Specific, actionable detail with projected growth impact"}
  ],
  "recommendation": "Most relevant Prism Labs service (e.g. Website Development, Digital Marketing, PRISMA AI)"
}
</ANALYSIS>

HISTORICAL CLIENT LEARNINGS TO APPLY:
${learned}`;
}

// ─── STATE ────────────────────────────────────────────────────────────────────
const history = [];
let chartInstance = null;
let turnCount     = 0;
let hasAnalyzed   = false;

// ─── PATTERN LEARNING (Unified API) ───────────────────────────────────────────
async function recordPrismaPattern(userText) {
  try {
    const t = userText.toLowerCase();

    const industryMap = {
      'fashion / clothing': ['cloth', 'fashion', 'wear', 'apparel', 'streetwear'],
      'food & beverage': ['food', 'restaurant', 'catering', 'drink', 'bake'],
      'tech & software': ['app', 'software', 'tech', 'saas', 'platform'],
      'consulting & agency': ['consult', 'agency', 'freelance', 'service'],
      'health & wellness': ['health', 'fitness', 'wellness', 'gym', 'coach'],
      'e-commerce': ['store', 'shop', 'sell', 'product', 'ecommerce'],
      'beauty & lifestyle': ['beauty', 'salon', 'makeup', 'skin', 'lifestyle'],
      'real estate': ['property', 'real estate', 'housing', 'land']
    };

    const challengeMap = {
      'low online visibility': ['not found', 'no traffic', 'no reach', 'invisible', 'no online'],
      'poor conversion': ['no sales', 'not converting', 'visitors but no', 'low sales'],
      'no content strategy': ['content', 'posting', 'social media', 'no strategy'],
      'unclear target audience': ['who to target', 'dont know my customer', 'broad audience'],
      'weak brand identity': ['no brand', 'logo', 'identity', 'inconsistent'],
      'limited budget': ['small budget', 'limited budget', 'low budget', 'cant afford']
    };

    let changed = false;

    for (const [industry, words] of Object.entries(industryMap)) {
      if (words.some(w => t.includes(w))) {
        _prismaPatterns.industries[industry] =
          (_prismaPatterns.industries[industry] || 0) + 1;
        changed = true;
      }
    }

    for (const [challenge, words] of Object.entries(challengeMap)) {
      if (words.some(w => t.includes(w))) {
        _prismaPatterns.challenges[challenge] =
          (_prismaPatterns.challenges[challenge] || 0) + 1;
        changed = true;
      }
    }

    if (changed) {
      localStorage.setItem(
        'prisma_trends',
        JSON.stringify(_prismaPatterns)
      );
    }
  } catch (e) {
    console.warn('[PRISMA] Pattern recording error:', e);
  }
}

async function savePrismaSession(analysis) {
  try {
    const session = {
      industry: history
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ')
        .slice(0, 100),

      keyChallenge:
        (analysis.fix || [])[0] || 'General growth',

      recommendation:
        analysis.recommendation || 'Brand Scaling',

      ts: Date.now()
    };

    _prismaSessions.push(session);

    if (_prismaSessions.length > 20) {
      _prismaSessions.splice(
        0,
        _prismaSessions.length - 20
      );
    }

    localStorage.setItem(
      'prisma_sessions',
      JSON.stringify(_prismaSessions)
    );
  } catch (e) {
    console.warn('[PRISMA] Session save error:', e);
  }
}

// ─── SMART OFFLINE FALLBACK ──────────────────────────────────────────────────
function prismaOfflineReply(userMessage) {
  const tc = turnCount;
  const userHint = userMessage.slice(0, 20);

  if (tc <= 1)
    return `It sounds like you're building something interesting ("${userHint}..."). To give you the most accurate brand analysis, who is your ideal customer — what's their age, interests, and biggest pain point?`;

  if (tc === 2)
    return `That makes perfect sense for that demographic. Now, regarding your digital presence: do you currently have a website? If yes, how effective is it at converting those visitors?`;

  if (tc === 3)
    return `I see. What marketing channels are you using (social media, ads, word of mouth)? And which ones are actually generating real results based on what you just mentioned?`;

  if (tc === 4)
    return `Really helpful context. Last question: what's the #1 thing holding your brand back from growing faster right now? Be as honest as you can.`;

  if (tc === 5)
    return `Thank you for sharing that. Give me a brief moment to analyze everything you've told me...`;

  return null;
}

// ─── AI CALL WITH MODEL FALLBACK ─────────────────────────────────────────────
async function callAI(userMessage) {
  history.push({
    role: 'user',
    content: userMessage
  });

  recordPrismaPattern(userMessage);

  /*
   * Local-first mode.
   *
   * The production AI request will eventually go through
   * a secure Vercel serverless endpoint instead of exposing
   * an API key in browser JavaScript.
   */

  console.log('[PRISMA] Local AI mode');

  const offline = prismaOfflineReply(userMessage);

  if (offline) {
    history.push({
      role: 'assistant',
      content: offline
    });
  }

  return offline;
}


function addMessage(text, sender) {
  const wrap = document.getElementById('chat-messages');
  if (!wrap || !text) return;
  const div = document.createElement('div');
  div.className = sender === 'ai' ? 'msg-ai' : 'msg-user';
  const cleaned = String(text).replace(/<ANALYSIS>[\s\S]*?<\/ANALYSIS>/g, '').trim();

  // Render a deliberately tiny markdown subset without injecting model text as HTML.
  const lines = (cleaned || String(text)).split('\n');
  lines.forEach((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    parts.forEach(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const strong = document.createElement('strong');
        strong.textContent = part.slice(2, -2);
        div.appendChild(strong);
      } else {
        div.appendChild(document.createTextNode(part));
      }
    });
    if (lineIndex < lines.length - 1) div.appendChild(document.createElement('br'));
  });

  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function addTyping() {
  const wrap = document.getElementById('chat-messages');
  if (!wrap) return;
  const div = document.createElement('div');
  div.className = 'msg-ai';
  div.id = 'typing-bubble';
  div.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function removeTyping() {
  document.getElementById('typing-bubble')?.remove();
}

// ─── ANALYSIS PARSING & RENDERING ────────────────────────────────────────────
function parseAnalysis(text) {
  const m = text.match(/<ANALYSIS>([\s\S]*?)<\/ANALYSIS>/);
  if (!m) return null;
  try { return JSON.parse(m[1].trim()); } catch { return null; }
}

function renderAnalysis(data) {
  const placeholder = document.getElementById('analysis-placeholder');
  const out = document.getElementById('analysis-output');
  if (!placeholder || !out) return;

  placeholder.classList.add('hidden');
  out.classList.remove('hidden');
  out.classList.add('analysis-enter');
  requestAnimationFrame(() => out.classList.add('is-visible'));
  buildChart(data);
  buildLists(data);
}

function buildChart(data) {
  if (chartInstance) chartInstance.destroy();
  const ctx = document.getElementById('brandRadar')?.getContext('2d');
  if (!ctx || typeof Chart === 'undefined') return;
  
  chartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: Object.keys(data.scores),
      datasets: [{
        label: 'Brand Strength',
        data: Object.values(data.scores),
        backgroundColor: 'rgba(232,201,122,0.2)',
        borderColor: '#E8C97A',
        borderWidth: 2,
        pointBackgroundColor: '#1A3EBF',
        pointBorderColor: '#E8C97A'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#F5F5F0' } } },
      scales: {
        r: {
          beginAtZero: true, max: 100,
          grid: { color: 'rgba(232,201,122,0.15)' },
          angleLines: { color: 'rgba(232,201,122,0.15)' },
          pointLabels: { color: '#F5F5F0', font: { size: 10 } },
          ticks: { color: '#E8C97A', backdropColor: 'transparent', font: { size: 9 } }
        }
      }
    }
  });
}

function buildLists(data) {
  const workingList = document.getElementById('working-list');
  const fixList = document.getElementById('fix-list');
  const roadmapList = document.getElementById('roadmap-list');
  
  const fillTextList = (node, items) => {
    if (!node) return;
    node.replaceChildren();
    (Array.isArray(items) ? items : []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = `• ${String(item)}`;
      node.appendChild(li);
    });
  };

  fillTextList(workingList, data.working);
  fillTextList(fixList, data.fix);

  if (roadmapList) {
    roadmapList.replaceChildren();
    (Array.isArray(data.roadmap) ? data.roadmap : []).forEach((r, i) => {
      const li = document.createElement('li');
      li.className = 'flex gap-3 analysis-item';
      li.style.opacity = '0';
      li.style.transform = 'translateY(16px)';

      const num = document.createElement('span');
      num.className = 'w-6 h-6 rounded-full bg-prism-gold text-prism-black flex items-center justify-center text-xs font-bold flex-shrink-0';
      num.textContent = String(i + 1);

      const content = document.createElement('div');
      const step = document.createElement('p');
      step.className = 'text-prism-gold text-sm';
      step.textContent = String(r?.step || 'Next step');
      const detail = document.createElement('p');
      detail.className = 'text-prism-pearl/60 text-xs';
      detail.textContent = String(r?.detail || '');
      content.append(step, detail);
      li.append(num, content);
      roadmapList.appendChild(li);
    });

    setTimeout(() => {
      document.querySelectorAll('.analysis-item').forEach((el, i) => {
        setTimeout(() => {
          el.style.transition = 'opacity 0.5s, transform 0.5s';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, i * 200);
      });
    }, 300);
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function initPrismaChat() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  if (!form || !input) return;

  console.log('[PRISMA] Initializing chat...');

  // Reset state and clear DOM to ensure a fresh start on refresh/re-init
  history.length = 0;
  turnCount = 0;
  hasAnalyzed = false;
  const wrap = document.getElementById('chat-messages');
  if (wrap) wrap.innerHTML = '';

  // 1. Load memory from centralized API
  await loadPrismaMemory();

  // Personalised welcome using past knowledge
  const knowledge = JSON.parse(localStorage.getItem('prisma_knowledge') || '{}');
  const topIndustry = Object.entries(_prismaPatterns.industries || {}).sort((a, b) => b[1] - a[1])[0]?.[0];

  let welcomeMsg;
  if (knowledge.businessName && knowledge.businessName !== 'Your Brand') {
    welcomeMsg = `Welcome back! I'm PRISMA, your AI brand strategist. Last time we spoke, I was helping with ${knowledge.businessName}. How have things progressed? Or is there something new you'd like to work on today?`;
  } else if (_prismaSessions.length >= 2 && topIndustry) {
    welcomeMsg = `Hi! I'm PRISMA, the AI brand strategist for Prism Labs. I've been advising a lot of businesses in the ${topIndustry} space recently. What kind of business are you building, and what's your biggest growth challenge right now?`;
  } else {
    welcomeMsg = `Hi! I'm PRISMA, your AI brand strategist from Prism Labs. I'm here to give you a real, honest analysis of your brand's growth potential. Let's start: What does your business do, and who is your ideal customer?`;
  }

  addMessage(welcomeMsg, 'ai');
  history.push({ role: 'assistant', content: welcomeMsg });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;

    addMessage(txt, 'user');
    input.value = '';
    turnCount++;

    addTyping();
    let reply;
    try {
      reply = await callAI(txt);
    } catch(err) {
      console.error('[PRISMA] callAI error:', err);
      reply = prismaOfflineReply(txt);
    }
    removeTyping();
    
    if (reply) {
      addMessage(reply, 'ai');
    } else {
      addMessage('I apologize for the brief interruption. Could you please repeat that? I want to make sure I give you the best possible advice.', 'ai');
    }

    if (!hasAnalyzed) {
      let analysis = reply ? parseAnalysis(reply) : null;

      // Fallback analysis if AI didn't produce JSON after enough turns
      if (!analysis && turnCount >= MAX_TURNS) {
        analysis = {
          businessName: 'Your Brand',
          scores: {
            'Online Presence': 42, 'Content Quality': 58,
            'Target Audience Clarity': 55, 'Conversion Strategy': 35, 'Brand Identity': 65
          },
          working: ['Clear passion and vision for the brand', 'Core product or service defined', 'Existing customer base to build on'],
          fix: ['Digital presence needs significant strengthening — build a professional website immediately', 'No clear content or marketing strategy — create a 30-day content calendar', 'Conversion funnel needs to be optimised — add clear CTAs and lead magnets'],
          roadmap: [
            { step: 'Digital Foundation', detail: 'Build a high-performance, conversion-optimised website. Expected impact: 40-60% increase in customer trust and engagement within 3 months.' },
            { step: 'Audience & Content Strategy', detail: 'Define your ideal customer profile and build a content system. Projected growth: 25-35% increase in organic reach within 60 days.' },
            { step: 'Growth & Acquisition', detail: 'Launch targeted digital marketing campaigns. Industry benchmarks suggest 3-5x ROI on well-targeted campaigns within 90 days.' }
          ],
          recommendation: 'Brand Scaling via Prism Labs'
        };
      }

      if (analysis) {
        hasAnalyzed = true;
        await savePrismaSession(analysis);
        if (analysis.businessName && analysis.businessName !== 'Your Brand') {
          localStorage.setItem('prisma_knowledge', JSON.stringify({ businessName: analysis.businessName }));
        }
        renderAnalysis(analysis);
      }
    }
  });
}

window.initPrismaChat = initPrismaChat;
