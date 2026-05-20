

export const fetchMastodonPosts = async () => {
    try {


        // Fetch from Mastodon (Open API)
        const response = await fetch('https://mastodon.social/api/v1/timelines/tag/ArtificialIntelligence?limit=3', {
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            throw new Error(`Mastodon API Error: ${response.status}`);
        }

        const posts = await response.json();

        // Transform & Translate
        const items = await Promise.all(posts.map(async (post) => {
            // Strip HTML from content
            const rawContent = post.content.replace(/<[^>]*>?/gm, '');
            const decodedContent = rawContent.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&apos;/g, "'");

            let summary = decodedContent;

            return {
                id: post.id,
                author: {
                    name: post.account.display_name || post.account.username,
                    handle: `@${post.account.username}`,
                    avatar_color: '#6364ff', // Mastodon Blurple
                    avatar_url: post.account.avatar_static // Real avatar!
                },
                platform: "Mastodon",
                content: decodedContent,
                summary_ko: summary,
                url: post.url,
                date: new Date(post.created_at).toISOString(),
                likes: post.favourites_count,
                comments: post.replies_count
            };
        }));

        return items;

    } catch (error) {
        console.error("Mastodon Fetch Error:", error);
        return [];
    }
};
