const Parser = require('rss-parser');

async function debugTagRSS() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser({
        customFields: {
            item: ['note-count', 'interaction-count'] // Guessing fields
        }
    });

    const candidates = [
        'https://www.tumblr.com/tagged/ai/rss',
        'https://www.tumblr.com/tagged/artificial-intelligence/rss',
        'https://tumblr.com/tagged/ai/rss',
        // Sometimes user-specific tags specific work?
        // e.g. https://generative-ai-art.tumblr.com/tagged/ai/rss
        'https://generative-ai-art.tumblr.com/tagged/ai/rss',
        'https://generative-ai-art.tumblr.com/rss' // Control
    ];

    for (const url of candidates) {
        try {
            console.log(`\nTesting: ${url}`);
            const feed = await parser.parseURL(url);
            console.log(`✅ Success! Items: ${feed.items.length}`);
            if (feed.items.length > 0) {
                console.log(`   Sample keys: ${Object.keys(feed.items[0])}`);
                // Check for popularity metrics
                console.log(`   Sample Item: ${JSON.stringify(feed.items[0], null, 2)}`);
            }
        } catch (e) {
            console.log(`❌ Failed: ${e.message}`);
        }
    }
}

debugTagRSS();
