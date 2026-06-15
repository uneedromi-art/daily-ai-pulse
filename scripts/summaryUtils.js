/**
 * 포스트 본문에서 요약용 텍스트를 추출하고 한국어 요약을 만듭니다.
 */

const SUMMARY_INPUT_CHARS = 2000;
const SUMMARY_TARGET_MIN = 200;
const SUMMARY_TARGET_MAX = 320;
const SUMMARY_IDEAL_SENTENCES = 4;

function cleanPostText(text) {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, ' ')
        .replace(/https?:\/\/\S+/gi, ' ')
        .replace(/www\.\S+/gi, ' ')
        .replace(/📰\s*Source:\s*\S+/gi, ' ')
        .replace(/🔗\s*(Link|Archive):\s*\S+/gi, ' ')
        .replace(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .replace(/([.!?])([A-ZÁÉÍÓÚÀ-ÿ])/g, '$1 $2')
        .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚ])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractForSummary(text, maxChars = SUMMARY_INPUT_CHARS) {
    const cleaned = cleanPostText(text);
    if (!cleaned) return '';
    if (cleaned.length <= maxChars) return cleaned;

    const sentences = cleaned.match(/[^.!?。…]+[.!?。…]+|[^.!?。…]+$/gu) || [cleaned];
    let result = '';

    for (const sentence of sentences) {
        const part = sentence.trim();
        if (!part) continue;
        const next = result ? `${result} ${part}` : part;
        if (next.length > maxChars) {
            if (!result) {
                const cut = part.substring(0, maxChars);
                const lastSpace = cut.lastIndexOf(' ');
                result = lastSpace > 80 ? cut.substring(0, lastSpace) : cut;
            }
            break;
        }
        result = next;
        if (result.length >= Math.min(maxChars * 0.65, 1200)) break;
    }

    if (!result) {
        const cut = cleaned.substring(0, maxChars);
        const lastSpace = cut.lastIndexOf(' ');
        result = lastSpace > 80 ? cut.substring(0, lastSpace) : cut;
    }

    return result.trim();
}

function splitKoreanSentences(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return [];

    const parts = trimmed.match(/[^.!?。]+[.!?。]+|[^.!?。]+$/gu);
    return (parts || [trimmed]).map((s) => s.trim()).filter(Boolean);
}

function ensureSentenceEnd(text, maxChars) {
    const t = (text || '').trim();
    if (!t) return t;
    if (/[.!?。]$/.test(t)) return t;
    if (maxChars && t.length >= maxChars) return t;
    if (maxChars && t.length + 1 > maxChars) return t;
    return `${t}.`;
}

function trimLongSentence(sentence, maxChars) {
    if (sentence.length <= maxChars) return sentence;

    const chunks = sentence.split(/(?<=[,，;；])\s*/);
    if (chunks.length > 1) {
        let result = '';
        for (const chunk of chunks) {
            const next = result ? `${result}${chunk}` : chunk;
            if (next.length > maxChars) break;
            result = next;
        }
        if (result.trim().length > 0) {
            return ensureSentenceEnd(result.trim(), maxChars);
        }
    }

    let cut = sentence.slice(0, maxChars);
    const punct = Math.max(
        cut.lastIndexOf('.'),
        cut.lastIndexOf('!'),
        cut.lastIndexOf('?'),
        cut.lastIndexOf('。')
    );
    if (punct > 40) return cut.slice(0, punct + 1).trim();

    const space = cut.lastIndexOf(' ');
    if (space > 40) cut = cut.slice(0, space).trim();
    else cut = cut.trim();

    return ensureSentenceEnd(cut, maxChars);
}

/** maxChars 이하. 뒤 문장 제거만, 말줄임(…) 없음 */
function clipToMaxChars(text, maxChars = SUMMARY_TARGET_MAX) {
    const raw = (text || '').trim();
    if (!raw || raw.length <= maxChars) return raw;

    const sentences = splitKoreanSentences(raw);
    let result = '';

    for (const sentence of sentences) {
        const next = result ? `${result} ${sentence}` : sentence;
        if (next.length <= maxChars) {
            result = next;
            continue;
        }
        if (!result) {
            result = trimLongSentence(sentence, maxChars);
        }
        break;
    }

    return result || trimLongSentence(raw, maxChars);
}

function isMostlyKorean(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return false;
    const hangul = (trimmed.match(/[\uAC00-\uD7A3]/g) || []).length;
    if (hangul >= 24) return true;
    const letters = trimmed.replace(/\s+/g, '').length;
    return letters > 0 && hangul / letters >= 0.25;
}

function polishKoreanSummary(ko, sourceExcerpt) {
    if (!ko) return '';
    let text = ko.trim();

    if (!sourceExcerpt.endsWith('...') && !sourceExcerpt.endsWith('…')) {
        text = text.replace(/\.{3}$/, '').replace(/…$/, '').trim();
    }

    let sentences = splitKoreanSentences(text);
    if (sentences.length > SUMMARY_IDEAL_SENTENCES) {
        sentences = sentences.slice(0, SUMMARY_IDEAL_SENTENCES);
        text = sentences.join(' ');
    }

    text = clipToMaxChars(text, SUMMARY_TARGET_MAX);

    if (text.length > 50 && !/[.!?。]$/.test(text)) {
        text += '.';
    }

    return text;
}

function shouldRetrySummary(polished, isTitle) {
    if (isTitle) return false;
    if (process.env.SUMMARY_RETRY === 'false') return false;
    if (process.env.USE_FREE_TRANSLATE === 'true') return false;
    return polished.length < SUMMARY_TARGET_MIN;
}

function createSummaryBuilder(safeTranslate) {
    return async function buildKoreanSummary(sourceText, options = {}) {
        const { isTitle = false, maxChars = SUMMARY_INPUT_CHARS } = options;
        if (!sourceText?.trim()) return '';

        const excerpt = isTitle
            ? sourceText.trim()
            : extractForSummary(sourceText, maxChars);

        if (!excerpt) return '';

        if (isMostlyKorean(excerpt)) {
            return polishKoreanSummary(clipToMaxChars(excerpt), excerpt);
        }

        let ko = await safeTranslate(excerpt);
        let polished = polishKoreanSummary(ko, excerpt);

        if (shouldRetrySummary(polished, isTitle)) {
            const retryText = `${excerpt}\n\n[필수: 3~4문장, 200~320자 한국어 뉴스 요약. 320자를 넘기지 마세요.]`;
            ko = await safeTranslate(retryText);
            polished = polishKoreanSummary(ko, excerpt);
        }

        return polished;
    };
}

module.exports = {
    cleanPostText,
    extractForSummary,
    polishKoreanSummary,
    clipToMaxChars,
    createSummaryBuilder,
    isMostlyKorean,
    SUMMARY_INPUT_CHARS,
    SUMMARY_TARGET_MIN,
    SUMMARY_TARGET_MAX,
};
