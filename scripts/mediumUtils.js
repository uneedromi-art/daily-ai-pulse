const { cleanPostText } = require('./summaryUtils');

/** RSS/본문에 남는 티저 문구 (Continue reading 등) */
const TEASER_MARKERS = [
    /continue reading on medium/i,
    /continue reading on [^»]+»/i,
    /continue reading/i,
    /read this story with a free medium account/i,
    /this story is for members/i,
    /subscribe to read/i,
    /unlock full access/i,
    /become a member to read/i,
    /only available to members/i,
    /upgrade to read/i,
    /story is for members only/i,
];

/** 페이지 HTML·메타에서만 쓰는 Member-only / 잠금 신호 */
const MEMBER_ONLY_HTML_MARKERS = [
    /member[-\s]*only\s+story/i,
    /member[-\s]*read\s+story/i,
    /"isLocked"\s*:\s*true/i,
    /"isLockedPostPreview"\s*:\s*true/i,
    /"visibility"\s*:\s*"LOCKED"/i,
    /"membersOnly"\s*:\s*true/i,
    /"isMetered"\s*:\s*true/i,
    /"__typename"\s*:\s*"MeteredPost"/i,
];

/** 본문 추출 실패(빈 글) 방지용 — 유료 판별 아님 */
const DEFAULT_MIN_BODY_CHARS = 80;

function getMediumBody(item) {
    const html = item['content:encoded'] || item.content || item.summary || '';
    return cleanPostText(html);
}

function textHasTeaserMarker(text) {
    return TEASER_MARKERS.some((re) => re.test(text || ''));
}

function htmlIsMemberOnlyStory(html) {
    if (!html) return false;
    return MEMBER_ONLY_HTML_MARKERS.some((re) => re.test(html));
}

/** @deprecated — textHasTeaserMarker 사용 */
function textHasPaywallMarker(text) {
    return textHasTeaserMarker(text) || MEMBER_ONLY_HTML_MARKERS.some((re) => re.test(text || ''));
}

/** 저장·수집 공통: Medium 글을 버릴지 (티저·Member-only) */
function shouldDropMediumPost(post) {
    if (post?.platform !== 'Medium') return false;
    const content = post.content || post.summary_ko || '';
    if (textHasTeaserMarker(content)) return true;
    if (MEMBER_ONLY_HTML_MARKERS.some((re) => re.test(content))) return true;
    if (textHasTeaserMarker(post.title || '')) return true;
    return false;
}

function hasTeaserInItem(item, bodyText) {
    const html = (item['content:encoded'] || item.content || '') + (item.contentSnippet || '');
    const combined = `${html} ${bodyText || ''}`;
    return textHasTeaserMarker(combined);
}

/** @deprecated */
function hasPaywallMarker(item, bodyText) {
    return hasTeaserInItem(item, bodyText);
}

/** 티저/잠금 여부 (글자 수로 유료 판별하지 않음) */
function isMediumTeaserOrLocked(item, bodyText, minBodyChars = DEFAULT_MIN_BODY_CHARS) {
    if (hasTeaserInItem(item, bodyText)) return true;
    if (textHasTeaserMarker(bodyText)) return true;
    if ((bodyText || '').trim().length < minBodyChars) return true;
    return false;
}

/** @deprecated — isMediumTeaserOrLocked */
function isMediumPaywalled(item, bodyText, minBodyChars = DEFAULT_MIN_BODY_CHARS) {
    return isMediumTeaserOrLocked(item, bodyText, minBodyChars);
}

function extractBodyFromMediumHtml(html) {
    const paragraphs = [];
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = pRe.exec(html)) !== null) {
        const text = cleanPostText(match[1]);
        if (text.length > 50) paragraphs.push(text);
    }
    return paragraphs.join(' ');
}

async function fetchMediumPageHtml(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DailyAIPulse/1.0)',
            Accept: 'text/html',
        },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
}

/**
 * Medium RSS 항목: 페이지 HTML로 Member-only 여부 확인 후 본문 추출
 * 유료 판별: Member-only 메타/HTML + Continue reading 티저 (글자 수 X)
 */
async function resolveMediumArticle(item, minBodyChars = DEFAULT_MIN_BODY_CHARS) {
    const link = item.link || item.guid;
    const rssBody = getMediumBody(item);

    if (!link) {
        if (isMediumTeaserOrLocked(item, rssBody, minBodyChars)) {
            return { skip: true, reason: 'rss-teaser' };
        }
        return { skip: false, body: rssBody };
    }

    try {
        const html = await fetchMediumPageHtml(link);

        if (htmlIsMemberOnlyStory(html)) {
            return { skip: true, reason: 'member-only-story' };
        }

        let body = extractBodyFromMediumHtml(html);
        if (body.length < minBodyChars && rssBody.length > body.length) {
            body = rssBody;
        }

        if (textHasTeaserMarker(body)) {
            return { skip: true, reason: 'teaser-in-body' };
        }

        if (isMediumTeaserOrLocked(item, body, minBodyChars)) {
            return { skip: true, reason: 'empty-or-teaser' };
        }

        return { skip: false, body };
    } catch (e) {
        if (isMediumTeaserOrLocked(item, rssBody, minBodyChars)) {
            return { skip: true, reason: `fetch-failed:${e.message}` };
        }
        return { skip: false, body: rssBody };
    }
}

/** @deprecated — resolveMediumArticle 사용 */
async function enrichMediumFromPage(item) {
    const resolved = await resolveMediumArticle(item);
    if (resolved.skip) return null;
    return resolved.body;
}

function getPaywallReason(item, bodyText, minBodyChars = DEFAULT_MIN_BODY_CHARS) {
    if (hasTeaserInItem(item, bodyText)) {
        return 'teaser marker in rss/body';
    }
    for (const re of TEASER_MARKERS) {
        if (re.test(bodyText || '')) return re.source;
    }
    if ((bodyText || '').trim().length < minBodyChars) {
        return `body empty (${(bodyText || '').length} < ${minBodyChars})`;
    }
    return null;
}

module.exports = {
    getMediumBody,
    isMediumPaywalled,
    isMediumTeaserOrLocked,
    getPaywallReason,
    hasPaywallMarker,
    hasTeaserInItem,
    textHasPaywallMarker,
    textHasTeaserMarker,
    shouldDropMediumPost,
    htmlIsMemberOnlyStory,
    resolveMediumArticle,
    enrichMediumFromPage,
    DEFAULT_MIN_BODY_CHARS,
};
