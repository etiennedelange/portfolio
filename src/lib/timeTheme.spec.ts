import { describe, expect, it } from 'vitest';
import { onAccent } from './timeTheme';

describe('onAccent', () => {
	it('uses ink on bright accents', () => {
		expect(onAccent('#f5d90a')).toBe('#0a0a0a');
		expect(onAccent('#0ea5e9')).toBe('#0a0a0a');
	});

	it('uses white on the dark night-time greens', () => {
		expect(onAccent('#166534')).toBe('#ffffff');
		expect(onAccent('#15803d')).toBe('#ffffff');
	});
});
