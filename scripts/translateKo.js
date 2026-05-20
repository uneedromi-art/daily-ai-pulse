/**
 * 한국어 번역 — 품질 우선순위:
 * 1. OpenAI (OPENAI_API_KEY)
 * 2. Google Gemini (GEMINI_API_KEY)
 * 3. DeepL (DEEPL_AUTH_KEY)
 * 4. Papago (PAPAGO_CLIENT_ID + PAPAGO_CLIENT_SECRET)
 * 5. google-translate-api-x (키 없을 때 폴백)
 */

const fs = require('fs');
const path = require('path');
const { translate } = require('google-translate-api-x');

const SYSTEM_PROMPT = `당신은 한국 IT·AI 뉴스 편집자입니다. SNS/뉴스 원문을 한국 독자용 **자연스러운 요약 문장**으로 옮깁니다.

규칙:
- 직역·사전식 번역 금지. 뉴스 헤드라인/카드 요약 톤으로 씁니다.
- "can't wait to ~" → "곧 ~할 예정", "~ 출시를 앞두고" 등 (「기다릴 수 없다」 금지)
- "loses court battle" → "법정에서 패배", "소송에서 패소" 등 자연스러운 표현
- 고유명사(OpenAI, Qwen, Sam Altman)는 통용 표기 유지
- 이모지·URL·해시태그는 제거하거나 본문 흐름에 맞게만 반영
- **한국어만** 출력 (설명·따옴표 없이 1~3문장)`;

function loadEnvLocal() {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return;

    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
    }
}

loadEnvLocal();

function detectProvider() {
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.GEMINI_API_KEY) return 'gemini';
    if (process.env.DEEPL_AUTH_KEY) return 'deepl';
    if (process.env.PAPAGO_CLIENT_ID && process.env.PAPAGO_CLIENT_SECRET) return 'papago';
    return 'google';
}

let cachedProvider = null;

function getProvider() {
    if (!cachedProvider) {
        cachedProvider = detectProvider();
        console.log(`[translateKo] provider: ${cachedProvider}`);
    }
    return cachedProvider;
}

async function translateWithOpenAI(text) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            temperature: 0.25,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: text },
            ],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
}

async function translateWithGemini(text) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text }] }],
            generationConfig: { temperature: 0.25 },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

async function translateWithDeepL(text) {
    const params = new URLSearchParams({
        text,
        target_lang: 'KO',
        formality: 'default',
    });

    const res = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
            Authorization: `DeepL-Auth-Key ${process.env.DEEPL_AUTH_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`DeepL ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.translations?.[0]?.text?.trim() || '';
}

async function translateWithPapago(text) {
    const res = await fetch('https://naveropenapi.apigw.ntruss.com/nmt/v1/translation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-NCP-APIGW-API-KEY-ID': process.env.PAPAGO_CLIENT_ID,
            'X-NCP-APIGW-API-KEY': process.env.PAPAGO_CLIENT_SECRET,
        },
        body: JSON.stringify({ source: 'auto', target: 'ko', text }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Papago ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.message?.result?.translatedText?.trim() || '';
}

async function translateWithGoogle(text) {
    const res = await translate(text, { to: 'ko', forceBatch: false });
    return res.text?.trim() || '';
}

/** 직역 흔적을 최소한으로 다듬음 (폴백용) */
function polishLiteralKorean(text) {
    if (!text) return text;

    const rules = [
        [/(.+?)\s*출시를\s*기다릴\s*수\s*없(?:습니다|다)?/gi, '$1, 곧 새 버전을 내놓을 조짐입니다'],
        [/(.+?)\s*를\s*기다릴\s*수\s*없(?:습니다|다)?/gi, '$1을(를) 곧 공개할 것으로 보입니다'],
        [/기다릴\s*수\s*없(?:습니다|다|어요)?/gi, '곧 발표할 예정입니다'],
        [/법정\s*공방에서\s*패했/gi, '법정에서 패배했'],
        [/획기적인\s*소송에서\s*패소/gi, '소송에서 패소'],
        [/너무\s*잘(?:한|되)(?:\s*것\s*같(?:고|아요))?/gi, '비정상적으로 정교해 보입니다'],
    ];

    let out = text;
    for (const [pattern, replacement] of rules) {
        out = out.replace(pattern, replacement);
    }
    return out;
}

async function translateToKorean(text) {
    if (!text?.trim()) return '';

    const provider = getProvider();
    const delay = Number(process.env.TRANSLATE_DELAY_MS || 350);
    await new Promise((r) => setTimeout(r, delay));

    try {
        let result = '';
        switch (provider) {
            case 'openai':
                result = await translateWithOpenAI(text);
                break;
            case 'gemini':
                result = await translateWithGemini(text);
                break;
            case 'deepl':
                result = await translateWithDeepL(text);
                break;
            case 'papago':
                result = await translateWithPapago(text);
                break;
            default:
                result = await translateWithGoogle(text);
                result = polishLiteralKorean(result);
                break;
        }

        if (!result) throw new Error('Empty translation');
        return result;
    } catch (e) {
        console.warn(`[translateKo] ${provider} failed: ${e.message}`);

        if (provider !== 'google') {
            try {
                const fallback = await translateWithGoogle(text);
                return polishLiteralKorean(fallback);
            } catch {
                return text;
            }
        }
        return text;
    }
}

module.exports = {
    translateToKorean,
    getProvider,
    loadEnvLocal,
};
