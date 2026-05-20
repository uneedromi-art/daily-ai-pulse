const Parser = require('rss-parser');

async function debugGoogleNewsType() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser();

    // Search for tweets from _akhaliq indexed by Google
    // Note: Google News might not index individual tweets well, but "Google Alerts" does.
    // Let's try Google News Search RSS.
    const url = 'https://news.google.com/rss/search?q=site:twitter.com/_akhaliq+when:7d&hl=en-US&gl=US&ceid=US:en';

    try {
        console.log(`Testing Google News RSS: ${url}`);
        const feed = await parser.parseURL(url);
        console.log(`✅ Success! Title: ${feed.title}`);
        console.log(`   Items: ${feed.items.length}`);
        if (feed.items.length > 0) {
            console.log(`   First: ${feed.items[0].title}`);
            console.log(`   Link: ${feed.items[0].link}`);
            console.log(`   Date: ${feed.items[0].pubDate}`);
        }
    } catch (e) {
        console.log(`❌ Failed: ${e.message}`);
    }
}

debugGoogleNewsType();
