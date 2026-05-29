'use client';

import { useState } from 'react';
import styles from './Header.module.css';
import KeywordSettings from './KeywordSettings';
import { useTheme } from './ThemeProvider';

export default function Header() {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    return (
        <>
            <header className={styles.container}>
                <div className={styles.topRow}>
                    <span className={styles.brand}>Daily AI Pulse</span>
                    <div className={styles.topActions}>
                        <span className={styles.date}>{today}</span>
                        <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={toggleTheme}
                            aria-label={theme === 'dark' ? '라이트 모드' : '다크 모드'}
                            title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
                        >
                            {theme === 'dark' ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 19 16.9 8.5 8.5 0 0 1 21 14.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                </svg>
                            )}
                        </button>
                        <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => setSettingsOpen(true)}
                            aria-label="키워드 및 소스 설정"
                            title="설정"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path
                                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                />
                                <path
                                    d="M19.4 13a7.9 7.9 0 0 0 .1-2l2-1.5-2-3.5-2.3.8a8 8 0 0 0-1.7-1L15.5 3h-7L8.5 5.8a8 8 0 0 0-1.7 1L4.5 6l-2 3.5 2 1.5a7.9 7.9 0 0 0 0 2l-2 1.5 2 3.5 2.3-.8a8 8 0 0 0 1.7 1L8.5 21h7l1-2.8a8 8 0 0 0 1.7-1l2.3.8 2-3.5-2-1.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <KeywordSettings
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />
        </>
    );
}
