const STORAGE_KEY = 'daily-ai-pulse-feed-config';

function keywordMatches(haystack, rawKeyword) {
    const k = rawKeyword.trim().toLowerCase();
    if (!k) return false;
    if (k === 'ai') return /\bai\b/i.test(haystack);
    return haystack.includes(k);
}

export function matchesKeywords(text, keywords, mode = 'any') {
    if (!keywords?.length) return true;
    const haystack = (text || '').toLowerCase();
    const checks = keywords
        .map((k) => k.trim())
        .filter(Boolean)
        .map((k) => keywordMatches(haystack, k));
    if (!checks.length) return true;
    return mode === 'all' ? checks.every(Boolean) : checks.some(Boolean);
}

export function postMatchesKeywords(post, keywords, mode) {
    const text = [post.content, post.summary_ko, post.author?.name, post.platform]
        .filter(Boolean)
        .join(' ');
    return matchesKeywords(text, keywords, mode);
}

export async function fetchFeedConfig() {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const res = await fetch(`${base}/data/feed-config.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load feed-config.json');
    return res.json();
}

export function loadUserFeedConfig() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveUserFeedConfig(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearUserFeedConfig() {
    localStorage.removeItem(STORAGE_KEY);
}

export function mergeFeedConfig(base, override) {
    if (!override) return base;
    return {
        ...base,
        ...override,
        keywords: override.keywords ?? base.keywords,
        keywordMode: override.keywordMode ?? base.keywordMode,
    };
}

export function downloadFeedConfig(config) {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feed-config.json';
    a.click();
    URL.revokeObjectURL(url);
}
