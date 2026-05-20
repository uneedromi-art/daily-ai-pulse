const Parser = require('rss-parser');

async function testArtFeeds() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser();

    // Candidates - trying to find active ones
    const feeds = [
        'https://midjourney-v4.tumblr.com/rss',
        'https://aiartdaily.tumblr.com/rss',
        'https://the-ai-art.tumblr.com/rss',
        'https://generative-ai-art.tumblr.com/rss',
        'https://magazine.artland.com/rss' // Not tumblr, but fallback? No.
    ];

    for (const url of feeds) {
        try {
            console.log(`\nTesting: ${url}`);
            const feed = await parser.parseURL(url);
            console.log(`✅ Success! Title: ${feed.title}`);
            console.log(`   Items: ${feed.items.length}`);
            if (feed.items.length > 0) {
                console.log(`   First: ${feed.items[0].title}`);
                console.log(`   Date: ${feed.items[0].pubDate}`);
            }
        } catch (e) {
            console.log(`❌ Failed: ${e.message}`);
        }
    }
}

testArtFeeds();
