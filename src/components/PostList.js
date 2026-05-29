'use client';

import { useSearchParams } from 'next/navigation';
import Card from './Card';
import ArchiveNav from './ArchiveNav';
import styles from '../app/page.module.css';
import { formatKSTDate } from '../lib/dateUtils';

export default function PostList({ initialPosts = [] }) {
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

    // 기본: 오늘(KST) 날짜. 오늘 글이 없으면 데이터에 있는 최신 날짜
    const hasPostsToday = sortedPosts.some((p) => formatKSTDate(p.date) === nowKSTStr);
    const currentDate = queryDate || (hasPostsToday ? nowKSTStr : latestPostDateStr);

    const filteredPosts = sortedPosts.filter((post) => {
        const postDateKST = formatKSTDate(post.date);
        return postDateKST === currentDate;
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
                    <div style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
                        <p>No news found for {currentDate}.</p>
                        <p style={{ fontSize: '0.8em', marginTop: '10px' }}>Try navigating to another date.</p>
                    </div>
                )}
            </div>

            <ArchiveNav currentDate={currentDate} />
        </div>
    );
}
