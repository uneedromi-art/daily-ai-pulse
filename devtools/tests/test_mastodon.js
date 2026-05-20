
async function testMastodon1() {
    console.log("Testing Mastodon Fetch with native fetch...");
    try {
        const response = await fetch('https://mastodon.social/api/v1/timelines/tag/ArtificialIntelligence?limit=3');
        if (!response.ok) {
            console.error("HTTP Error:", response.status, response.statusText);
            return;
        }
        const data = await response.json();
        console.log(`Successfully fetched ${data.length} items`);
        if (data.length > 0) {
            console.log("Sample Item:", data[0].account.display_name);
        }
    } catch (err) {
        console.error("Fetch Failed:", err);
    }
}

testMastodon1();
