const Parser = require('rss-parser');

// Mock translate
const translate = async (text) => ({ text: `[Translated] ${text}` });

async function testTumblr() {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        const parser = new Parser();
        const feedUrl = 'https://mit-csail.tumblr.com/rss';

        console.log(`Fetching Tumblr RSS: ${feedUrl}`);
        const feed = await parser.parseURL(feedUrl);

        console.log(`Fetched ${feed.items.length} Tumblr posts.`);

        feed.items.slice(0, 3).forEach((post, i) => {
            console.log(`[${i}] ${post.title}`);
            console.log(`    Link: ${post.link}`);
            // Check content image
            const imgMatch = post.content?.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) {
                console.log(`    Image Found: ${imgMatch[1]}`);
            } else {
                console.log(`    No Image found in content.`);
            }
        });

    } catch (error) {
        console.error("Tumblr Fetch Error:", error);
    }
}

testTumblr();
