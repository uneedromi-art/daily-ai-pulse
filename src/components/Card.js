'use client';

import styles from './Card.module.css';
import { clipSummary } from '@/lib/summaryDisplay';
import { formatUtcDate } from '@/lib/dateUtils';

function getTitle(item) {
    if (item.title?.trim()) return item.title.trim();
    const first = (item.content || '').split('\n')[0]?.trim();
    return first || 'Untitled';
}

export default function Card({ item }) {
    if (!item || !item.author || !item.url) return null;

    const name = item.author.name || '?';
    const avatarInitial = name.charAt(0);
    const isCio = item.platform?.toLowerCase().includes('cio');
    const isCioKo = isCio && (item.lang === 'ko' || /[\uac00-\ud7a3]/.test(item.content || ''));
    const title = getTitle(item);
    const rawSummary = item.summary_ko?.trim();
    const summary = rawSummary ? clipSummary(rawSummary) : '';
    const linkLabel = isCioKo ? '원문 보기 →' : 'Read more →';

    const getPlatformIcon = (platform) => {
        const p = platform.toLowerCase();

        if (p.includes('twitter') || p.includes('x')) return <span className={styles.platformEmoji}>𝕏</span>;
        if (p.includes('threads')) return <span className={styles.platformEmoji}>@</span>;
        if (p.includes('reddit')) return <span className={styles.platformEmoji}>🤖</span>;
        if (p.includes('tumblr')) return <span className={styles.platformEmoji}>t</span>;
        if (p.includes('mastodon')) return <span className={styles.platformEmoji}>🐘</span>;
        if (p.includes('bluesky')) return <span className={styles.platformEmoji}>🦋</span>;
        if (p.includes('google')) return <span className={styles.platformEmoji}>G</span>;
        if (p.includes('cio')) return <span className={styles.platformEmoji}>CIO</span>;
        if (p.includes('medium')) return <span className={styles.platformEmoji}>M</span>;

        return <span className={styles.platformEmoji}>🔗</span>;
    };

    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cardLink}
            aria-label={`${title} — ${linkLabel}`}
        >
            <article className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.authorInfo}>
                        {item.author.avatar_url ? (
                            <>
                                <img
                                    src={item.author.avatar_url}
                                    alt=""
                                    className={styles.avatar}
                                    style={{ objectFit: 'cover' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div
                                    className={styles.avatar}
                                    style={{ backgroundColor: item.author.avatar_color, display: 'none' }}
                                    aria-hidden="true"
                                >
                                    {avatarInitial}
                                </div>
                            </>
                        ) : (
                            <div
                                className={styles.avatar}
                                style={{ backgroundColor: item.author.avatar_color }}
                                aria-hidden="true"
                            >
                                {avatarInitial}
                            </div>
                        )}

                        <div className={styles.meta}>
                            <span className={styles.name}>{item.author.name}</span>
                            <div className={styles.metaRow}>
                                <span className={styles.handle}>{item.author.handle}</span>
                                <span className={styles.dot}>•</span>
                                <span className={styles.dateText}>
                                    {(() => {
                                        try {
                                            return formatUtcDate(item.date);
                                        } catch {
                                            return '';
                                        }
                                    })()}
                                </span>
                                <span className={styles.dot}>•</span>
                                <span className={styles.platformIcon} title={item.platform}>
                                    {getPlatformIcon(item.platform)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.body}>
                    <h3 className={styles.cardTitle}>{title}</h3>

                    {summary ? (
                        <div className={styles.summaryBlock}>
                            <span className={styles.summaryLabel}>요약</span>
                            <p className={styles.summaryText}>{summary}</p>
                        </div>
                    ) : null}

                    {item.image && (
                        <img
                            src={item.image}
                            alt=""
                            className={styles.cardImage}
                            loading="lazy"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    )}
                </div>

                <div className={styles.footer}>
                    <span className={styles.link}>{linkLabel}</span>
                </div>
            </article>
        </a>
    );
}
