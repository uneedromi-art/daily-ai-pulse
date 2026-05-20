const Parser = require('rss-parser');

async function debugTwiiit() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser();
    const url = 'https://twiiit.com/_akhaliq/rss';

    try {
        console.log(`Testing Twiiit Redirection: ${url}`);
        const feed = await parser.parseURL(url);
        console.log(`✅ Success! Title: ${feed.title}`);
        console.log(`   Items: ${feed.items.length}`);
    } catch (e) {
        console.log(`❌ Failed: ${e.message}`);
    }
}

debugTwiiit();
