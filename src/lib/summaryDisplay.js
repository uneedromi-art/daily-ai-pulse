/** 카드·저장 공통: 요약 최대 길이 (공백 포함) */
export const SUMMARY_DISPLAY_MAX = 320;

/** 마침표·느낌표 등으로 문장 분리 (한글: 마침표 뒤 공백 없어도 분리) */
export function splitSentences(text) {
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

/** 한 문장이 maxChars를 넘을 때: 쉼표 구절 → 마지막 완결 구두점/공백 (말줄임 없음) */
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
    if (punct > 40) {
        return cut.slice(0, punct + 1).trim();
    }

    const space = cut.lastIndexOf(' ');
    if (space > 40) {
        cut = cut.slice(0, space).trim();
    } else {
        cut = cut.trim();
    }

    return ensureSentenceEnd(cut, maxChars);
}

/**
 * maxChars 이하로 맞춤. 뒤 문장을 빼는 방식만 사용하고 … / ... 는 붙이지 않음.
 */
export function clipSummary(text, maxChars = SUMMARY_DISPLAY_MAX) {
    const raw = (text || '').trim();
    if (!raw || raw.length <= maxChars) return raw;

    const sentences = splitSentences(raw);
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
