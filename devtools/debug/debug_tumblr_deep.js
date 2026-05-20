const Parser = require('rss-parser');

async function debugDeep() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const parser = new Parser();
    const url = 'https://ai-art.tumblr.com/rss';

    try {
        console.log(`Fetching ${url}...`);
        const feed = await parser.parseURL(url);

        if (feed.items.length === 0) {
            console.log("No items found.");
            return;
        }

        const item = feed.items[0];
        console.log("First Item Keys:", Object.keys(item));
        console.log("Item Details:");
        console.log(JSON.stringify(item, null, 2));

    } catch (e) {
        console.error(e);
    }
}

debugDeep();
