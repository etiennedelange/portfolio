type CSSPalette = {
	'--c-bg': string;
	'--c-bg-alt': string;
	'--c-bg-card': string;
	'--c-accent': string;
	'--c-muted': string;
	'--c-border-soft': string;
};

type Anchor = { hour: number; light: CSSPalette; dark: CSSPalette };

const ANCHORS: Anchor[] = [
	{
		hour: 0,
		light: { '--c-bg': '#f0f0ff', '--c-bg-alt': '#e8e8f8', '--c-bg-card': '#f0f0ff', '--c-accent': '#6366f1', '--c-muted': '#7c7c9a', '--c-border-soft': '#d0d0e8' },
		dark:  { '--c-bg': '#070d1a', '--c-bg-alt': '#0d1428', '--c-bg-card': '#0a1120', '--c-accent': '#818cf8', '--c-muted': '#6b7a9a', '--c-border-soft': '#1a2540' },
	},
	{
		hour: 5,
		light: { '--c-bg': '#fff7ed', '--c-bg-alt': '#fff0dc', '--c-bg-card': '#fff7ed', '--c-accent': '#f97316', '--c-muted': '#78716c', '--c-border-soft': '#fed7aa' },
		dark:  { '--c-bg': '#1c1008', '--c-bg-alt': '#241509', '--c-bg-card': '#201208', '--c-accent': '#f97316', '--c-muted': '#9a7858', '--c-border-soft': '#3d2010' },
	},
	{
		hour: 7,
		light: { '--c-bg': '#ffffff', '--c-bg-alt': '#f5f5f4', '--c-bg-card': '#ffffff', '--c-accent': '#f5d90a', '--c-muted': '#6b7280', '--c-border-soft': '#e5e7eb' },
		dark:  { '--c-bg': '#1c160e', '--c-bg-alt': '#241b11', '--c-bg-card': '#2a1e12', '--c-accent': '#f5d90a', '--c-muted': '#a89178', '--c-border-soft': '#3d2d1a' },
	},
	{
		hour: 11,
		light: { '--c-bg': '#f0f9ff', '--c-bg-alt': '#e0f2fe', '--c-bg-card': '#f0f9ff', '--c-accent': '#0ea5e9', '--c-muted': '#4b6a7a', '--c-border-soft': '#bae6fd' },
		dark:  { '--c-bg': '#071525', '--c-bg-alt': '#0a1c30', '--c-bg-card': '#091a2e', '--c-accent': '#38bdf8', '--c-muted': '#6a8aaa', '--c-border-soft': '#1a3a55' },
	},
	{
		hour: 16,
		light: { '--c-bg': '#fffbeb', '--c-bg-alt': '#fef3c7', '--c-bg-card': '#fffbeb', '--c-accent': '#f59e0b', '--c-muted': '#78716c', '--c-border-soft': '#fde68a' },
		dark:  { '--c-bg': '#1c1208', '--c-bg-alt': '#241909', '--c-bg-card': '#201508', '--c-accent': '#fbbf24', '--c-muted': '#a89060', '--c-border-soft': '#3d2810' },
	},
	{
		hour: 19,
		light: { '--c-bg': '#f0eaff', '--c-bg-alt': '#e6ddff', '--c-bg-card': '#f0eaff', '--c-accent': '#7c3aed', '--c-muted': '#6a5a9e', '--c-border-soft': '#d0c4ff' },
		dark:  { '--c-bg': '#0e0a20', '--c-bg-alt': '#150f2e', '--c-bg-card': '#120d28', '--c-accent': '#a78bfa', '--c-muted': '#8080c0', '--c-border-soft': '#251e48' },
	},
	{
		hour: 24,
		light: { '--c-bg': '#f0f0ff', '--c-bg-alt': '#e8e8f8', '--c-bg-card': '#f0f0ff', '--c-accent': '#6366f1', '--c-muted': '#7c7c9a', '--c-border-soft': '#d0d0e8' },
		dark:  { '--c-bg': '#070d1a', '--c-bg-alt': '#0d1428', '--c-bg-card': '#0a1120', '--c-accent': '#818cf8', '--c-muted': '#6b7a9a', '--c-border-soft': '#1a2540' },
	},
];

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

function lerpPalette(a: CSSPalette, b: CSSPalette, t: number): CSSPalette {
	return Object.fromEntries(
		(Object.keys(a) as (keyof CSSPalette)[]).map((k) => [k, lerpHex(a[k], b[k], t)])
	) as CSSPalette;
}

export function applyTimePalette(fractionalHour: number, isDark: boolean): void {
	let from = ANCHORS[0];
	let to = ANCHORS[ANCHORS.length - 1];

	for (let i = 0; i < ANCHORS.length - 1; i++) {
		if (fractionalHour >= ANCHORS[i].hour && fractionalHour < ANCHORS[i + 1].hour) {
			from = ANCHORS[i];
			to = ANCHORS[i + 1];
			break;
		}
	}

	const span = to.hour - from.hour;
	const t = span > 0 ? (fractionalHour - from.hour) / span : 0;
	const palette = lerpPalette(isDark ? from.dark : from.light, isDark ? to.dark : to.light, t);

	const root = document.documentElement;
	for (const [key, value] of Object.entries(palette)) {
		root.style.setProperty(key, value);
	}
}
