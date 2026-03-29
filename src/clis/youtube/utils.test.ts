import { describe, expect, it, vi } from 'vitest';
import { buildQuietPlaybackJs, quietWatchPlayback } from './utils.js';

describe('youtube utils', () => {
  it('buildQuietPlaybackJs mutes and pauses both player and media element', () => {
    const js = buildQuietPlaybackJs();
    expect(js).toContain('player?.mute');
    expect(js).toContain('player?.pauseVideo');
    expect(js).toContain("document.querySelector('video')");
    expect(js).toContain('media.muted = true');
    expect(js).toContain('media.pause()');
  });

  it('quietWatchPlayback ignores evaluation failures', async () => {
    const page = {
      evaluate: vi.fn().mockRejectedValue(new Error('boom')),
    };

    await expect(quietWatchPlayback(page as any)).resolves.toBeUndefined();
    expect(page.evaluate).toHaveBeenCalledTimes(1);
  });
});
