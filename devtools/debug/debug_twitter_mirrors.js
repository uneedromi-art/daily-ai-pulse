const Parser = require('rss-parser');

async function debugMirrors() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser();

    // Test candidates
    const candidates = [
        'https://nitter.privacydev.net/_akhaliq/rss',
        'https://nitter.poast.org/_akhaliq/rss',
        'https://nitter.cz/_akhaliq/rss',
        'https://rsshub.feeddd.org/twitter/user/_akhaliq',
        'https://rsshub.app/twitter/user/_akhaliq'
    ];

    for (const url of candidates) {
        try {
            console.log(`\nTesting: ${url}`);
            const feed = await parser.parseURL(url);
            console.log(`✅ Success! Title: ${feed.title}`);
            console.log(`   Items: ${feed.items.length}`);
            if (feed.items.length > 0) {
                console.log(`   First: ${feed.items[0].title}`);
            }
        } catch (e) {
            console.log(`❌ Failed: ${e.message}`);
        }
    }
}

debugMirrors();
