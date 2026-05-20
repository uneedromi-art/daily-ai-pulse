// No require needed for Node 18+
// Mock translate
const translate = async (text) => ({ text: `[Translated] ${text}` });

async function testReddit() {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        console.log("Testing Reddit Fetch...");

        const subreddits = "MachineLearning+ChatGPT+Gemini+OpenAI+ArtificialIntelligence+Singularity";
        // NOTE: The previous URL used top.json?limit=6. 
        // Let's test EXACTLY that.
        const url = `https://www.reddit.com/r/${subreddits}/top.json?limit=6&t=day`;
        console.log(`URL: ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DailyAIPulse/1.0; +http://localhost:3005)'
            }
        });

        if (!response.ok) {
            console.error(`Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Body:", text);
            return;
        }

        const data = await response.json();

        if (data.data && data.data.children) {
            console.log(`Found ${data.data.children.length} posts.`);
            data.data.children.forEach((child, i) => {
                const p = child.data;
                console.log(`[${i}] ${p.title} (Img: ${p.url})`);

                // Test Image Logic match
                let imageUrl = null;
                if (p.url && (p.url.match(/\.(jpeg|jpg|gif|png)$/) != null)) {
                    imageUrl = p.url;
                } else if (p.preview && p.preview.images && p.preview.images[0]) {
                    imageUrl = p.preview.images[0].source.url.replace(/&amp;/g, '&');
                } else if (p.thumbnail && p.thumbnail.startsWith('http')) {
                    imageUrl = p.thumbnail;
                }
                console.log(`    -> Extracted Image: ${imageUrl}`);
            });
        } else {
            console.error("Invalid structure:", JSON.stringify(data).substring(0, 200));
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

testReddit();
