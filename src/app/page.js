import { Suspense } from 'react';
import styles from './page.module.css';
import NewsFeed from '@/components/NewsFeed';
import fs from 'fs';
import path from 'path';
import { getKSTDate } from '@/lib/dateUtils';

// Force Static Generation
export const dynamic = 'force-static';

async function getStaticNews() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'news.json');
    if (!fs.existsSync(filePath)) {
      console.warn("news.json not found. Returning empty list.");
      return [];
    }
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error("Failed to read static news:", error);
    return [];
  }
}

export default async function Home() {
  const news = await getStaticNews();

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading…</div>}>
          <NewsFeed initialPosts={news} />
        </Suspense>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.7em', color: 'var(--text-muted)' }}>
          Sources: Reddit · Google · CIO · Medium
          <br />
          Last Updated: {getKSTDate().toISOString().replace('T', ' ').slice(0, 19)} (KST)
        </div>
      </div>
    </main>
  );
}
