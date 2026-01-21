/**
 * WCAG Contrast Ratio Checker
 * 
 * WCAG Requirements:
 * - AA: 4.5:1 for normal text, 3:1 for large text
 * - AAA: 7:1 for normal text, 4.5:1 for large text
 */

// Tailwind v4 stone palette (OKLCH -> approximate sRGB hex)
const TAILWIND_COLORS = {
    // Stone palette
    'stone-50': '#fafaf9',
    'stone-100': '#f5f5f4',
    'stone-200': '#e7e5e4',
    'stone-300': '#d6d3d1',
    'stone-400': '#a8a29e',
    'stone-500': '#78716c',
    'stone-600': '#57534e',
    'stone-700': '#44403c',
    'stone-800': '#292524',
    'stone-900': '#1c1917',
    'stone-950': '#0c0a09',

    // Lime palette
    'lime-400': '#a3e635',
    'lime-500': '#84cc16',
    'lime-600': '#65a30d',
    'lime-900': '#365314',

    // Amber palette
    'amber-300': '#fcd34d',
    'amber-400': '#fbbf24',
    'amber-500': '#f59e0b',

    // Violet palette
    'violet-300': '#c4b5fd',
    'violet-400': '#a78bfa',

    // Emerald palette
    'emerald-300': '#6ee7b7',
    'emerald-400': '#34d399',
    'emerald-500': '#10b981',

    // Red palette
    'red-200': '#fecaca',
    'red-300': '#fca5a5',
    'red-400': '#f87171',
    'red-500': '#ef4444',

    // Sky palette
    'sky-300': '#7dd3fc',
    'sky-400': '#38bdf8',
    'sky-500': '#0ea5e9',
};

// Convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Calculate relative luminance
function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio
function getContrastRatio(color1, color2) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
}

// Check WCAG compliance
function checkWCAG(ratio) {
    return {
        aaLargeText: ratio >= 3,
        aaNormalText: ratio >= 4.5,
        aaaLargeText: ratio >= 4.5,
        aaaNormalText: ratio >= 7
    };
}

// Color combinations to check (foreground on background)
const COLOR_PAIRS = [
    // Primary text on backgrounds
    { name: 'Text Primary on Page Background', fg: 'stone-50', bg: 'stone-950' },
    { name: 'Text Primary on Surface Primary', fg: 'stone-50', bg: 'stone-900' },
    { name: 'Text Primary on Surface Secondary', fg: 'stone-50', bg: 'stone-800' },
    { name: 'Text Secondary on Page Background', fg: 'stone-300', bg: 'stone-950' },
    { name: 'Text Secondary on Surface Primary', fg: 'stone-300', bg: 'stone-900' },
    { name: 'Text Tertiary on Page Background', fg: 'stone-300', bg: 'stone-950' },
    { name: 'Text Tertiary on Surface Primary', fg: 'stone-300', bg: 'stone-900' },
    { name: 'Text Placeholder on Surface Primary', fg: 'stone-500', bg: 'stone-900' },

    // Brand colors on backgrounds
    { name: 'Primary Green on Page Background', fg: 'lime-500', bg: 'stone-950' },
    { name: 'Primary Green on Surface Primary', fg: 'lime-500', bg: 'stone-900' },
    { name: 'Primary Yellow on Page Background', fg: 'amber-500', bg: 'stone-950' },
    { name: 'Primary Yellow on Surface Primary', fg: 'amber-500', bg: 'stone-900' },
    { name: 'Primary Violet on Page Background', fg: 'violet-300', bg: 'stone-950' },
    { name: 'Primary Violet on Surface Primary', fg: 'violet-300', bg: 'stone-900' },

    // Status colors on backgrounds
    { name: 'Success on Page Background', fg: 'emerald-400', bg: 'stone-950' },
    { name: 'Success on Surface Primary', fg: 'emerald-400', bg: 'stone-900' },
    { name: 'Warning on Page Background', fg: 'amber-400', bg: 'stone-950' },
    { name: 'Warning on Surface Primary', fg: 'amber-400', bg: 'stone-900' },
    { name: 'Error on Page Background', fg: 'red-300', bg: 'stone-950' },
    { name: 'Error on Surface Primary', fg: 'red-300', bg: 'stone-900' },
    { name: 'Info on Page Background', fg: 'sky-400', bg: 'stone-950' },
    { name: 'Info on Surface Primary', fg: 'sky-400', bg: 'stone-900' },

    // Text inverse on brand colors (buttons)
    { name: 'Text Inverse on Primary Green', fg: 'stone-950', bg: 'lime-500' },
    { name: 'Text Inverse on Primary Yellow', fg: 'stone-950', bg: 'amber-500' },
    { name: 'Text Inverse on Primary Violet', fg: 'stone-950', bg: 'violet-300' },

    // Chat bubbles
    { name: 'Text Primary on Chat Bubble Patient', fg: 'stone-50', bg: 'lime-900' },
    { name: 'Text Primary on Chat Bubble User', fg: 'stone-50', bg: 'stone-800' },
];

console.log('='.repeat(80));
console.log('WCAG CONTRAST RATIO CHECK');
console.log('='.repeat(80));
console.log('');
console.log('Requirements:');
console.log('  - WCAG AA:  4.5:1 (normal text), 3:1 (large text)');
console.log('  - WCAG AAA: 7:1 (normal text), 4.5:1 (large text)');
console.log('');
console.log('-'.repeat(80));

let passCount = 0;
let warnCount = 0;
let failCount = 0;

COLOR_PAIRS.forEach(pair => {
    const fgHex = TAILWIND_COLORS[pair.fg];
    const bgHex = TAILWIND_COLORS[pair.bg];

    if (!fgHex || !bgHex) {
        console.log(`⚠️  ${pair.name}: Color not found`);
        return;
    }

    const ratio = getContrastRatio(fgHex, bgHex);
    const wcag = checkWCAG(ratio);

    let status;
    if (wcag.aaaNormalText) {
        status = '✅ AAA';
        passCount++;
    } else if (wcag.aaNormalText) {
        status = '⚠️  AA only';
        warnCount++;
    } else if (wcag.aaLargeText) {
        status = '❌ AA Large only';
        failCount++;
    } else {
        status = '❌ FAIL';
        failCount++;
    }

    console.log(`${status.padEnd(15)} ${ratio.toFixed(2).padStart(6)}:1  ${pair.name}`);
    console.log(`               fg: ${pair.fg} (${fgHex}) | bg: ${pair.bg} (${bgHex})`);
});

console.log('');
console.log('-'.repeat(80));
console.log('SUMMARY');
console.log('-'.repeat(80));
console.log(`✅ AAA Compliant: ${passCount}`);
console.log(`⚠️  AA Only:       ${warnCount}`);
console.log(`❌ Needs Fix:      ${failCount}`);
console.log('');

if (failCount > 0 || warnCount > 0) {
    console.log('RECOMMENDATIONS:');
    console.log('-'.repeat(80));

    if (warnCount > 0 || failCount > 0) {
        console.log(`
To achieve WCAG AAA compliance, consider:

1. For brand colors on dark backgrounds:
   - lime-500 → lime-400 (brighter, better contrast)
   - amber-500 → amber-400 (brighter)
   - violet-400 is already optimal

2. For text colors:
   - stone-400 (tertiary) → stone-300 for AAA on stone-900
   - stone-500 (placeholder) is intentionally lower contrast

3. For button text:
   - Ensure text-inverse (stone-950) on lime-500/amber-500 meets 4.5:1
`);
    }
}
