import { fetchMastodonPosts } from './services/mastodonService';

// Helper for timeout
const fetchWithTimeout = (promise, name, ms = 3000) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Service '${name}' timed out`));
        }, ms);

        promise
            .then(value => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch(reason => {
                clearTimeout(timer);
                reject(reason);
            });
    });
};

export const getAiNews = async () => {
    console.log("Fetching AI News: Real (Mastodon) only...");

    try {
        // Switch to Mastodon as Reddit is blocking Vercel IP
        const results = await Promise.allSettled([
            fetchWithTimeout(fetchMastodonPosts(), 'Mastodon')
        ]);

        const realPosts = [];

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                if (result.value.length > 0) {
                    console.log(`✅ Mastodon: ${result.value.length} items`);
                    realPosts.push(...result.value);
                }
            } else {
                console.error(`❌ Mastodon Failed: ${result.reason}`);
            }
        });

        const combined = [...realPosts];

        // Sort by date 
        combined.sort((a, b) => (b.date > a.date ? 1 : -1));

        return combined;
    } catch (error) {
        console.error("Error aggregating news:", error);
        // User requested removal of Mock Data ("Gara Data")
        // Return empty array instead of MOCK_STATIC_DATA on failure
        return [];
    }
};
