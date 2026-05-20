import Parser from 'rss-parser';


export const fetchBlueskyPosts = async () => {
    try {


        const parser = new Parser();
        // Ethan Mollick (High Quality AI Insight/News)
        const feedUrl = 'https://bsky.app/profile/emollick.bsky.social/rss';

        console.log(`Fetching Bluesky RSS: ${feedUrl}`);
        const feed = await parser.parseURL(feedUrl);

        console.log(`Fetched ${feed.items.length} Bluesky posts.`);

        // Transform & Translate
        // Limit to 1 post as requested
        const items = await Promise.all(feed.items.slice(0, 1).map(async (post) => {
            let content = post.contentSnippet || post.content || "";
            // Remove links/hashtags from end if they clutter? For now keep raw is safer.

            // Translation removed for stability
            let translatedSummary = content;

            // Extract Images
            let imageUrl = null;
            // Bluesky RSS puts images in description as <img src="...">
            // The parser usually puts description in `content` or `description`
            const rawHtml = post.content || post.description || "";
            const imgMatch = rawHtml.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) {
                imageUrl = imgMatch[1];
            }

            return {
                id: post.guid || post.link,
                author: {
                    name: "Ethan Mollick",
                    handle: "@emollick.bsky.social",
                    avatar_color: "#0085ff", // Bluesky Blue
                    avatar_url: "/bluesky_logo.png"
                },
                platform: "Bluesky",
                content: content,
                summary_ko: translatedSummary,
                url: post.link,
                image: imageUrl,
                date: new Date(post.pubDate).toISOString(),
                likes: 0,
                comments: 0
            };
        }));

        return items;

    } catch (error) {
        console.error("Bluesky RSS Fetch Error:", error);
        return [];
    }
};
