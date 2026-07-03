import slugify from "slugify";
import type { VideoPlatform } from "@/db/schema";

export interface ParsedVideoUrl {
  platform: VideoPlatform;
  videoId: string | null;
  embedUrl: string;
  originalUrl: string;
}

export function parseVideoUrl(rawUrl: string): ParsedVideoUrl | null {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    // YouTube
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      if (!id) return null;
      return {
        platform: "YOUTUBE",
        videoId: id,
        embedUrl: `https://www.youtube.com/embed/${id}`,
        originalUrl: rawUrl,
      };
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        if (!id) return null;
        return {
          platform: "YOUTUBE",
          videoId: id,
          embedUrl: `https://www.youtube.com/embed/${id}`,
          originalUrl: rawUrl,
        };
      }
      if (u.pathname.startsWith("/embed/")) {
        const id = u.pathname.split("/")[2];
        if (!id) return null;
        return {
          platform: "YOUTUBE",
          videoId: id,
          embedUrl: `https://www.youtube.com/embed/${id}`,
          originalUrl: rawUrl,
        };
      }
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        if (!id) return null;
        return {
          platform: "YOUTUBE",
          videoId: id,
          embedUrl: `https://www.youtube.com/embed/${id}`,
          originalUrl: rawUrl,
        };
      }
    }

    // Vimeo
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      if (!id || !/^\d+$/.test(id)) return null;
      return {
        platform: "VIMEO",
        videoId: id,
        embedUrl: `https://player.vimeo.com/video/${id}`,
        originalUrl: rawUrl,
      };
    }

    // Twitch (clips / videos)
    if (host.endsWith("twitch.tv")) {
      if (u.pathname.startsWith("/videos/")) {
        const id = u.pathname.split("/")[2];
        if (!id) return null;
        return {
          platform: "TWITCH",
          videoId: id,
          embedUrl: `https://player.twitch.tv/?video=v${id}&parent=${getParent()}`,
          originalUrl: rawUrl,
        };
      }
      if (u.pathname.includes("/clip/")) {
        const slug = u.pathname.split("/clip/")[1]?.split("?")[0];
        if (!slug) return null;
        return {
          platform: "TWITCH",
          videoId: slug,
          embedUrl: `https://clips.twitch.tv/embed?clip=${slug}&parent=${getParent()}`,
          originalUrl: rawUrl,
        };
      }
    }

    // Anything else allowed (no login required per user spec)
    return {
      platform: "OTHER",
      videoId: null,
      embedUrl: rawUrl,
      originalUrl: rawUrl,
    };
  } catch {
    return null;
  }
}

function getParent(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_APP_URL).hostname;
    } catch {
      /* ignore */
    }
  }
  return "localhost";
}

export function thumbnailFor(parsed: ParsedVideoUrl): string | null {
  switch (parsed.platform) {
    case "YOUTUBE":
      return parsed.videoId
        ? `https://i.ytimg.com/vi/${parsed.videoId}/hqdefault.jpg`
        : null;
    case "VIMEO":
      // Vimeo requires oEmbed; client will fill in if blank. Use a fallback.
      return null;
    case "TWITCH":
      return null;
    default:
      return null;
  }
}

export function slugFor(title: string): string {
  return slugify(title, { lower: true, strict: true, trim: true }).slice(
    0,
    220,
  );
}