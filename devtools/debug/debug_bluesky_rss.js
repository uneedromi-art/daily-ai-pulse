const Parser = require('rss-parser');

async function testBlueskyRSS() {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Just in case
        const parser = new Parser();

        // Ethan Mollick (Wharton Professor, AI Insight)
        const feedUrl = 'https://bsky.app/profile/emollick.bsky.social/rss';

        console.log(`Fetching Bluesky RSS: ${feedUrl}`);
        const feed = await parser.parseURL(feedUrl);

        console.log(`✅ Success! Title: ${feed.title}`);
        console.log(`Fetched ${feed.items.length} posts.`);

        feed.items.slice(0, 3).forEach((post, i) => {
            console.log(`[${i}] ${post.contentSnippet?.substring(0, 100)}...`);
            console.log(`    Date: ${post.pubDate}`);

            // Check for images in content
            // Bluesky RSS puts images in description/content as <img src="...">
            const imgMatch = post.content?.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) {
                console.log(`    Image: ${imgMatch[1]}`);
            }
        });

    } catch (error) {
        console.error("❌ Bluesky RSS Error:", error);
    }
}

testBlueskyRSS();
