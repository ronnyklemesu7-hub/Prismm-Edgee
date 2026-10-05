// ─── PRISM ADVISOR — AI-POWERED BUSINESS GROWTH CONSULTANT ────────────────────
// Personality: ScaleIQ — Elite business advisor for founders, operators, leaders
// Uses OpenRouter AI with full conversation history + learns from past consultations

const ADVISOR_MODEL = 'deepseek/deepseek-chat-v3-0324:free';

// ─── LEARNED CONTEXT ─────────────────────────────────────────────────────────
function getAdvisorLearnedContext() {
    const trends = JSON.parse(localStorage.getItem('pl_advisor_trends') || '{}');
    const sessions = JSON.parse(localStorage.getItem('pl_advisor_sessions') || '[]');

    let ctx = '';

    const sorted = Object.entries(trends).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (sorted.length) {
        ctx += `\n\nLEARNED FROM PAST CLIENTS: Most common growth challenges: ${sorted.map(([k, v]) => `"${k}" (${v} businesses)`).join(', ')}. Use this to offer proactive insights.`;
    }

    if (sessions.length) {
        const recent = sessions.slice(-5);
        const bullets = recent.map(s => `- ${s.challenge}: "${s.action}"`).join('\n');
        ctx += `\n\nRECENT CLIENT PATTERNS:\n${bullets}\nApply these strategic patterns to inform your recommendations.`;
    }

    return ctx;
}

function buildAdvisorSystemPrompt() {
    const learned = getAdvisorLearnedContext();
    return `You are ScaleIQ, an elite AI business growth advisor embedded in PRISM LABS — a premium brand and business scaling division of PRISM EDGE.

YOU ARE SCALEIQ — A BRILLIANT, TRUSTED ADVISOR
Personality:
- Professional but warm and direct — like a trusted advisor genuinely excited about their client's success
- Never stiff, never generic, no filler phrases
- Confident, clear, occasionally candid about trade-offs
- You sound like a knowledgeable expert, not a bot

YOUR EXPERTISE:
- Revenue growth and pricing strategy
- Operational efficiency and bottleneck removal
- Go-to-market and marketing strategy
- Hiring decisions and org structure
- Fundraising readiness and investor narrative
- Competitive positioning and market analysis
- Financial modeling and unit economics
- Market segmentation and CAC/LTV analysis

HOW YOU ADVISE:
1. Ask ONE targeted clarifying question when you need context before giving full advice
2. Reference real frameworks (unit economics, CAC/LTV, burn rate, OKRs, etc.) in plain language
3. Structure analysis as: Insight → Implication → Action
4. Use short paragraphs — never walls of text
5. Prioritize recommendations (what to do first, second, third)
6. Acknowledge trade-offs honestly — scaling is about smart choices, not magic

YOUR RULES:
- Never give vague advice — always be specific and actionable
- If the client gives you data (revenue, team size, churn, etc.), USE IT in your analysis
- If critical information is missing, ask for it before advising — don't make assumptions
- Always end with either a smart follow-up question OR a clear next step they can take TODAY
- If they seem stuck or overwhelmed, narrow the focus — help them identify the ONE most important thing to solve first

CONTEXT ABOUT PRISM LABS:
- Prism Labs is the brand scaling division of Prism Edge
- We help brands go from invisible to dominant through strategic positioning, premium design, and data-driven growth
- Our services include brand strategy, website development, digital marketing, AI consulting, and e-commerce

Your primary goal is to be genuinely useful and help them scale smartly.${learned}`;
}

// ─── STATE ────────────────────────────────────────────────────────────────────
let advisorHistory = [];
let advisorHasLoggedLead = false;

// ─── SMART OFFLINE FALLBACK ──────────────────────────────────────────────────
function smartAdvisorOfflineReply(userMessage) {
    const t = userMessage.toLowerCase();

    if (/hi|hello|hey|good (morning|afternoon|evening)|what|help|stuck|challenge/i.test(t))
        return `Hey! I'm ScaleIQ — your AI business growth partner from Prism Labs. I help founders and operators make smarter scaling decisions. What stage is your business at, and what's your biggest challenge? (e.g., "We're at $500K MRR but growth is stalling" or "We need to hire our first 3 people")`;

    if (/revenue|mrr|arr|sales|income|earn/i.test(t))
        return `Revenue is critical to understand. What's your current revenue (MRR, ARR, or annual), and how fast has it been growing over the past 6-12 months? Also — are you profitable or burning cash? This context will help me spot your real bottleneck.`;

    if (/team|hire|hiring|staff|people|founder|ceo|culture/i.test(t))
        return `Team composition is huge at every stage. How many people do you have now, and what roles? Also — what's the breakdown (technical, sales, ops)? Knowing your setup helps me advise on what's next.`;

    if (/price|pricing|cost|value|margin|profit|burn|money|funding/i.test(t))
        return `Unit economics are everything. Walk me through: what's your average customer value, how much does it cost you to acquire one (CAC), and how long do they stay (LTV)? These numbers tell me whether your model can scale.`;

    if (/market|customer|audience|segment|positioning|compete|competitor/i.test(t))
        return `Market clarity is foundational. Who are your ideal customers (be specific — industry, size, geography, pain point), and why do they choose you over competitors? That's the first thing to nail.`;

    if (/growth|scale|expand|next|bottleneck|stuck/i.test(t))
        return `Growth hits ceilings — usually it's product, positioning, or process. Tell me: where are you right now, and what did you try last that didn't work? That tells me what your real constraint is.`;

    if (/marketing|ads|content|seo|social|launch|gtm/i.test(t))
        return `Go-to-market strategy shapes everything. How are you currently getting customers (organic, paid, partnerships, referrals)? What's working, what's not, and what's your cost per acquisition?`;

    if (/hire|budget|invest|spend|roi/i.test(t))
        return `Spend decisions should be tied to metrics. Before hiring or investing, we need to know: what specific bottleneck will this solve, and how will you measure the ROI? What's the real problem you're trying to solve?`;

    if (/contact|next|how|connect|email|whatsapp|schedule/i.test(t))
        return `Ready to go deeper? Share your email or WhatsApp, and the Prism Labs team will set up a proper 1:1 strategy session where we can model your unit economics and build a concrete roadmap.`;

    const generic = [
        `Interesting angle. To give you sharp advice — what's your current situation? (revenue, team size, main bottleneck)`,
        `Good question. Give me 30 seconds on your business — industry, stage, revenue, and what's blocking growth right now.`,
        `Context helps me be more useful — what's your biggest growth challenge in the next 3 months? 🎯`,
    ];
    return generic[Math.floor(Math.random() * generic.length)];
}

