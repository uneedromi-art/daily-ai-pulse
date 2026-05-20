
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Parser = require('rss-parser');
const { cleanPostText, createSummaryBuilder } = require('./summaryUtils');
const { translateToKorean, loadEnvLocal } = require('./translateKo');
const {
    loadFeedConfig,
    matchesKeywords,
    buildRedditFeedUrl,
    buildMastodonFeedUrl,
} = require('./feedConfig');

loadEnvLocal();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ENABLE_TWITTER = process.env.ENABLE_TWITTER === 'true';
const buildKoreanSummary = createSummaryBuilder(translateToKorean);

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

            results.push({
                id: item.guid || item.link,
                platform: 'Reddit',
                author: {
                    name: item.author || 'Reddit User',
                    handle: '/u/' + (item.author || 'user'),
                    avatar_color: '#ff4500',
                },
                content: item.title,
                summary_ko: await buildKoreanSummary(item.title, { isTitle: true }),
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

async function fetchMastodon(config) {
    const source = config.sources.mastodon;
    if (!source?.enabled) return [];

    console.log(`Fetching Mastodon #${source.tag}...`);
    const apiUrl = buildMastodonFeedUrl(source.tag, source.limit || 5);

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Mastodon HTTP ${response.status}`);
        const data = await response.json();

        const results = [];
        for (const post of data) {
            const decodedContent = cleanPostText(post.content.replace(/<[^>]*>?/gm, ''));
            if (!shouldIncludeItem(decodedContent, source, config)) continue;

            results.push({
                id: post.id,
                platform: 'Mastodon',
                author: {
                    name: post.account.display_name,
                    handle: `@${post.account.username}`,
                    avatar_color: '#6364ff',
                    avatar_url: post.account.avatar_static,
                },
                content: decodedContent,
                summary_ko: await buildKoreanSummary(decodedContent),
                url: post.url,
                date: post.created_at,
                likes: post.favourites_count,
                comments: post.replies_count,
            });
        }
        return results;
    } catch (e) {
        console.error('Mastodon Fetch Failed:', e.message);
        return [];
    }
}

async function fetchRssFeed(config, sourceKey, platformMeta) {
    const source = config.sources[sourceKey];
    if (!source?.enabled || !source.feedUrl) return [];

    console.log(`Fetching ${platformMeta.platform}...`);

    try {
        const parser = new Parser();
        const feed = await parser.parseURL(source.feedUrl);
        const results = [];

        for (const item of feed.items.slice(0, source.limit || 4)) {
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

            const sourceForSummary = description.length > 80
                ? `${title}. ${description}`
                : title;

            results.push({
                id: item.guid || item.link,
                platform: platformMeta.platform,
                author: {
                    name: platformMeta.authorName,
                    handle: platformMeta.authorHandle,
                    avatar_color: platformMeta.avatarColor,
                    avatar_url: platformMeta.avatarUrl || null,
                },
                content: title + (description ? `\n\n${description}` : ''),
                summary_ko: await buildKoreanSummary(sourceForSummary),
                url: item.link,
                image: imageUrl,
                date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                likes: 0,
                comments: 0,
            });
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
                    post.summary_ko = await buildKoreanSummary(post.content);
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
    console.log('Starting Daily News Fetch...');
    console.log(`Keywords (${config.keywordMode}): ${config.keywords.join(', ')}`);

    const fetchTasks = [
        fetchWithTimeout(fetchReddit(config), 'Reddit'),
        fetchWithTimeout(fetchMastodon(config), 'Mastodon', 120000),
        fetchWithTimeout(
            fetchRssFeed(config, 'google', {
                platform: 'Google',
                authorName: 'Google Research',
                authorHandle: '@GoogleAI',
                avatarColor: '#4285F4',
            }),
            'Google'
        ),
        fetchWithTimeout(
            fetchRssFeed(config, 'cio', {
                platform: 'CIO',
                authorName: 'CIO.com',
                authorHandle: '@CIO',
                avatarColor: '#E51937',
            }),
            'CIO',
            60000
        ),
        fetchWithTimeout(
            fetchRssFeed(config, 'medium', {
                platform: 'Medium',
                authorName: 'Medium',
                authorHandle: '@medium',
                avatarColor: '#000000',
            }),
            'Medium',
            60000
        ),
    ];

    if (ENABLE_TWITTER) {
        fetchTasks.push(fetchWithTimeout(fetchTwitter(), 'Twitter', 120000));
    } else {
        console.log('Skipping Twitter/X (ENABLE_TWITTER is not true)');
    }

    const results = await Promise.allSettled(fetchTasks);
    const allPosts = [];
    results.forEach((res) => {
        if (res.status === 'fulfilled') allPosts.push(...res.value);
    });

    const outputPath = path.join(process.cwd(), 'public', 'data', 'news.json');
    let existingPosts = [];

    if (fs.existsSync(outputPath)) {
        try {
            existingPosts = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
            console.log(`Loaded ${existingPosts.length} existing items for history merging.`);
        } catch (e) {
            console.warn('Could not read existing news.json', e.message);
        }
    }

    const combinedPosts = [...existingPosts, ...allPosts];
    const uniquePosts = Array.from(new Map(combinedPosts.map((item) => [item.id, item])).values());

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recentPosts = uniquePosts
        .filter((item) => new Date(item.date) > cutoff)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    fs.writeFileSync(outputPath, JSON.stringify(recentPosts, null, 2));
    console.log(`Saved ${recentPosts.length} items to ${outputPath}`);
}

main();
