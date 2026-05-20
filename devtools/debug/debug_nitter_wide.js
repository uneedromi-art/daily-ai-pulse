const Parser = require('rss-parser');

async function debugNitterWide() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser();

    // List of potential Nitter instances
    const instances = [
        'https://nitter.net',
        'https://nitter.lacontrevoie.fr',
        'https://nitter.1d4.us',
        'https://nitter.moomoo.me',
        'https://nitter.catsarch.com',
        'https://nitter.unixfox.eu',
        'https://nitter.it',
        'https://nitter.poast.org',
        'https://nitter.cz',
        'https://nitter.privacydev.net',
        'https://nitter.projectsegfau.lt',
        'https://nitter.eu',
        'https://nitter.soopy.moe',
        'https://nitter.rawbit.ninja'
    ];

    const username = '_akhaliq';

    for (const domain of instances) {
        const url = `${domain}/${username}/rss`;
        try {
            // Set timeout manually using AbortController if possible, but rss-parser doesn't support it easily.
            // Just rely on async/await.
            console.log(`\nTesting: ${url}`);
            const startTime = Date.now();
            const feed = await parser.parseURL(url);
            const duration = Date.now() - startTime;

            console.log(`✅ Success! (${duration}ms)`);
            console.log(`   Title: ${feed.title}`);
            console.log(`   Items: ${feed.items.length}`);
            if (feed.items.length > 0) {
                console.log(`   First: ${feed.items[0].title}`);
                // Stop after first success? No, let's find the fastest/best.
            }
        } catch (e) {
            console.log(`❌ Failed: ${e.message}`);
        }
    }
}

debugNitterWide();