// ─── AI CALL WITH MULTI-PROXY FALLBACK ───────────────────────────────────────
async function callAdvisorAI(userMessage) {
    advisorHistory.push({ role: 'user', content: userMessage });

    const apiUrl = null; // Local-first build: AI will use the secure Vercel backend later.
    const proxies = [
        'https://edge.flowith.io/api-proxy/' + encodeURIComponent(apiUrl),
        'https://corsproxy.io/?' + encodeURIComponent(apiUrl),
        apiUrl
    ];

    const body = JSON.stringify({
        model: ADVISOR_MODEL,
        messages: [
            { role: 'system', content: buildAdvisorSystemPrompt() },
            ...advisorHistory
        ],
        temperature: 0.75,
        max_tokens: 400
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
                advisorHistory.push({ role: 'assistant', content: reply });
                return reply;
            }
        } catch (e) {
            console.warn('Advisor proxy failed, trying next...', url, e.message);
        }
    }

    const offline = smartAdvisorOfflineReply(userMessage);
    advisorHistory.push({ role: 'assistant', content: offline });
    return offline;
}

// ─── TREND & SESSION LEARNING ─────────────────────────────────────────────────
function recordAdvisorTrend(text) {
    const lower = text.toLowerCase();
    const trends = JSON.parse(localStorage.getItem('pl_advisor_trends') || '{}');
    const keywords = {
        'revenue': ['revenue', 'mrr', 'arr', 'sales', 'income', 'earnings'],
        'team': ['team', 'hire', 'hiring', 'staff', 'people', 'founder', 'ceo'],
        'pricing': ['price', 'pricing', 'cost', 'margin', 'profit', 'burn'],
        'market': ['market', 'customer', 'audience', 'segment', 'positioning', 'compete'],
        'growth': ['growth', 'scale', 'expand', 'bottleneck', 'stuck'],
        'marketing': ['marketing', 'ads', 'seo', 'social', 'content', 'gtm', 'launch'],
    };
    for (const [key, words] of Object.entries(keywords)) {
        if (words.some(w => lower.includes(w))) {
            trends[key] = (trends[key] || 0) + 1;
        }
    }
    localStorage.setItem('pl_advisor_trends', JSON.stringify(trends));
}

function saveAdvisorSessionInsight(challenge, action) {
    const sessions = JSON.parse(localStorage.getItem('pl_advisor_sessions') || '[]');
    sessions.push({ challenge, action, ts: Date.now() });
    if (sessions.length > 20) sessions.splice(0, sessions.length - 20);
    localStorage.setItem('pl_advisor_sessions', JSON.stringify(sessions));
}

// ─── LEAD LOGGING ─────────────────────────────────────────────────────────────
function logAdvisorLead(text) {
    if (advisorHasLoggedLead) return;
    advisorHasLoggedLead = true;

    const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || 'Not provided';
    const phone = text.match(/\+?[\d\s\-()]{7,}/)?.[0]?.trim() || 'Not provided';
    const convo = advisorHistory
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' | ');

    const leadData = {
        name: 'ScaleIQ Consultation Lead',
        email,
        phone,
        challenge: convo.substring(0, 200),
        source: 'scaleiq_chat',
        timestamp: new Date().toISOString()
    };

    fetch('https://n8n.edge.flowith.io/webhook/prism-labs-scaleiq-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
    }).catch(e => console.warn('Lead log failed (offline OK):', e.message));
}

// Export for use in chat.js
window.callAdvisorAI = callAdvisorAI;
window.recordAdvisorTrend = recordAdvisorTrend;
window.saveAdvisorSessionInsight = saveAdvisorSessionInsight;
window.logAdvisorLead = logAdvisorLead;
window.smartAdvisorOfflineReply = smartAdvisorOfflineReply;
window.advisorHistory = () => advisorHistory;
