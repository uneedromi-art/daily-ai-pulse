const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');

const DEFAULT_CONFIG = {
    keywords: ['artificial intelligence', 'ai', 'machine learning'],
    keywordMode: 'any',
    sources: {},
};

function loadFeedConfig() {
    const configPath = path.join(process.cwd(), 'public', 'data', 'feed-config.json');
    if (!fs.existsSync(configPath)) {
        console.warn('[feedConfig] feed-config.json not found, using defaults');
        return { ...DEFAULT_CONFIG };
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function keywordMatches(haystack, rawKeyword) {
    const k = rawKeyword.trim().toLowerCase();
    if (!k) return false;
    if (k === 'ai') return /\bai\b/i.test(haystack);
    return haystack.includes(k);
}

function matchesKeywords(text, keywords, mode = 'any') {
    if (!keywords?.length) return true;
    const haystack = (text || '').toLowerCase();
    const checks = keywords
        .map((k) => k.trim())
        .filter(Boolean)
        .map((k) => keywordMatches(haystack, k));
    if (!checks.length) return true;
    return mode === 'all' ? checks.every(Boolean) : checks.some(Boolean);
}

function buildRedditFeedUrl(subreddits) {
    const subs = subreddits.join('+');
    return `https://www.reddit.com/r/${subs}/top/.rss?t=day`;
}

function buildMastodonFeedUrl(tag, limit = 5) {
    return `https://mastodon.social/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=${limit}`;
}

function hasHangul(text) {
    return /[\uac00-\ud7a3]/.test(text || '');
}

function isKoreanCioItem(item) {
    const title = item.title || '';
    const description = item.contentSnippet || item.summary || '';
    if (hasHangul(title) || hasHangul(description)) return true;
    try {
        return hasHangul(decodeURIComponent(item.link || ''));
    } catch {
        return false;
    }
}

function fixMalformedXml(xml) {
    return xml.replace(
        /&(?!amp;|lt;|gt;|quot;|apos;|#[0-9]+;|#x[0-9a-fA-F]+;)/g,
        '&amp;'
    );
}

async function parseRssFeed(feedUrl) {
    const parser = new Parser();
    const headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; DailyAIPulse/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml',
    };

    try {
        return await parser.parseURL(feedUrl);
    } catch (firstError) {
        console.warn(`[RSS] Retrying with XML fix: ${feedUrl} (${firstError.message})`);
        const response = await fetch(feedUrl, { headers });
        if (!response.ok) throw new Error(`RSS HTTP ${response.status}`);
        const xml = fixMalformedXml(await response.text());
        return parser.parseString(xml);
    }
}

module.exports = {
    loadFeedConfig,
    matchesKeywords,
    buildRedditFeedUrl,
    buildMastodonFeedUrl,
    parseRssFeed,
    hasHangul,
    isKoreanCioItem,
};
