import type { WebGLRenderer } from 'three';

/** Opt-in local profiling HUD; Vite removes this body from production builds. */
export function createSceneDiagnostics(renderer: WebGLRenderer) {
  if (!import.meta.env.DEV || !new URLSearchParams(location.search).has('scene-debug')) return;
  const panel = document.createElement('output');
  panel.id = 'scene-diagnostics';
  panel.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:1000;padding:12px 16px;border:1px solid #ffffff24;border-radius:12px;background:#080d16e8;color:#c3d9da;font:11px/1.7 monospace;white-space:pre;pointer-events:none;';
  document.body.append(panel);
  const intervals: number[] = [], cpuTimes: number[] = [];
  let previous = 0, reported = 0, frames = 0, previousMoving = false;
  const percentile = (samples: number[], p: number) => {
    const sorted = [...samples].sort((a, b) => a - b);
    return (sorted[Math.floor((sorted.length - 1) * p)] ?? 0).toFixed(1);
  };
  return {
    record(now: number, cpuTime: number, moving: boolean) {
      const interval = now - previous;
      // Gaps between on-demand frames are idle time, not dropped animation frames.
      if (previousMoving && previous && interval > 1) {
        intervals.push(interval); cpuTimes.push(cpuTime);
        if (intervals.length > 240) { intervals.shift(); cpuTimes.shift(); }
      }
      previous = now; previousMoving = moving; frames++;
      if (now - reported < 500 && moving) return;
      reported = now;
      panel.textContent = `3D · ${moving ? 'animating' : 'resting / on demand'} · ${frames} frames\n`
        + `Frame interval p50 / p95: ${percentile(intervals, .5)} / ${percentile(intervals, .95)} ms\n`
        + `CPU submission p95: ${percentile(cpuTimes, .95)} ms\n`
        + `${renderer.info.render.calls} draws · ${renderer.info.render.triangles.toLocaleString()} triangles · DPR ${renderer.getPixelRatio().toFixed(2)}`;
    },
    pause() { previous = 0; previousMoving = false; },
    dispose() { panel.remove(); },
  };
}
