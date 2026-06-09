/**
 * Resolves camera stream URL from backend.
 * If backend returned localhost/127.0.0.1 but the frontend is accessed from an external device on the network,
 * it replaces localhost/127.0.0.1 with the backend API hostname to ensure the stream can load.
 */
export const resolveStreamUrl = (url?: string): string => {
  if (!url) return '';
  let finalUrl = url;

  // Auto-convert RTSP to MediaMTX HLS for frontend testing
  if (finalUrl.startsWith('rtsp://')) {
    try {
      const parsed = new URL(finalUrl);
      // MediaMTX default HLS port is 8888. The stream path is parsed.pathname.
      // HLS is served from the backend/MediaMTX server host (localhost/API host), not the RTSP camera host.
      // Example: rtsp://192.168.0.101:8554/stream -> http://localhost:8888/stream/index.m3u8
      finalUrl = `http://localhost:8888${parsed.pathname}/index.m3u8`;
    } catch (e) {
      console.warn('Could not parse RTSP URL to convert to HLS', e);
    }
  }

  if (finalUrl.includes('localhost') || finalUrl.includes('127.0.0.1')) {
    try {
      const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
      if (apiURL.startsWith('http')) {
        const apiHostname = new URL(apiURL).hostname;
        return finalUrl.replace('localhost', apiHostname).replace('127.0.0.1', apiHostname);
      }
      const clientHostname = window.location.hostname;
      return finalUrl.replace('localhost', clientHostname).replace('127.0.0.1', clientHostname);
    } catch (e) {
      console.error('Error resolving stream URL hostname:', e);
      return finalUrl;
    }
  }
  return finalUrl;
};

/**
 * Checks if a stream URL is reachable and returning 200 OK.
 * Used to wait for MediaMTX to initialize the stream.
 */
export const checkStreamReady = async (url: string, maxAttempts = 15, intervalMs = 1000): Promise<boolean> => {
  if (!url) return false;
  
  const resolvedUrl = resolveStreamUrl(url);
  console.log(`[checkStreamReady] Starting readiness check. Original URL: "${url}", Resolved URL: "${resolvedUrl}"`);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(resolvedUrl, { method: 'GET', cache: 'no-store' });
      if (response.ok) {
        console.log(`[checkStreamReady] Stream is ready (Attempt ${i + 1}/${maxAttempts})`);
        return true;
      }
      console.warn(`[checkStreamReady] Stream response not OK: ${response.status} ${response.statusText} (Attempt ${i + 1}/${maxAttempts})`);
    } catch (e) {
      console.warn(`[checkStreamReady] Fetch error on attempt ${i + 1}/${maxAttempts} for ${resolvedUrl}:`, e);
      // Ignore network errors/404 during connection build-up
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  console.error(`[checkStreamReady] Stream is NOT ready after ${maxAttempts} attempts at URL: ${resolvedUrl}`);
  return false;
};
