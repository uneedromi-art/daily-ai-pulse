/**
 * 포스트 본문에서 요약용 텍스트를 추출하고 한국어 요약을 만듭니다.
 */

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

function extractForSummary(text, maxChars = 520) {
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
        if (result.length >= Math.min(280, maxChars * 0.55)) break;
    }

    if (!result) {
        const cut = cleaned.substring(0, maxChars);
        const lastSpace = cut.lastIndexOf(' ');
        result = lastSpace > 80 ? cut.substring(0, lastSpace) : cut;
    }

    return result.trim();
}

function polishKoreanSummary(ko, sourceExcerpt) {
    if (!ko) return '';
    let text = ko.trim();

    // 입력에 없는 말줄임은 제거 (번역 API가 가끔 붙임)
    if (!sourceExcerpt.endsWith('...') && !sourceExcerpt.endsWith('…')) {
        text = text.replace(/\.{3}$/, '').replace(/…$/, '').trim();
    }

    if (text.length > 50 && !/[.!?。]$/.test(text)) {
        text += '.';
    }

    return text;
}

function createSummaryBuilder(safeTranslate) {
    return async function buildKoreanSummary(sourceText, options = {}) {
        const { isTitle = false, maxChars = 520 } = options;
        if (!sourceText?.trim()) return '';

        const excerpt = isTitle
            ? sourceText.trim()
            : extractForSummary(sourceText, maxChars);

        if (!excerpt) return '';

        const ko = await safeTranslate(excerpt);
        return polishKoreanSummary(ko, excerpt);
    };
}

module.exports = {
    cleanPostText,
    extractForSummary,
    polishKoreanSummary,
    createSummaryBuilder,
};
