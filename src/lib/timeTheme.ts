import { PALETTE_ANCHORS, PALETTE_KEYS, type PaletteKey } from './palette';

type CSSPalette = Record<PaletteKey, string>;

function rowToPalette(values: string[]): CSSPalette {
	return Object.fromEntries(PALETTE_KEYS.map((k, i) => [k, values[i]])) as CSSPalette;
}

function lerpHex(a: string, b: string, t: number): string {
	const parse = (h: string): [number, number, number] => {
		const n = parseInt(h.replace('#', ''), 16);
		return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
	};
	const [ar, ag, ab] = parse(a);
	const [br, bg, bb] = parse(b);
	return '#' + [
		Math.round(ar + (br - ar) * t),
		Math.round(ag + (bg - ag) * t),
		Math.round(ab + (bb - ab) * t),
	].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function luminance(hex: string): number {
	const n = parseInt(hex.replace('#', ''), 16);
	const [r, g, b] = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff].map((v) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Ink or white, whichever reads better on the accent. One of the two always
// clears 4.5:1, so tags and buttons stay AA as the accent darkens at night.
export function onAccent(accent: string): string {
	const l = luminance(accent);
	return (l + 0.05) / (0.0033 + 0.05) >= 1.05 / (l + 0.05) ? '#0a0a0a' : '#ffffff';
}

function lerpPalette(a: CSSPalette, b: CSSPalette, t: number): CSSPalette {
	return Object.fromEntries(
		(Object.keys(a) as PaletteKey[]).map((k) => [k, lerpHex(a[k], b[k], t)])
	) as CSSPalette;
}

export function applyTimePalette(fractionalHour: number, isDark: boolean): void {
	let from = PALETTE_ANCHORS[0];
	let to = PALETTE_ANCHORS[PALETTE_ANCHORS.length - 1];

	for (let i = 0; i < PALETTE_ANCHORS.length - 1; i++) {
		if (fractionalHour >= PALETTE_ANCHORS[i][0] && fractionalHour < PALETTE_ANCHORS[i + 1][0]) {
			from = PALETTE_ANCHORS[i];
			to = PALETTE_ANCHORS[i + 1];
			break;
		}
	}

	const span = to[0] - from[0];
	const t = span > 0 ? (fractionalHour - from[0]) / span : 0;
	const palette = lerpPalette(
		rowToPalette(isDark ? from[2] : from[1]),
		rowToPalette(isDark ? to[2] : to[1]),
		t
	);

	const root = document.documentElement;
	for (const [key, value] of Object.entries(palette)) {
		root.style.setProperty(key, value);
	}
	root.style.setProperty('--c-on-accent', onAccent(palette['--c-accent']));

	// The portrait duotone multiplies a grayscale photo over this tint, which
	// only ever darkens the result — it needs the vivid (dark-mode) accent
	// variant even in light mode, since the light-mode accent is tuned dark
	// at night for button/tag contrast instead of brightness.
	const portraitTint = lerpHex(
		rowToPalette(from[2])['--c-accent'],
		rowToPalette(to[2])['--c-accent'],
		t
	);
	root.style.setProperty('--c-portrait-tint', portraitTint);
}
