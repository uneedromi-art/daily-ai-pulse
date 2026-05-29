process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { loadFeedConfig, parseRssFeed } = require('../scripts/feedConfig');
const { resolveMediumArticle, getPaywallReason } = require('../scripts/mediumUtils');
const { cleanPostText } = require('../scripts/summaryUtils');

(async () => {
    const config = loadFeedConfig();
    const source = config.sources.medium;
    const feedUrls = source.feedUrls || [source.feedUrl];
    const seen = new Set();
    const items = [];

    for (const url of feedUrls) {
        const feed = await parseRssFeed(url);
        for (const item of feed.items) {
            const link = item.link || item.guid;
            if (!link || seen.has(link)) continue;
            seen.add(link);
            items.push(item);
        }
    }

    const maxScan = source.maxScanItems || 60;
    const minBody = source.minBodyChars || 450;
    const scan = items.slice(0, maxScan);

    const stats = {};
    const included = [];
    const recentSkipped = [];

    for (const item of scan) {
        const resolved = await resolveMediumArticle(item, minBody);
        const reason = resolved.skip ? resolved.reason : 'included';
        stats[reason] = (stats[reason] || 0) + 1;

        const pub = item.pubDate ? new Date(item.pubDate).toISOString().slice(0, 10) : '?';
        if (!resolved.skip) {
            included.push({ pub, title: (item.title || '').slice(0, 55), link: item.link });
        } else if (pub >= '2026-05-21') {
            recentSkipped.push({ pub, reason, title: (item.title || '').slice(0, 50) });
        }
    }

    console.log(`Scanned ${scan.length} Medium RSS items (from ${items.length} unique)`);
    console.log('Skip reasons:', stats);
    console.log('\nIncluded (free full-text):');
    included.forEach((x) => console.log(`  ${x.pub} | ${x.title}`));
    console.log('\nSkipped since 2026-05-21 (sample):');
    recentSkipped.slice(0, 12).forEach((x) => console.log(`  ${x.pub} [${x.reason}] ${x.title}`));
})();
