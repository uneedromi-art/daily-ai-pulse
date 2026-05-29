process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('../scripts/translateKo').loadEnvLocal();

const fs = require('fs');
const path = require('path');
const { loadFeedConfig, parseRssFeed, matchesKeywords } = require('../scripts/feedConfig');
const { resolveMediumArticle, shouldDropMediumPost } = require('../scripts/mediumUtils');
const { createSummaryBuilder } = require('../scripts/summaryUtils');
const { summarizeToKorean } = require('../scripts/translateKo');
const { SUMMARY_INPUT_CHARS } = require('../scripts/summaryUtils');

const buildKoreanSummary = createSummaryBuilder(summarizeToKorean);

async function fetchMediumDebug(config) {
    const source = config.sources.medium;
    const feedUrls = source.feedUrls || [source.feedUrl];
    const seenLinks = new Set();
    const allItems = [];

    for (const feedUrl of feedUrls) {
        const feed = await parseRssFeed(feedUrl);
        for (const item of feed.items) {
            const link = item.link || item.guid;
            if (!link || seenLinks.has(link)) continue;
            seenLinks.add(link);
            allItems.push(item);
        }
    }

    const results = [];
    const itemLimit = source.limit || 4;
    const maxScan = source.maxScanItems || 50;
    const minBodyChars = source.minBodyChars || 450;

    for (const item of allItems.slice(0, maxScan)) {
        const title = (item.title || '').trim();
        const resolved = await resolveMediumArticle(item, minBodyChars);
        if (resolved.skip) continue;

        const body = resolved.body;
        const searchText = `${title} ${body}`;
        if (!matchesKeywords(searchText, config.keywords, config.keywordMode)) {
            console.log('keyword skip:', title.slice(0, 45));
            continue;
        }

        const post = {
            id: item.link || item.guid || `medium-${title}`,
            platform: 'Medium',
            title,
            content: body,
            summary_ko: await buildKoreanSummary(body, { maxChars: SUMMARY_INPUT_CHARS }),
            url: item.link,
            date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        };

        const drop = shouldDropMediumPost(post);
        console.log(drop ? 'DROP after summary:' : 'KEEP:', title.slice(0, 50), drop ? shouldDropMediumPost(post) : '');
        if (drop) continue;

        results.push(post);
        if (results.length >= itemLimit) break;
    }

    return results;
}

(async () => {
    const config = loadFeedConfig();
    const existing = JSON.parse(fs.readFileSync('public/data/news.json', 'utf8'));
    const fetched = await fetchMediumDebug(config);

    console.log('\nFetched', fetched.length);
    fetched.forEach((p) => console.log(' ', p.date.slice(0, 10), p.id.slice(0, 55)));

    const combined = [...existing, ...fetched];
    const unique = Array.from(new Map(combined.map((i) => [i.id, i])).values())
        .filter((i) => !shouldDropMediumPost(i));

    console.log('\nMedium in merged:', unique.filter((i) => i.platform === 'Medium').length);
    unique.filter((i) => i.platform === 'Medium').forEach((p) => {
        console.log(' ', p.date.slice(0, 10), p.title.slice(0, 50));
    });
})();
