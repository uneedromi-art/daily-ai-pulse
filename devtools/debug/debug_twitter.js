const Parser = require('rss-parser');

async function debugTwitter() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser();

    // Test AK's feed
    const url = 'https://rsshub.app/twitter/user/_akhaliq';

    try {
        console.log(`Testing Twitter RSSHub: ${url}`);
        const feed = await parser.parseURL(url);
        console.log(`✅ Success! Items: ${feed.items.length}`);

        if (feed.items.length > 0) {
            const item = feed.items[0];
            console.log(`[First Item]`);
            console.log(`Title: ${item.title}`);
            console.log(`Link: ${item.link}`);
            console.log(`Author: ${item.creator || item.author}`);
            // Check for RT indicators
            console.log(`Content Snippet: ${item.contentSnippet?.substring(0, 50)}...`);
        }
    } catch (e) {
        console.log(`❌ Failed: ${e.message}`);
        if (e.message.includes('403') || e.message.includes('429')) {
            console.log("RSSHub might be rate limited or blocked.");
        }
    }
}

debugTwitter();
