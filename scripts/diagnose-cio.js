/**
 * CIO 수집 기준 진단 — 터미널에서 실행:
 *   node scripts/diagnose-cio.js
 */
const fs = require('fs');
const path = require('path');
const { loadFeedConfig, parseRssFeed, matchesKeywords, isKoreanCioItem } = require('./feedConfig');
const { cleanPostText } = require('./summaryUtils');

function kstDate(iso) {
    return new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

async function main() {
    const config = loadFeedConfig();
    const source = config.sources.cio;
    const feed = await parseRssFeed(source.feedUrl);

    console.log('\n=== CIO 수집 기준 (현재 설정) ===');
    console.log('RSS:', source.feedUrl);
    console.log('키워드 필터:', source.filterByKeywords ? 'ON' : 'OFF');
    console.log('키워드:', config.keywords.join(', '));
    console.log('매칭:', config.keywordMode);
    console.log('한국어 한도:', source.koreanLimit ?? 5);
    console.log('영문 한도:', source.englishLimit ?? 5);
    console.log('최대 스캔:', source.maxScanItems ?? 40, '건\n');

    const report = { scanned: [], included: [], skipped: [] };

    for (const item of feed.items.slice(0, source.maxScanItems || 40)) {
        const title = (item.title || '').trim();
        const description = cleanPostText(item.contentSnippet || item.summary || '');
        const searchText = `${title} ${description}`;
        const isKo = isKoreanCioItem(item);
        const keywordOk = !source.filterByKeywords
            || matchesKeywords(searchText, config.keywords, config.keywordMode);

        const row = {
            title: title.slice(0, 70),
            lang: isKo ? 'ko' : 'en',
            keywordOk,
            dateKst: item.pubDate ? kstDate(item.pubDate) : '?',
            link: item.link,
        };
        report.scanned.push(row);

        let reason = null;
        if (!keywordOk) reason = '키워드 불일치';
        if (!reason) report.included.push(row);
        else report.skipped.push({ ...row, reason });
    }

    const ko = report.included.filter((r) => r.lang === 'ko');
    const en = report.included.filter((r) => r.lang === 'en');
    console.log(`피드 전체: ${feed.items.length}건, 스캔: ${report.scanned.length}건`);
    console.log(`키워드 통과: ${report.included.length} (한국어 ${ko.length}, 영문 ${en.length})`);
    console.log(`제외: ${report.skipped.length}\n`);

    console.log('--- 한국어 (키워드 통과) ---');
    ko.forEach((r, i) => console.log(`${i + 1}. [${r.dateKst}] ${r.title}`));

    console.log('\n--- 영문 (키워드 통과) ---');
    en.slice(0, 10).forEach((r, i) => console.log(`${i + 1}. [${r.dateKst}] ${r.title}`));

    if (report.skipped.length) {
        console.log('\n--- 제외 샘플 (최대 5) ---');
        report.skipped.slice(0, 5).forEach((r) => {
            console.log(`- [${r.lang}] ${r.reason}: ${r.title}`);
        });
    }

    const newsPath = path.join(process.cwd(), 'public', 'data', 'news.json');
    if (fs.existsSync(newsPath)) {
        const posts = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
        const cio = posts.filter((p) => p.platform === 'CIO');
        const byDate = {};
        cio.forEach((p) => {
            const d = kstDate(p.date);
            byDate[d] = (byDate[d] || 0) + 1;
        });
        console.log('\n=== news.json CIO 저장 현황 ===');
        console.log('총', cio.length, '건, 날짜별:', byDate);
        console.log('※ 화면 기본 날짜가 최신 글 날짜(보통 Reddit/Medium)라 CIO가 다른 날짜면 안 보일 수 있음');
    }

    const logPath = path.join(process.cwd(), 'public', 'data', 'cio-fetch-log.json');
    fs.writeFileSync(logPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        config: {
            feedUrl: source.feedUrl,
            filterByKeywords: source.filterByKeywords,
            keywords: config.keywords,
            keywordMode: config.keywordMode,
            koreanLimit: source.koreanLimit,
            englishLimit: source.englishLimit,
            maxScanItems: source.maxScanItems,
        },
        summary: {
            feedTotal: feed.items.length,
            scanned: report.scanned.length,
            passedKeyword: report.included.length,
            korean: ko.length,
            english: en.length,
            skipped: report.skipped.length,
        },
        included: report.included,
        skippedSample: report.skipped.slice(0, 15),
    }, null, 2));
    console.log('\n저장:', logPath);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
