import Parser from 'rss-parser';


export const fetchRealTumblrPosts = async () => {
    try {


        const parser = new Parser();
        // "prostheticknowledge" Tumblr - Requested by user
        const feedUrl = 'https://prostheticknowledge.tumblr.com/rss';

        console.log(`Fetching Real Tumblr RSS: ${feedUrl}`);
        const feed = await parser.parseURL(feedUrl);

        console.log(`Fetched ${feed.items.length} Tumblr posts.`);

        // Limit to 1 post (as per general style of "1 item" for these extra sources)
        // or maybe 2 since it's visual. Let's do 1 to keep layout balanced.
        const items = await Promise.all(feed.items.slice(0, 1).map(async (post) => {
            // Tumblr RSS often has no title for image posts.
            // Use date or content snippet as title.
            let title = post.title;
            if (!title || title.trim() === '') {
                // Try to get text from contentSnippet
                if (post.contentSnippet) {
                    title = post.contentSnippet.substring(0, 50) + "...";
                } else {
                    title = "Prosthetic Knowledge Update";
                }
            }

            let translatedSummary = title;

            // Extract image
            let imageUrl = null;
            // RSS parser usually finds it in content
            const content = post.content || post.description || "";
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) {
                imageUrl = imgMatch[1];
            }

            return {
                id: post.guid || post.link,
                author: {
                    name: "Prosthetic Knowledge",
                    handle: "@prostheticknowledge",
                    avatar_color: "#35465c", // Tumblr Dark Blue
                    avatar_url: "https://assets.tumblr.com/images/default_avatar/cube_closed_128.png"
                },
                platform: "Tumblr",
                content: post.contentSnippet || "Image Post",
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
        console.error("Real Tumblr Fetch Error:", error);
        return [];
    }
};
