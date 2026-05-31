import { describe, it, expect, vi, afterEach } from 'vitest';
import { countUp } from '$lib/actions/countUp';

describe('countUp action', () => {
  afterEach(() => vi.restoreAllMocks());

  it('observes the node via IntersectionObserver', () => {
    const node = document.createElement('span');
    const spy = vi.spyOn(IntersectionObserver.prototype, 'observe');
    countUp(node, { target: '15+' });
    expect(spy).toHaveBeenCalledWith(node);
  });

  it('sets text to final value immediately when IntersectionObserver unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const node = document.createElement('span');
    countUp(node, { target: '15+' });
    expect(node.textContent).toBe('15+');
  });

  it('sets non-numeric text to final value immediately when IO unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const node = document.createElement('span');
    countUp(node, { target: 'Cum Laude' });
    expect(node.textContent).toBe('Cum Laude');
  });

  it('disconnects observer on destroy', () => {
    const node = document.createElement('span');
    const spy = vi.spyOn(IntersectionObserver.prototype, 'disconnect');
    const action = countUp(node, { target: 6 });
    action?.destroy?.();
    expect(spy).toHaveBeenCalled();
  });
});
