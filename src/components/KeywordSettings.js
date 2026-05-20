'use client';

import { useEffect, useState } from 'react';
import styles from './KeywordSettings.module.css';
import {
    fetchFeedConfig,
    loadUserFeedConfig,
    saveUserFeedConfig,
    clearUserFeedConfig,
    mergeFeedConfig,
    downloadFeedConfig,
} from '@/lib/feedConfig';

export default function KeywordSettings({ onFilterChange }) {
    const [open, setOpen] = useState(false);
    const [baseConfig, setBaseConfig] = useState(null);
    const [keywordsText, setKeywordsText] = useState('');
    const [keywordMode, setKeywordMode] = useState('any');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchFeedConfig()
            .then((base) => {
                setBaseConfig(base);
                const user = loadUserFeedConfig();
                const merged = mergeFeedConfig(base, user);
                applyToParent(merged);
                setKeywordsText((merged.keywords || []).join(', '));
                setKeywordMode(merged.keywordMode || 'any');
            })
            .catch(() => setMessage('설정 파일을 불러오지 못했습니다.'));
    }, []);

    const applyToParent = (config) => {
        onFilterChange?.({
            keywords: config.keywords || [],
            keywordMode: config.keywordMode || 'any',
        });
    };

    const handleApply = () => {
        if (!baseConfig) return;
        const keywords = keywordsText
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);

        const override = { keywords, keywordMode };
        saveUserFeedConfig(override);
        const merged = mergeFeedConfig(baseConfig, override);
        applyToParent(merged);
        setMessage('화면 필터에 적용했습니다. (브라우저에 저장)');
        setOpen(false);
    };

    const handleReset = () => {
        clearUserFeedConfig();
        if (baseConfig) {
            setKeywordsText((baseConfig.keywords || []).join(', '));
            setKeywordMode(baseConfig.keywordMode || 'any');
            applyToParent(baseConfig);
        }
        setMessage('기본 설정으로 되돌렸습니다.');
    };

    const handleDownload = () => {
        if (!baseConfig) return;
        const keywords = keywordsText
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);
        downloadFeedConfig({ ...baseConfig, keywords, keywordMode });
        setMessage('feed-config.json 다운로드 → public/data/에 넣고 fetch-news 실행');
    };

    return (
        <section className={styles.wrap}>
            <button
                type="button"
                className={styles.toggle}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
            >
                키워드 · 소스 설정 {open ? '▲' : '▼'}
            </button>

            {open && (
                <div className={styles.panel}>
                    <p className={styles.help}>
                        <strong>수집 기준:</strong> Reddit(서브레딧), Mastodon(#태그), Google/CIO/Medium(RSS).
                        CIO·Medium은 아래 키워드가 제목·본문에 포함된 글만 가져옵니다.
                    </p>

                    <label className={styles.label}>
                        키워드 (쉼표로 구분)
                        <input
                            className={styles.input}
                            value={keywordsText}
                            onChange={(e) => setKeywordsText(e.target.value)}
                            placeholder="artificial intelligence, LLM, agent"
                        />
                    </label>

                    <label className={styles.label}>
                        매칭 방식
                        <select
                            className={styles.select}
                            value={keywordMode}
                            onChange={(e) => setKeywordMode(e.target.value)}
                        >
                            <option value="any">하나라도 포함 (OR)</option>
                            <option value="all">모두 포함 (AND)</option>
                        </select>
                    </label>

                    {baseConfig && (
                        <ul className={styles.sourceList}>
                            {Object.entries(baseConfig.sources || {}).map(([key, src]) => (
                                <li key={key}>
                                    <span className={src.enabled ? styles.on : styles.off}>
                                        {src.enabled ? '●' : '○'}
                                    </span>
                                    <strong>{key}</strong>
                                    {src.filterByKeywords ? ' · 키워드 필터' : ' · 주제 고정'}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className={styles.actions}>
                        <button type="button" className={styles.primary} onClick={handleApply}>
                            화면에 적용
                        </button>
                        <button type="button" className={styles.secondary} onClick={handleDownload}>
                            수집용 설정 다운로드
                        </button>
                        <button type="button" className={styles.ghost} onClick={handleReset}>
                            초기화
                        </button>
                    </div>

                    {message && <p className={styles.message}>{message}</p>}
                </div>
            )}
        </section>
    );
}
