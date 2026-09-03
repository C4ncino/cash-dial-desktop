const FALLBACK_LOCALE = "es-MX";
const INVALID_NUMBER = "—";

function resolveLocale() {
  const candidate = typeof navigator === "undefined" ? undefined : navigator.language;
  if (!candidate) return FALLBACK_LOCALE;
  try {
    return Intl.NumberFormat.supportedLocalesOf([candidate]).length > 0
      ? candidate
      : FALLBACK_LOCALE;
  } catch {
    return FALLBACK_LOCALE;
  }
}

export const lang = resolveLocale();
export const clockFormat12 = true;

export function formatNumber(value: number, top?: number) {
  if (!Number.isFinite(value)) return INVALID_NUMBER;
  const digits = top !== undefined && Math.abs(value) > top ? 0 : 2;
  return value.toLocaleString(lang, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatAmount(value: number, currency: Currency) {
  if (!Number.isFinite(value)) return INVALID_NUMBER;
  try {
    return value
      .toLocaleString(lang, { style: "currency", currency: currency.code })
      .replace(/\s/g, " ");
  } catch {
    const label = currency.symbol?.trim() || currency.code?.trim();
    return label ? `${formatNumber(value)} ${label}` : formatNumber(value);
  }
}

export function formatInt(value: number) {
  if (!Number.isFinite(value)) return INVALID_NUMBER;
  return value.toLocaleString(lang, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatShortAmount(value: number, needDecimals = false) {
  if (!Number.isFinite(value)) return INVALID_NUMBER;
  const absNum = Math.abs(value);
  const digits = needDecimals ? 2 : 0;
  if (absNum >= 1e9) return `${(value / 1e9).toFixed(digits)}B`;
  if (absNum >= 1e6) return `${(value / 1e6).toFixed(digits)}M`;
  if (absNum >= 1e3) return `${(value / 1e3).toFixed(digits)}K`;
  return value.toLocaleString(lang, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function hyphenateSpanishWord(word: string) {
  const vowels = "aeiouáéíóúü";
  const strongVowels = "aeoáéó";
  const weakVowels = "iuíúü";
  const consonants = "bcdfghjklmnñpqrstvwxyz";
  const specialGroups = ["bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "tr"];
  const normalized = word.toLocaleLowerCase("es-MX");
  let result = "";

  for (let index = 0; index < word.length; index++) {
    const current = normalized[index];
    const next = normalized[index + 1] ?? "";
    const nextNext = normalized[index + 2] ?? "";
    result += word[index];
    if (index === word.length - 1) break;

    if (strongVowels.includes(current) && strongVowels.includes(next)) result += "\u00AD";
    else if (
      (strongVowels.includes(current) && weakVowels.includes(next)) ||
      (weakVowels.includes(current) && strongVowels.includes(next)) ||
      (weakVowels.includes(current) && weakVowels.includes(next))
    )
      continue;
    else if (vowels.includes(current) && consonants.includes(next) && vowels.includes(nextNext))
      result += "\u00AD";
    else if (
      consonants.includes(current) &&
      consonants.includes(next) &&
      vowels.includes(nextNext) &&
      !specialGroups.includes(current + next)
    )
      result += "\u00AD";
    else if (
      consonants.includes(current) &&
      consonants.includes(next) &&
      consonants.includes(nextNext) &&
      vowels.includes(normalized[index + 3] ?? "")
    )
      result += "\u00AD";
  }
  return result;
}

export function hyphenateText(text: string, maxLineLen: number) {
  if (!text) return "";
  const safeMax = Number.isFinite(maxLineLen) ? Math.max(0, Math.floor(maxLineLen)) : 0;
  let currentLen = 0;
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) {
        currentLen += part.length;
        return part;
      }
      if (currentLen + part.length <= safeMax) {
        currentLen += part.length;
        return part;
      }
      currentLen = part.length;
      return hyphenateSpanishWord(part);
    })
    .join("");
}
