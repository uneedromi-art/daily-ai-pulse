const Parser = require('rss-parser');
const parser = new Parser();

const candidateBlogs = [
    'https://research.google/blog/rss/', // Google Research (Not tumblr, but RSS)
    'https://openai.com/blog/rss.xml', // OpenAI (Not tumblr)
    'https://techcrunch.tumblr.com/rss',
    'https://mit-csail.tumblr.com/rss', // MIT CSAIL
    'https://artificial-intelligence.tumblr.com/rss',
    'https://ai-art.tumblr.com/rss',
    'https://deepmind.google/blog/rss.xml'
];

async function testFeeds() {
    for (const url of candidateBlogs) {
        try {
            console.log(`Testing: ${url}`);
            const feed = await parser.parseURL(url);
            console.log(`  ✅ Success! Title: ${feed.title}`);
            console.log(`  First item: ${feed.items[0]?.title}`);
        } catch (err) {
            console.log(`  ❌ Failed: ${err.message}`);
        }
    }
}

testFeeds();
