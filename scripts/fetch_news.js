
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Parser = require('rss-parser');
const { cleanPostText, createSummaryBuilder } = require('./summaryUtils');
const { translateToKorean, loadEnvLocal } = require('./translateKo');

loadEnvLocal();

// Ignore SSL errors for local dev/testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// --- CONFIG ---
const REDDIT_FEED_URL = "https://www.reddit.com/r/MachineLearning+LocalLLaMA+ArtificialIntelligence+OpenAI+Singularity/top/.rss?t=day";
const MASTODON_API_URL = "https://mastodon.social/api/v1/timelines/tag/ArtificialIntelligence?limit=5";
const GOOGLE_RESEARCH_FEED = "https://research.google/blog/rss/";
// X(Twitter) — Playwright 로그인 이슈로 기본 비활성화. 켜려면 ENABLE_TWITTER=true
const ENABLE_TWITTER = process.env.ENABLE_TWITTER === 'true';

// --- HELPERS ---
async function fetchWithTimeout(promise, name, ms = 15000) { // Increased timeout for translation
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Service '${name}' timed out`));
        }, ms);
        promise
            .then(value => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch(reason => {
                clearTimeout(timer);
                reject(reason);
            });
    });
}

const buildKoreanSummary = createSummaryBuilder(translateToKorean);

// --- FETCHERS ---
async function fetchReddit() {
    console.log("Fetching Reddit...");
    try {
        const parser = new Parser();
        const response = await fetch(REDDIT_FEED_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }
        });
        if (!response.ok) throw new Error(`Reddit HTTP ${response.status}`);
        const text = await response.text();
        const feed = await parser.parseString(text);

        // Process items serially to respect translation rate limits
        const results = [];
        const items = feed.items.slice(0, 4);

        for (const item of items) {
            // Extract Image
            let imageUrl = null;
            const content = item.content || "";
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) imageUrl = imgMatch[1];
            if (imageUrl) imageUrl = imageUrl.replace(/&amp;/g, '&').replace(/&quot;/g, '"');

            const translatedSummary = await buildKoreanSummary(item.title, { isTitle: true });

            results.push({
                id: item.guid || item.link,
                platform: "Reddit",
                author: { name: item.author || "Reddit User", handle: "/u/" + (item.author || "user"), avatar_color: "#ff4500" },
                content: item.title,
                summary_ko: translatedSummary,
                url: item.link,
                image: imageUrl,
                date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                likes: 0,
                comments: 0
            });
        }
        return results;
    } catch (e) {
        console.error("Reddit Fetch Failed:", e.message);
        return [];
    }
}

async function fetchMastodon() {
    console.log("Fetching Mastodon...");
    try {
        const response = await fetch(MASTODON_API_URL);
        if (!response.ok) throw new Error(`Mastodon HTTP ${response.status}`);
        const data = await response.json();

        const results = [];
        for (const post of data) {
            const rawContent = post.content.replace(/<[^>]*>?/gm, '');
            const decodedContent = cleanPostText(rawContent);
            const translatedSummary = await buildKoreanSummary(decodedContent);

            results.push({
                id: post.id,
                platform: "Mastodon",
                author: {
                    name: post.account.display_name,
                    handle: `@${post.account.username}`,
                    avatar_color: "#6364ff",
                    avatar_url: post.account.avatar_static
                },
                content: decodedContent,
                summary_ko: translatedSummary,
                url: post.url,
                date: post.created_at,
                likes: post.favourites_count,
                comments: post.replies_count
            });
        }
        return results;
    } catch (e) {
        console.error("Mastodon Fetch Failed:", e.message);
        return [];
    }
}

async function fetchGoogle() {
    console.log("Fetching Google Research...");
    try {
        const parser = new Parser();
        const feed = await parser.parseURL(GOOGLE_RESEARCH_FEED);

        const results = [];
        const items = feed.items.slice(0, 2);

        for (const item of items) {
            // Extract Image
            let imageUrl = null;
            const content = item['content:encoded'] || item.content || item.description || "";
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) imageUrl = imgMatch[1];

            const description = item.contentSnippet || item.summary || '';
            const sourceForSummary = description.length > 80
                ? `${item.title}. ${description}`
                : item.title;
            const translatedSummary = await buildKoreanSummary(sourceForSummary);

            results.push({
                id: item.guid || item.link,
                platform: "Google",
                author: { name: "Google Research", handle: "@GoogleAI", avatar_color: "#4285F4", avatar_url: "https://lh3.googleusercontent.com/COxitq8kL0PhMydc8hC_pC5VvlBq2YLt05i1V7n3Xw-Qwb_NfJbwdWq0gWkO0l9g" },
                content: item.title,
                summary_ko: translatedSummary,
                url: item.link,
                image: imageUrl,
                date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                likes: 0,
                comments: 0
            });
        }
        return results;
    } catch (e) {
        console.error("Google Fetch Failed:", e.message);
        return [];
    }
}

async function fetchTwitter() {
    console.log("Fetching Twitter (via Playwright)...");
    return new Promise((resolve, reject) => {
        // Use node to run the browser script
        exec('node devtools/archive/twitter/fetch_twitter_browser.js', { maxBuffer: 1024 * 1024 * 5 }, async (error, stdout, stderr) => {
            // Log browser actions to console for debugging
            if (stderr) console.error(`[Browser Log]: ${stderr}`);

            if (error) {
                console.error(`Twitter Browser Error: ${error.message}`);
                resolve([]);
                return;
            }

            try {
                // Parse JSON output
                // Stdout might contain extra logs, find the JSON array
                const output = stdout.trim();
                const jsonStartIndex = output.indexOf('[');
                const jsonEndIndex = output.lastIndexOf(']');

                if (jsonStartIndex === -1 || jsonEndIndex === -1) {
                    throw new Error("No JSON array found in output");
                }

                const jsonStr = output.substring(jsonStartIndex, jsonEndIndex + 1);
                const posts = JSON.parse(jsonStr);

                // Translate
                const translatedPosts = [];
                for (const post of posts) {
                    post.summary_ko = await buildKoreanSummary(post.content);
                    translatedPosts.push(post);
                }

                resolve(translatedPosts);
            } catch (e) {
                console.error("Failed to parse Twitter Browser JSON:", e.message);
                resolve([]);
            }
        });
    });
}

// --- MAIN ---
async function main() {
    console.log("Starting Daily News Fetch...");

    const fetchTasks = [
        fetchWithTimeout(fetchReddit(), 'Reddit'),
        fetchWithTimeout(fetchMastodon(), 'Mastodon', 120000),
        fetchWithTimeout(fetchGoogle(), 'Google'),
    ];

    if (ENABLE_TWITTER) {
        fetchTasks.push(fetchWithTimeout(fetchTwitter(), 'Twitter', 120000));
    } else {
        console.log('Skipping Twitter/X (ENABLE_TWITTER is not true)');
    }

    const results = await Promise.allSettled(fetchTasks);

    const allPosts = [];
    results.forEach(res => {
        if (res.status === 'fulfilled') {
            allPosts.push(...res.value);
        }
    });

    // --- HISTORY MANGEMENT ---
    const outputPath = path.join(process.cwd(), 'public', 'data', 'news.json');
    let existingPosts = [];

    // Read existing file if present
    if (fs.existsSync(outputPath)) {
        try {
            const fileContent = fs.readFileSync(outputPath, 'utf8');
            existingPosts = JSON.parse(fileContent);
            console.log(`Loaded ${existingPosts.length} existing items for history merging.`);
        } catch (e) {
            console.warn("Could not read existing news.json, starting fresh.", e.message);
        }
    }

    // Merge: New posts + Existing posts
    const combinedPosts = [...existingPosts, ...allPosts];

    // Deduplicate by ID
    const uniquePosts = Array.from(new Map(combinedPosts.map(item => [item.id, item])).values());

    // Filter out posts older than 30 days
    const sensitiveDate = new Date();
    sensitiveDate.setDate(sensitiveDate.getDate() - 30);

    const recentPosts = uniquePosts.filter(item => new Date(item.date) > sensitiveDate);

    // Sort by Date (Newest first)
    recentPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Save to file
    fs.writeFileSync(outputPath, JSON.stringify(recentPosts, null, 2));
    console.log(`Saved ${recentPosts.length} items to ${outputPath} (History preserved)`);
}

main();
