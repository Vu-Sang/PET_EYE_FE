import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { resolveStreamUrl } from '../utils/streamHelper';

export default function HLSPlayer({
  streamUrl,
  isMuted,
  onError,
}: {
  streamUrl: string;
  isMuted: boolean;
  onError: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const resolvedUrl = resolveStreamUrl(streamUrl);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.loadSource(resolvedUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('[HLS] Fatal error:', data);
          onError();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = resolvedUrl;
      video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
    } else {
      onError();
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [streamUrl, onError]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-cover"
      autoPlay
      playsInline
      muted={isMuted}
    />
  );
}
