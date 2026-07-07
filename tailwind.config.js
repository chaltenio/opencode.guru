/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a0a",
          elev: "#141414",
          card: "#1a1a1a",
        },
        // Brand red — tuned for AA contrast on near-black surfaces.
        // The default is the classic Netflix-style red. Hover lifts slightly.
        // `soft` is for tinted backgrounds (badges). `ink` is for body-text
        // that needs to remain legible at small sizes on dark.
        brand: {
          DEFAULT: "#ff2d3a",
          hover: "#ff4d59",
          soft: "#ff2d3a",
        },
        // Convenience aliases for text-on-dark.
        ink: {
          DEFAULT: "#f5f5f6",
          muted: "#a1a1aa",
          dim: "#71717a",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      // Use font-feature-settings from Inter: tabular nums in tables,
      // proper kerning on headings, etc.
      fontFeatureSettings: {
        "cv11": '"ss01"',
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      // Tighter, more readable ring + focus styles.
      ringColor: {
        DEFAULT: "#ff2d3a",
      },
      boxShadow: {
        "brand-glow": "0 0 0 4px rgba(255, 45, 58, 0.15)",
      },
    },
  },
  plugins: [],
};