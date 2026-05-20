'use client';

import styles from './Card.module.css';

export default function Card({ item }) {
    if (!item || !item.author) return null;

    const name = item.author.name || '?';
    const avatarInitial = name.charAt(0);
    const summary = item.summary_ko?.trim() || item.content;
    const original = item.content?.trim() || '';
    const showOriginal = original && original !== summary;

    const getPlatformIcon = (platform) => {
        const p = platform.toLowerCase();

        if (p.includes('twitter') || p.includes('x')) return <span style={{ fontSize: '1.2em' }}>𝕏</span>;
        if (p.includes('threads')) return <span style={{ fontSize: '1.2em' }}>@</span>;
        if (p.includes('reddit')) return <span style={{ fontSize: '1.2em' }}>🤖</span>;
        if (p.includes('tumblr')) return <span style={{ fontSize: '1.2em' }}>t</span>;
        if (p.includes('mastodon')) return <span style={{ fontSize: '1.2em' }}>🐘</span>;
        if (p.includes('bluesky')) return <span style={{ fontSize: '1.2em' }}>🦋</span>;
        if (p.includes('google')) return <span style={{ fontSize: '1.2em' }}>G</span>;

        return <span>🔗</span>;
    };

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.authorInfo}>
                    {item.author.avatar_url ? (
                        <>
                            <img
                                src={item.author.avatar_url}
                                alt={item.author.name}
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
                            >
                                {avatarInitial}
                            </div>
                        </>
                    ) : (
                        <div
                            className={styles.avatar}
                            style={{ backgroundColor: item.author.avatar_color }}
                        >
                            {avatarInitial}
                        </div>
                    )}

                    <div className={styles.meta}>
                        <span className={styles.name}>{item.author.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={styles.handle}>{item.author.handle}</span>
                            <span style={{ color: '#666', fontSize: '0.8em' }}>•</span>
                            <span style={{ color: '#888', fontSize: '0.8em' }}>
                                {(() => {
                                    try {
                                        return new Date(item.date).toISOString().split('T')[0];
                                    } catch {
                                        return '';
                                    }
                                })()}
                            </span>
                            <span style={{ color: '#666', fontSize: '0.8em' }}>•</span>
                            <span style={{ color: '#888' }} title={item.platform}>
                                {getPlatformIcon(item.platform)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.body}>
                <span className={styles.summaryLabel}>요약</span>
                <p className={styles.summaryText}>{summary}</p>

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

                {showOriginal && (
                    <div className={styles.originalBlock}>
                        <span className={styles.originalLabel}>Original</span>
                        <p className={styles.originalExcerpt}>{original}</p>
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    Read Original →
                </a>
            </div>
        </div>
    );
}
