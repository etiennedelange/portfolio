import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { countUp } from '$lib/actions/countUp';

// Minimal fake DOM node
function makeNode(initial = ''): HTMLElement {
  let _text = initial;
  return {
    get textContent() { return _text; },
    set textContent(v: string) { _text = v ?? ''; },
  } as unknown as HTMLElement;
}

describe('countUp action', () => {
  const observeMock = vi.fn();
  const disconnectMock = vi.fn();
  let intersectionCallback: IntersectionObserverCallback | null = null;

  beforeEach(() => {
    observeMock.mockClear();
    disconnectMock.mockClear();
    intersectionCallback = null;

    // Mock IntersectionObserver
    class MockIO {
      constructor(public cb: IntersectionObserverCallback) {
        intersectionCallback = cb;
      }
      observe = observeMock;
      disconnect = disconnectMock;
    }

    vi.stubGlobal('IntersectionObserver', MockIO as any);
    vi.stubGlobal('performance', { now: () => 0 });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(1200); // fast-forward to end of animation
      return 1;
    });
    vi.stubGlobal('setInterval', (cb: () => void) => {
      // Call immediately for testing
      cb();
      return 1;
    });
    vi.stubGlobal('clearInterval', () => {});
  });

  afterEach(() => vi.unstubAllGlobals());

  it('observes the node via IntersectionObserver', () => {
    const node = makeNode();
    countUp(node, { target: '15+' });
    expect(observeMock).toHaveBeenCalledWith(node);
  });

  it('sets text to final value immediately when IntersectionObserver unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const node = makeNode();
    countUp(node, { target: '15+' });
    expect(node.textContent).toBe('15+');
  });

  it('sets non-numeric text to final value immediately when IO unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const node = makeNode();
    countUp(node, { target: 'Cum Laude' });
    expect(node.textContent).toBe('Cum Laude');
  });

  it('disconnects observer on destroy', () => {
    const node = makeNode();
    const action = countUp(node, { target: 6 });
    action?.destroy?.();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('shows final value without animating once the reveal has played', async () => {
    vi.stubGlobal('sessionStorage', undefined);
    vi.resetModules();
    const { countUp: freshCountUp } = await import('$lib/actions/countUp');

    freshCountUp(makeNode(), { target: '15+' });
    intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

    observeMock.mockClear();
    const node = makeNode();
    freshCountUp(node, { target: '6' });
    expect(node.textContent).toBe('6');
    expect(observeMock).not.toHaveBeenCalled();
  });

  it('skips the reveal after a reload in the same tab session', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });

    vi.resetModules();
    const first = await import('$lib/actions/countUp');
    first.countUp(makeNode(), { target: '15+' });
    intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

    // Simulate a reload: fresh module state, same sessionStorage
    vi.resetModules();
    const reloaded = await import('$lib/actions/countUp');
    observeMock.mockClear();
    const node = makeNode();
    reloaded.countUp(node, { target: '15+' });
    expect(node.textContent).toBe('15+');
    expect(observeMock).not.toHaveBeenCalled();
  });
});
