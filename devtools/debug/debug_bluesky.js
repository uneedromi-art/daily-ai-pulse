const { BskyAgent } = require('@atproto/api');

async function testBluesky() {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        console.log("Testing Bluesky Fetch...");

        const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });

        console.log("Agent created. Attempting search...");
        const result = await agent.app.bsky.feed.searchPosts({
            q: '#ArtificialIntelligence',
            limit: 3,
            sort: 'latest'
        });

        if (result.success) {
            console.log(`✅ Success! Found ${result.data.posts.length} posts.`);
            result.data.posts.forEach((post, i) => {
                console.log(`[${i}] ${post.record.text.substring(0, 50)}...`);
                console.log(`    Date: ${post.record.createdAt}`);
                console.log(`    Author: ${post.author.handle}`);
            });
        } else {
            console.error("❌ API returned success=false");
            console.error(result);
        }

    } catch (e) {
        console.error("❌ Exception during Bluesky fetch:", e);
        if (e.message) console.error("Message:", e.message);
        if (e.status) console.error("Status:", e.status);
    }
}

testBluesky();
