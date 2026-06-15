
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Parser = require('rss-parser');
const { cleanPostText, createSummaryBuilder, clipToMaxChars } = require('./summaryUtils');
const { summarizeToKorean, loadEnvLocal } = require('./translateKo');
const {
    loadFeedConfig,
    matchesKeywords,
    buildRedditFeedUrl,
    parseRssFeed,
    isKoreanCioItem,
} = require('./feedConfig');
const {
    resolveMediumArticle,
    shouldDropMediumPost,
} = require('./mediumUtils');

const { SUMMARY_INPUT_CHARS } = require('./summaryUtils');


loadEnvLocal();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ENABLE_TWITTER = process.env.ENABLE_TWITTER === 'true';
const buildKoreanSummary = createSummaryBuilder(summarizeToKorean);

let existingSummaryById = new Map();

function loadExistingPosts(outputPath) {
    if (!fs.existsSync(outputPath)) return [];
    try {
        return JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    } catch (e) {
        console.warn('Could not read existing news.json', e.message);
        return [];
    }
}

async function summaryFor(postId, sourceText, options = {}) {
    if (postId && existingSummaryById.has(postId) && process.env.REFRESH_SUMMARIES !== 'true') {
        return existingSummaryById.get(postId);
    }
    return buildKoreanSummary(sourceText, options);
}

function shouldIncludeItem(itemText, sourceConfig, config) {
    if (!sourceConfig.filterByKeywords) return true;
    return matchesKeywords(itemText, config.keywords, config.keywordMode);
}

