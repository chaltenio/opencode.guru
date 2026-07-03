"use client";

import { useEffect, useRef } from "react";

export function VideoPlayer({
  embedUrl,
  title,
  onProgress,
}: {
  embedUrl: string;
  title: string;
  onProgress?: (seconds: number) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Listen to YouTube postMessage events when on YouTube
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (typeof e.data !== "string") return;
      let data: { event?: string; info?: number } | null = null;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!data?.event) return;
      if (
        data.event === "infoDelivery" &&
        typeof data.info === "number" &&
        onProgress
      ) {
        onProgress(Math.floor(data.info));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onProgress]);

  return (
    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border border-zinc-800">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}