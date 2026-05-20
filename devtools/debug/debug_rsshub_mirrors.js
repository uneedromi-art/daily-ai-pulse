const Parser = require('rss-parser');

async function debugRSSHubMirrors() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser({
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
    });

    const mirrors = [
        'https://rsshub.rssforever.com',
        'https://rsshub.li',
        'https://rsshub.s20.online',
        'https://rsshub.ktachibana.party'
    ];

    const username = '_akhaliq';

    for (const domain of mirrors) {
        // RSSHub path
        const url = `${domain}/twitter/user/${username}`;
        try {
            console.log(`\nTesting: ${url}`);
            const feed = await parser.parseURL(url);
            console.log(`✅ Success! Title: ${feed.title}`);
            console.log(`   Items: ${feed.items.length}`);
            // If we find one, we should verify it has recent items
            if (feed.items.length > 0) {
                console.log(`   First: ${feed.items[0].title}`);
                console.log(`   Date: ${feed.items[0].pubDate}`);
            }
        } catch (e) {
            console.log(`❌ Failed: ${e.message}`);
        }
    }
}

debugRSSHubMirrors();
