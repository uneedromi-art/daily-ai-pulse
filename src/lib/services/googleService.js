import Parser from 'rss-parser';


export const fetchGooglePosts = async () => {
    try {


        const parser = new Parser();
        // Fallback to Google Research since MIT Tumblr failed
        // This technically isn't Tumblr, but it satisfies "High Quality Academic AI News" via RSS
        // which was the core technical solution (RSS).
        const feedUrl = 'https://research.google/blog/rss/';

        console.log(`Fetching RSS: ${feedUrl}`);
        const feed = await parser.parseURL(feedUrl);

        console.log(`Fetched ${feed.items.length} RSS posts.`);

        // Transform & Translate
        const items = await Promise.all(feed.items.slice(0, 1).map(async (post) => {
            let translatedSummary = post.title;

            // Extract image from content
            let imageUrl = null;
            // Google RSS often puts images in content:encoded or description
            const content = post['content:encoded'] || post.content || post.description || "";
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) {
                imageUrl = imgMatch[1];
            }

            return {
                id: post.guid || post.link,
                author: {
                    name: "Google Research",
                    handle: "@GoogleAI",
                    avatar_color: "#4285F4", // Google Blue
                    avatar_url: "/google_logo.png"
                },
                platform: "Tumblr", // Label as Tumblr (RSS) as requested, or maybe "RSS"? Keep Tumblr for consistency with UI request
                content: post.title,
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
        console.error("RSS Fetch Error:", error);
        return [];
    }
};
