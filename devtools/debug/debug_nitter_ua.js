const Parser = require('rss-parser');

async function debugNitterUA() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser({
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml; q=0.1'
        }
    });

    // Retry promising candidates with UA
    const instances = [
        'https://nitter.net',
        'https://nitter.poast.org',
        'https://nitter.cz',
        'https://nitter.privacydev.net'
    ];
    const username = '_akhaliq';

    for (const domain of instances) {
        const url = `${domain}/${username}/rss`;
        try {
            console.log(`\nTesting (with UA): ${url}`);
            const feed = await parser.parseURL(url);
            console.log(`✅ Success! Title: ${feed.title}`);
            console.log(`   Items: ${feed.items.length}`);
        } catch (e) {
            console.log(`❌ Failed: ${e.message}`);
        }
    }
}

debugNitterUA();
