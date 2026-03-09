/**
 * Metaphysical Calculation Utilities
 *
 * Pure functions for computing zodiac sign, Chinese zodiac,
 * five elements (五行), and numerology life path number
 * from a customer's birth date.
 */

// ── Western Zodiac ─────────────────────────────────────────

interface ZodiacRange {
  sign: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

const ZODIAC_RANGES: ZodiacRange[] = [
  { sign: '摩羯座', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },  // Capricorn
  { sign: '水瓶座', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },   // Aquarius
  { sign: '雙魚座', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },   // Pisces
  { sign: '牡羊座', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },   // Aries
  { sign: '金牛座', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },   // Taurus
  { sign: '雙子座', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },   // Gemini
  { sign: '巨蟹座', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },   // Cancer
  { sign: '獅子座', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },   // Leo
  { sign: '處女座', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },   // Virgo
  { sign: '天秤座', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },  // Libra
  { sign: '天蠍座', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 }, // Scorpio
  { sign: '射手座', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 }, // Sagittarius
];

/**
 * Calculate Western zodiac sign from birth date.
 */
export function calculateZodiacSign(birthDate: Date): string {
  const month = birthDate.getMonth() + 1; // 1-based
  const day = birthDate.getDate();

  for (const range of ZODIAC_RANGES) {
    if (range.startMonth === range.endMonth) {
      // Same month (doesn't happen in our data but safety)
      if (month === range.startMonth && day >= range.startDay && day <= range.endDay) {
        return range.sign;
      }
    } else if (range.startMonth > range.endMonth) {
      // Wraps around year boundary (Capricorn: Dec 22 – Jan 19)
      if (
        (month === range.startMonth && day >= range.startDay) ||
        (month === range.endMonth && day <= range.endDay)
      ) {
        return range.sign;
      }
    } else {
      // Normal range (e.g., Jan 20 – Feb 18)
      if (
        (month === range.startMonth && day >= range.startDay) ||
        (month === range.endMonth && day <= range.endDay)
      ) {
        return range.sign;
      }
    }
  }

  return '摩羯座'; // Fallback (shouldn't reach)
}

// ── Chinese Zodiac (生肖 + 天干地支) ──────────────────────

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
const ZODIAC_ANIMALS = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'] as const;

/**
 * Calculate Chinese zodiac animal and Heavenly Stem + Earthly Branch (天干地支).
 *
 * Uses the simple solar year approximation (not the lunar calendar).
 * For production accuracy, a proper lunisolar calendar library should be used.
 */
export function calculateChineseZodiac(birthDate: Date): string {
  const year = birthDate.getFullYear();
  // Reference: 甲子年 = 1984
  const offset = ((year - 4) % 12 + 12) % 12;
  const stemIdx = ((year - 4) % 10 + 10) % 10;
  const branchIdx = offset;
  const animal = ZODIAC_ANIMALS[offset];
  const stem = HEAVENLY_STEMS[stemIdx];
  const branch = EARTHLY_BRANCHES[branchIdx];

  return `${stem}${branch}${animal}年`;
}

// ── Five Elements (五行) ──────────────────────────────────

const STEM_ELEMENTS: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

/**
 * Calculate the Five Element (五行) based on the Heavenly Stem of the birth year.
 *
 * This is a simplified calculation using the year's Heavenly Stem.
 * A full BaZi (八字) reading would consider month, day, and hour pillars.
 */
export function calculateFiveElement(birthDate: Date): string {
  const year = birthDate.getFullYear();
  const stemIdx = ((year - 4) % 10 + 10) % 10;
  const stem = HEAVENLY_STEMS[stemIdx];
  return STEM_ELEMENTS[stem] ?? '土';
}

// ── Numerology: Life Path Number ──────────────────────────

/**
 * Calculate the Numerology Life Path Number (1–9, 11, 22, 33).
 *
 * Sum all digits of YYYY-MM-DD and reduce to a single digit,
 * preserving master numbers 11, 22, and 33.
 */
export function calculateLifePathNumber(birthDate: Date): number {
  const year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();

  const reduceToSingle = (n: number): number => {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = String(n)
        .split('')
        .reduce((sum, digit) => sum + parseInt(digit, 10), 0);
    }
    return n;
  };

  const yearReduced = reduceToSingle(year);
  const monthReduced = reduceToSingle(month);
  const dayReduced = reduceToSingle(day);

  return reduceToSingle(yearReduced + monthReduced + dayReduced);
}

// ── Aggregated Calculator ─────────────────────────────────

export interface MetaphysicalFields {
  zodiacSign: string;
  chineseZodiac: string;
  fiveElement: string;
  lifePathNumber: number;
}

/**
 * Calculate all metaphysical fields from a birth date string (YYYY-MM-DD).
 * Returns null if the date string is invalid.
 */
export function calculateAllMetaphysical(birthDateStr: string): MetaphysicalFields | null {
  const date = new Date(birthDateStr);
  if (isNaN(date.getTime())) return null;

  return {
    zodiacSign: calculateZodiacSign(date),
    chineseZodiac: calculateChineseZodiac(date),
    fiveElement: calculateFiveElement(date),
    lifePathNumber: calculateLifePathNumber(date),
  };
}
