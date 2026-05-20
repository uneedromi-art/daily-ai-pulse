const Parser = require('rss-parser');

async function testFeeds() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser();

    // Candidates
    const feeds = [
        'https://prostheticknowledge.tumblr.com/rss', // Very famous tech/art blog
        'https://algopop.tumblr.com/rss',
        'https://krea-ai.tumblr.com/rss', // Maybe? guessing
        'https://www.tumblr.com/tagged/artificial-intelligence/rss', // Global tag?
        'https://daily-generative-ai.tumblr.com/rss'
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

testFeeds();
