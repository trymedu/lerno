import { describe, expect, it } from 'bun:test';
import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { createLessonStage, defineDocument, type LessonStage } from '@medu/lerno';
import { useMediaClock } from './useMediaClock';

const document = defineDocument({
  id: 'clock',
  type: 'lesson',
  metadata: { title: 'Saat' },
  nodes: [{ id: 'clip', type: 'media', assetId: 'clip' }],
});

function Probe({ stage }: { stage: LessonStage }) {
  const ref = useRef<HTMLVideoElement>(null);
  const time = useMediaClock(stage, ref);
  return (
    <>
      <video ref={ref} data-testid="video" />
      <span data-testid="time">{time ?? -1}</span>
    </>
  );
}

describe('useMediaClock', () => {
  it('writes video time to the stage', async () => {
    const stage = createLessonStage(document, { durationMs: 30_000 });
    render(<Probe stage={stage} />);
    const video = screen.getByTestId('video') as HTMLVideoElement;

    video.currentTime = 2;
    await act(async () => {
      video.dispatchEvent(new Event('timeupdate'));
    });

    expect(stage.getState().timeMs).toBe(2000);
    expect(screen.getByTestId('time').textContent).toBe('2000');
  });

  it('applies the stage seek to the video', async () => {
    const stage = createLessonStage(document, { durationMs: 30_000 });
    render(<Probe stage={stage} />);
    const video = screen.getByTestId('video') as HTMLVideoElement;

    await act(async () => {
      stage.seek(5000);
    });

    expect(video.currentTime).toBeCloseTo(5, 1);
  });
});
