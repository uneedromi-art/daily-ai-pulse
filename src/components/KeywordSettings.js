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

export default function KeywordSettings({ open, onClose }) {
    const [baseConfig, setBaseConfig] = useState(null);
    const [keywordsText, setKeywordsText] = useState('');
    const [keywordMode, setKeywordMode] = useState('any');
    const [message, setMessage] = useState('');
    const [cioLog, setCioLog] = useState(null);

    useEffect(() => {
        fetchFeedConfig()
            .then((base) => {
                setBaseConfig(base);
                const user = loadUserFeedConfig();
                const merged = mergeFeedConfig(base, user);
                setKeywordsText((merged.keywords || []).join(', '));
                setKeywordMode(merged.keywordMode || 'any');
            })
            .catch(() => setMessage('설정 파일을 불러오지 못했습니다.'));
    }, []);

    useEffect(() => {
        if (!open) setMessage('');
    }, [open]);

    useEffect(() => {
        if (!open) return;
        fetch('/data/cio-fetch-log.json')
            .then((r) => (r.ok ? r.json() : null))
            .then(setCioLog)
            .catch(() => setCioLog(null));
    }, [open]);

    const handleApply = () => {
        if (!baseConfig) return;
        const keywords = keywordsText
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);

        const override = { keywords, keywordMode };
        saveUserFeedConfig(override);
        setMessage('저장했습니다. public/data/feed-config.json에 반영 후 fetch-news를 실행하세요.');
        onClose?.();
    };

    const handleReset = () => {
        clearUserFeedConfig();
        if (baseConfig) {
            setKeywordsText((baseConfig.keywords || []).join(', '));
            setKeywordMode(baseConfig.keywordMode || 'any');
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

    if (!open) return null;

    return (
        <div className={styles.backdrop} role="presentation" onClick={onClose}>
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.modalHeader}>
                    <h2 id="settings-title" className={styles.modalTitle}>
                        키워드 · 소스 설정
                    </h2>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        ×
                    </button>
                </div>

                <p className={styles.help}>
                    Reddit·Google은 주제 고정. CIO·Medium은 수집(fetch-news) 시 키워드 필터.
                    화면에는 news.json에 저장된 글을 날짜별로 그대로 표시합니다.
                    Medium은 유료/티저(Continue reading) 글 제외, 본문 충분한 글만 수집합니다.
                </p>

                {cioLog?.summary && (
                    <p className={styles.cioLog}>
                        <strong>최근 CIO 수집:</strong> 한국어 {cioLog.summary.korean}건 · 영문{' '}
                        {cioLog.summary.english}건 (RSS {cioLog.feedUrl?.split('/').slice(-2, -1)})
                        <br />
                        <span className={styles.cioLogHint}>
                            터미널 상세: npm run diagnose-cio
                        </span>
                    </p>
                )}

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
                        저장
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
        </div>
    );
}
