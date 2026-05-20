const Parser = require('rss-parser');

async function testRealTumblr() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser();

    const candidates = [
        'https://ai-art.tumblr.com/rss',
        'https://artificial-intelligence.tumblr.com/rss',
        'https://techcrunch.tumblr.com/rss',
        'https://generative-ai.tumblr.com/rss'
    ];

    for (const url of candidates) {
        try {
            console.log(`\nTesting: ${url}`);
            const feed = await parser.parseURL(url);
            console.log(`✅ Success! Title: ${feed.title}`);
            console.log(`   Last Post: ${feed.items[0]?.title || 'No Title'} (${feed.items[0]?.pubDate})`);
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
        }
    }
}

testRealTumblr();
