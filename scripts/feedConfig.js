const fs = require('fs');
const path = require('path');

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

function matchesKeywords(text, keywords, mode = 'any') {
    if (!keywords?.length) return true;
    const haystack = (text || '').toLowerCase();
    const checks = keywords
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
        .map((k) => haystack.includes(k));
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

module.exports = {
    loadFeedConfig,
    matchesKeywords,
    buildRedditFeedUrl,
    buildMastodonFeedUrl,
};
