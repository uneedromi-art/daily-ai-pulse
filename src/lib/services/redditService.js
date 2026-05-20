
import Parser from 'rss-parser';

export const fetchRedditPosts = async () => {
    try {
        console.log("Fetching Reddit posts via RSS (Custom Fetch)...");
        const parser = new Parser();

        // Use RSS feed
        const feedUrl = "https://www.reddit.com/r/MachineLearning+LocalLLaMA+ArtificialIntelligence+OpenAI+Singularity/top/.rss?t=day";

        // Add a random query param to bypass Vercel edge caching
        const cacheBuster = `&cb=${Date.now()}`;

        // Reddit requires a User-Agent. Using a browser-like one prevents 429/403 blocks.
        const response = await fetch(feedUrl + cacheBuster, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            },
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!response.ok) {
            throw new Error(`Reddit RSS Fetch Failed: ${response.status}`);
        }

        const xmlText = await response.text();
        const feed = await parser.parseString(xmlText);

        if (!feed || !feed.items) {
            console.error("Reddit RSS returned no items.");
            return [];
        }

        console.log(`Fetched ${feed.items.length} raw RSS items.`);

        let posts = feed.items;

        // Filter "Junk" (Memes, Satire)
        // RSS content usually contains the full HTML, we can check title or content
        const memeKeywords = ['meme', 'funny', 'humor', 'satire', 'shitpost'];

        posts = posts.filter(post => {
            const title = (post.title || "").toLowerCase();
            const content = (post.content || "").toLowerCase();

            // Simple keyword check in title
            if (memeKeywords.some(keyword => title.includes(keyword))) return false;

            return true;
        });

        // Take top 4
        posts = posts.slice(0, 4);

        const items = posts.map((post) => {
            try {
                // Extract Image from content HTML
                let imageUrl = null;
                const content = post.content || "";

                if (content) {
                    // Regex to find src attribute
                    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
                    if (imgMatch) {
                        imageUrl = imgMatch[1];
                    }
                }

                if (!imageUrl && post.enclosure && post.enclosure.url) {
                    // Sometimes RSS has enclosure for media
                    imageUrl = post.enclosure.url;
                }

                // Decouple HTML entities if present (Reddit RSS often escapes & to &amp;)
                if (imageUrl && typeof imageUrl === 'string') {
                    imageUrl = imageUrl.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                }

                return {
                    id: post.guid || post.link || `reddit_${Math.random()}`,
                    author: {
                        name: post.author || "Reddit User",
                        handle: `/u/${post.author || 'unknown'}`,
                        avatar_color: "#ff4500"
                    },
                    platform: "Reddit",
                    content: post.title || "No Title",
                    summary_ko: post.title || "No Title",
                    url: post.link || "https://reddit.com",
                    image: imageUrl,
                    date: post.pubDate ? new Date(post.pubDate).toISOString() : new Date().toISOString(),
                    likes: 0,
                    comments: 0
                };
            } catch (itemError) {
                console.error("Skipping malformed Reddit item:", itemError);
                return null;
            }
        }).filter(Boolean);

        console.log(`Processed ${items.length} Reddit RSS items.`);
        return items;

    } catch (error) {
        console.error("Failed to fetch Reddit RSS:", error);
        return [];
    }
};
