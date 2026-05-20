'use client';

import { useSearchParams } from 'next/navigation';
import Card from './Card';
import ArchiveNav from './ArchiveNav';
import styles from '../app/page.module.css';
import { formatKSTDate } from '../lib/dateUtils';
import { postMatchesKeywords } from '../lib/feedConfig';

export default function PostList({ initialPosts = [], keywordFilter = null }) {
    const searchParams = useSearchParams();
    const queryDate = searchParams.get('date');

    // Sort posts safely (timestamp sorting is timezone independent)
    const sortedPosts = [...initialPosts].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Determine "Today" in KST
    // If we have data, we try to see if there is data for "today" KST.
    // However, the original logic was: "Latest available date in dataset is Today"
    // Let's stick to that but ensure we are looking at KST dates.

    // Get current KST date string
    const nowKSTStr = formatKSTDate(new Date());

    // Find the latest post's KST date
    const latestPostDateStr = sortedPosts.length > 0
        ? formatKSTDate(sortedPosts[0].date)
        : nowKSTStr;

    // Use queryDate if present, otherwise default to latest available date (or today KST if no data)
    // The previous logic favored latestDateStr over real today to avoid empty pages.
    const currentDate = queryDate || latestPostDateStr;

    // Filter Logic using KST
    const filteredPosts = sortedPosts.filter((post) => {
        const postDateKST = formatKSTDate(post.date);
        if (postDateKST !== currentDate) return false;
        if (keywordFilter?.keywords?.length) {
            return postMatchesKeywords(
                post,
                keywordFilter.keywords,
                keywordFilter.keywordMode || 'any'
            );
        }
        return true;
    });

    console.log(`Filtering for ${currentDate} (KST): Found ${filteredPosts.length} posts`);

    return (
        <div>
            <div className={styles.grid}>
                {filteredPosts.length > 0 ? (
                    filteredPosts.map((item) => (
                        <Card key={item.id} item={item} />
                    ))
                ) : (
                    <div style={{ color: '#666', gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
                        <p>No news found for {currentDate}.</p>
                        <p style={{ fontSize: '0.8em', marginTop: '10px' }}>Try navigating to another date.</p>
                    </div>
                )}
            </div>

            <ArchiveNav currentDate={currentDate} />
        </div>
    );
}