async function fetchWithTimeout(promise, name, ms = 15000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Service '${name}' timed out`)), ms);
        promise
            .then((value) => { clearTimeout(timer); resolve(value); })
            .catch((reason) => { clearTimeout(timer); reject(reason); });
    });
}

async function fetchReddit(config) {
    const source = config.sources.reddit;
    if (!source?.enabled) return [];

    console.log('Fetching Reddit...');
    const feedUrl = buildRedditFeedUrl(source.subreddits);

    try {
        const parser = new Parser();
        const response = await fetch(feedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DailyAIPulse/1.0)',
            },
        });
        if (!response.ok) throw new Error(`Reddit HTTP ${response.status}`);
        const feed = await parser.parseString(await response.text());

        const results = [];
        for (const item of feed.items.slice(0, source.limit || 4)) {
            const text = item.title || '';
            if (!shouldIncludeItem(text, source, config)) continue;

            let imageUrl = null;
            const content = item.content || '';
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) imageUrl = imgMatch[1].replace(/&amp;/g, '&');

            const postId = item.guid || item.link;
            results.push({
                id: postId,
                platform: 'Reddit',
                title: item.title,
                author: {
                    name: item.author || 'Reddit User',
                    handle: '/u/' + (item.author || 'user'),
                    avatar_color: '#ff4500',
                },
                content: item.title,
                summary_ko: await summaryFor(postId, item.title, { isTitle: true, maxChars: SUMMARY_INPUT_CHARS }),
                url: item.link,
                image: imageUrl,
                date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                likes: 0,
                comments: 0,
            });
        }
        return results;
    } catch (e) {
        console.error('Reddit Fetch Failed:', e.message);
        return [];
    }
}

async function fetchCio(config) {
    const source = config.sources.cio;
    if (!source?.enabled || !source.feedUrl) return [];

    console.log('Fetching CIO (Korean + English)...');

    try {
        const feed = await parseRssFeed(source.feedUrl);
        const results = [];
        const koLimit = source.koreanLimit ?? source.limit ?? 5;
        const enLimit = source.englishLimit ?? source.limit ?? 5;
        const maxScan = source.maxScanItems || 40;
        let koCount = 0;
        let enCount = 0;
        const fetchLog = {
            generatedAt: new Date().toISOString(),
            feedUrl: source.feedUrl,
            keywords: config.keywords,
            keywordMode: config.keywordMode,
            included: [],
            skipped: [],
        };

        for (const item of feed.items.slice(0, maxScan)) {
            const title = (item.title || '').trim();
            const description = cleanPostText(item.contentSnippet || item.summary || '');
            const searchText = `${title} ${description}`;
            const isKo = isKoreanCioItem(item);

            if (!shouldIncludeItem(searchText, source, config)) {
                fetchLog.skipped.push({ title, lang: isKo ? 'ko' : 'en', reason: 'keyword' });
                continue;
            }
            if (isKo && koCount >= koLimit) {
                fetchLog.skipped.push({ title, lang: 'ko', reason: 'koreanLimit' });
                continue;
            }
            if (!isKo && enCount >= enLimit) {
                fetchLog.skipped.push({ title, lang: 'en', reason: 'englishLimit' });
                continue;
            }

            let imageUrl = null;
            const html = item['content:encoded'] || item.content || '';
            const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) imageUrl = imgMatch[1];

            const postId = item.link || item.guid || `cio-${title}`;
            const summaryKo = isKo
                ? clipToMaxChars(description && description.length > 40 ? description : title)
                : await summaryFor(
                    postId,
                    description.length > 80 ? `${title}. ${description}` : title,
                    { maxChars: SUMMARY_INPUT_CHARS }
                );

            results.push({
                id: postId,
                platform: 'CIO',
                title,
                lang: isKo ? 'ko' : 'en',
                author: {
                    name: 'CIO 코리아',
                    handle: '@CIO_KR',
                    avatar_color: '#E51937',
                    avatar_url: null,
                },
                content: title,
                summary_ko: summaryKo,
                url: item.link,
                image: imageUrl,
                date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                likes: 0,
                comments: 0,
            });

            fetchLog.included.push({ title, lang: isKo ? 'ko' : 'en', url: item.link });
            if (isKo) koCount += 1;
            else enCount += 1;
        }

        const logPath = path.join(process.cwd(), 'public', 'data', 'cio-fetch-log.json');
        fetchLog.summary = { korean: koCount, english: enCount, total: results.length };
        fs.writeFileSync(logPath, JSON.stringify(fetchLog, null, 2));

        console.log(`CIO: ${results.length} articles (KO ${koCount}, EN ${enCount})`);
        return results;
    } catch (e) {
        console.error('CIO Fetch Failed:', e.message);
        return [];
    }
}

async function fetchMedium(config) {
    const source = config.sources.medium;
    if (!source?.enabled || !source.feedUrl) return [];

    console.log('Fetching Medium (free full-text only)...');

    try {
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
        let skippedPaywall = 0;

        for (const item of allItems.slice(0, maxScan)) {
            const title = (item.title || '').trim();
            const resolved = await resolveMediumArticle(item, minBodyChars);

            if (resolved.skip) {
                skippedPaywall += 1;
                continue;
            }

            const body = resolved.body;

            const searchText = `${title} ${body}`;
            if (!shouldIncludeItem(searchText, source, config)) continue;

            let imageUrl = null;
            const html = item['content:encoded'] || item.content || '';
            const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) imageUrl = imgMatch[1];

            const postId = item.link || item.guid || `medium-${title}`;
            results.push({
                id: postId,
                platform: 'Medium',
                title,
                author: {
                    name: item.creator || 'Medium',
                    handle: '@medium',
                    avatar_color: '#000000',
                    avatar_url: null,
                },
                content: body,
                summary_ko: await summaryFor(postId, body, { maxChars: SUMMARY_INPUT_CHARS }),
                url: item.link,
                image: imageUrl,
                date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                likes: 0,
                comments: 0,
            });

            if (results.length >= itemLimit) break;
        }

        console.log(`Medium: ${results.length} free articles (${skippedPaywall} paywalled/teaser skipped)`);
        return results;
    } catch (e) {
        console.error('Medium Fetch Failed:', e.message);
        return [];
    }
}


async function fetchRssFeed(config, sourceKey, platformMeta) {
    const source = config.sources[sourceKey];
    if (!source?.enabled || !source.feedUrl) return [];

    console.log(`Fetching ${platformMeta.platform}...`);

    try {
        const feed = await parseRssFeed(source.feedUrl);
        const results = [];

        const itemLimit = source.limit || 4;
        const maxScan = source.maxScanItems || Math.max(itemLimit * 8, 24);

        for (const item of feed.items.slice(0, maxScan)) {
            const title = item.title || '';
            const description = item.contentSnippet || item.summary || '';
            const body = cleanPostText(
                item['content:encoded'] || item.content || description
            );
            const searchText = `${title} ${description} ${body}`;

            if (!shouldIncludeItem(searchText, source, config)) continue;

            let imageUrl = null;
            const html = item['content:encoded'] || item.content || '';
            const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) imageUrl = imgMatch[1];

            const sourceForSummary = body.length > 120
                ? body
                : description.length > 80
                    ? `${title}. ${description}`
                    : title;

            const postId = item.link || item.guid || `${sourceKey}-${item.title}`;
            results.push({
                id: postId,
                platform: platformMeta.platform,
                title,
                author: {
                    name: platformMeta.authorName,
                    handle: platformMeta.authorHandle,
                    avatar_color: platformMeta.avatarColor,
                    avatar_url: platformMeta.avatarUrl || null,
                },
                content: body || title,
                summary_ko: await summaryFor(postId, sourceForSummary, { maxChars: SUMMARY_INPUT_CHARS }),
                url: item.link,
                image: imageUrl,
                date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                likes: 0,
                comments: 0,
            });

            if (results.length >= itemLimit) break;
        }
        return results;
    } catch (e) {
        console.error(`${platformMeta.platform} Fetch Failed:`, e.message);
        return [];
    }
}

async function fetchTwitter() {
    console.log('Fetching Twitter (via Playwright)...');
    return new Promise((resolve) => {
        exec('node devtools/archive/twitter/fetch_twitter_browser.js', { maxBuffer: 1024 * 1024 * 5 }, async (error, stdout, stderr) => {
            if (stderr) console.error(`[Browser Log]: ${stderr}`);
            if (error) {
                console.error(`Twitter Browser Error: ${error.message}`);
                resolve([]);
                return;
            }
            try {
                const output = stdout.trim();
                const jsonStartIndex = output.indexOf('[');
                const jsonEndIndex = output.lastIndexOf(']');
                if (jsonStartIndex === -1) throw new Error('No JSON array found');
                const posts = JSON.parse(output.substring(jsonStartIndex, jsonEndIndex + 1));
                for (const post of posts) {
                    post.summary_ko = await summaryFor(post.id, post.content, { maxChars: SUMMARY_INPUT_CHARS });
                }
                resolve(posts);
            } catch (e) {
                console.error('Failed to parse Twitter JSON:', e.message);
                resolve([]);
            }
        });
    });
}

async function main() {
    const config = loadFeedConfig();
    const outputPath = path.join(process.cwd(), 'public', 'data', 'news.json');
    const existingPosts = loadExistingPosts(outputPath);
    existingSummaryById = new Map(
        existingPosts.filter((p) => p.summary_ko).map((p) => [p.id, p.summary_ko])
    );

    console.log('Starting Daily News Fetch...');
    console.log(`Keywords (${config.keywordMode}): ${config.keywords.join(', ')}`);
    if (process.env.USE_FREE_TRANSLATE === 'true') {
        console.log('[fetch] USE_FREE_TRANSLATE=true — 무료 번역 모드 (Gemini/OpenAI 미사용)');
    }
    if (existingPosts.length > 0) {
        console.log(`Loaded ${existingPosts.length} existing items (${existingSummaryById.size} summaries cached).`);
    }

    const fetchTasks = [
        fetchWithTimeout(fetchReddit(config), 'Reddit', 180000),
        fetchWithTimeout(
            fetchRssFeed(config, 'google', {
                platform: 'Google',
                authorName: 'Google Research',
                authorHandle: '@GoogleAI',
                avatarColor: '#4285F4',
            }),
            'Google',
            180000
        ),
        fetchWithTimeout(fetchCio(config), 'CIO', 300000),
        fetchWithTimeout(fetchMedium(config), 'Medium', 180000),
    ];

    if (ENABLE_TWITTER) {
        fetchTasks.push(fetchWithTimeout(fetchTwitter(), 'Twitter', 120000));
    } else {
        console.log('Skipping Twitter/X (ENABLE_TWITTER is not true)');
    }

    const fetchTaskNames = ['Reddit', 'Google', 'CIO', 'Medium'];
    if (ENABLE_TWITTER) fetchTaskNames.push('Twitter');

    const results = await Promise.allSettled(fetchTasks);
    const allPosts = [];
    results.forEach((res, index) => {
        const name = fetchTaskNames[index] || `task-${index}`;
        if (res.status === 'fulfilled') {
            allPosts.push(...res.value);
        } else {
            console.error(`[fetch] ${name} failed:`, res.reason?.message || res.reason);
        }
    });

    const combinedPosts = [...existingPosts, ...allPosts];
    const uniquePosts = Array.from(new Map(combinedPosts.map((item) => [item.id, item])).values())
        .filter((item) => !shouldDropMediumPost(item));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recentPosts = uniquePosts
        .filter((item) => item.platform !== 'Mastodon')
        .filter((item) => !shouldDropMediumPost(item))
        .filter((item) => new Date(item.date) > cutoff)
        .map((item) => ({
            ...item,
            summary_ko: item.summary_ko ? clipToMaxChars(item.summary_ko) : item.summary_ko,
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    fs.writeFileSync(outputPath, JSON.stringify(recentPosts, null, 2));
    console.log(`Saved ${recentPosts.length} items to ${outputPath}`);
}

main();
