const { cleanPostText } = require('./summaryUtils');

const PAYWALL_MARKERS = [
    /continue reading on medium/i,
    /continue reading on [^»]+»/i,
    /continue reading/i,
    /read this story with a free medium account/i,
    /member[-\s]*only\s+story/i,
    /member[-\s]*read\s+story/i,
    /members?\s*only/i,
    /this story is for members/i,
    /subscribe to read/i,
    /unlock full access/i,
    /become a member to read/i,
    /only available to members/i,
    /upgrade to read/i,
    /story is for members only/i,
];

const DEFAULT_MIN_BODY_CHARS = 450;

function getMediumBody(item) {
    const html = item['content:encoded'] || item.content || item.summary || '';
    return cleanPostText(html);
}

function textHasPaywallMarker(text) {
    return PAYWALL_MARKERS.some((re) => re.test(text || ''));
}

function htmlIsMemberOnlyStory(html) {
    if (!html) return false;

    if (textHasPaywallMarker(html)) return true;

    if (/"isLocked"\s*:\s*true/i.test(html)) return true;
    if (/"isLockedPostPreview"\s*:\s*true/i.test(html)) return true;
    if (/"visibility"\s*:\s*"LOCKED"/i.test(html)) return true;
    if (/"membersOnly"\s*:\s*true/i.test(html)) return true;
    if (/"isMetered"\s*:\s*true/i.test(html)) return true;
    if (/"__typename"\s*:\s*"MeteredPost"/i.test(html)) return true;

    return false;
}

/** 저장·수집 공통: Medium 글을 버릴지 */
function shouldDropMediumPost(post) {
    if (post?.platform !== 'Medium') return false;
    const content = post.content || post.summary_ko || '';
    if (textHasPaywallMarker(content)) return true;
    if (textHasPaywallMarker(post.title || '')) return true;
    return false;
}

function isMediumPaywalled(item, bodyText, minBodyChars = DEFAULT_MIN_BODY_CHARS) {
    const link = item.link || '';
    if (link && !/medium\.com/i.test(link)) {
        return false;
    }

    if (hasPaywallMarker(item, bodyText)) {
        return true;
    }

    if ((bodyText || '').length < minBodyChars) {
        return true;
    }

    return false;
}

function hasPaywallMarker(item, bodyText) {
    const html = (item['content:encoded'] || item.content || '') + (item.contentSnippet || '');
    const combined = `${html} ${bodyText || ''}`;
    return PAYWALL_MARKERS.some((re) => re.test(combined));
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
 * Medium 기사 페이지 1회 조회: Member-only story 여부 + 본문 추출
 */
async function resolveMediumArticle(item, minBodyChars = DEFAULT_MIN_BODY_CHARS) {
    const link = item.link || item.guid;
    if (!link || !/medium\.com/i.test(link)) {
        const rssBody = getMediumBody(item);
        if (isMediumPaywalled(item, rssBody, minBodyChars)) {
            return { skip: true, reason: 'rss-paywall' };
        }
        return { skip: false, body: rssBody };
    }

    try {
        const html = await fetchMediumPageHtml(link);

        if (htmlIsMemberOnlyStory(html)) {
            return { skip: true, reason: 'member-only-story' };
        }

        let body = extractBodyFromMediumHtml(html);
        const rssBody = getMediumBody(item);
        if (body.length < minBodyChars && rssBody.length > body.length) {
            body = rssBody;
        }

        if (textHasPaywallMarker(body)) {
            return { skip: true, reason: 'teaser-in-body' };
        }

        if (isMediumPaywalled(item, body, minBodyChars)) {
            return { skip: true, reason: 'insufficient-body' };
        }

        return { skip: false, body };
    } catch (e) {
        const rssBody = getMediumBody(item);
        if (hasPaywallMarker(item, rssBody) || rssBody.length < minBodyChars) {
            return { skip: true, reason: `fetch-failed:${e.message}` };
        }
        return { skip: false, body: rssBody };
    }
}

/** @deprecated — resolveMediumArticle 사용 */
async function enrichMediumFromPage(item, bodyText) {
    const resolved = await resolveMediumArticle(item);
    if (resolved.skip) return null;
    return resolved.body;
}

function getPaywallReason(item, bodyText, minBodyChars = DEFAULT_MIN_BODY_CHARS) {
    const html = (item['content:encoded'] || item.content || '') + (item.contentSnippet || '');
    const combined = `${html} ${bodyText || ''}`;
    for (const re of PAYWALL_MARKERS) {
        if (re.test(combined)) return re.source;
    }
    if ((bodyText || '').length < minBodyChars) {
        return `body too short (${(bodyText || '').length} < ${minBodyChars})`;
    }
    return null;
}

module.exports = {
    getMediumBody,
    isMediumPaywalled,
    getPaywallReason,
    hasPaywallMarker,
    textHasPaywallMarker,
    shouldDropMediumPost,
    htmlIsMemberOnlyStory,
    resolveMediumArticle,
    enrichMediumFromPage,
    DEFAULT_MIN_BODY_CHARS,
};
