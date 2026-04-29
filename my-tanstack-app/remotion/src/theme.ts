export const theme = {
  colors: {
    accent: "#E07A38",
    accentDark: "#B45309",
    accentLight: "#FDE68A",
    bg: "#0a0a0c",
    surface: "#131318",
    surfaceAlt: "#1c1c22",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    text: "#ffffff",
    textMuted: "#a0a0a0",
    border: "rgba(255,255,255,0.08)",
    glass: "rgba(255,255,255,0.06)",
  },
  gradients: {
    hero: "linear-gradient(135deg, #E07A38 0%, #FDE68A 100%)",
    accentDeep: "linear-gradient(135deg, #E07A38 0%, #B45309 100%)",
    surface:
      "linear-gradient(180deg, #131318 0%, #0a0a0c 100%)",
    radialGlow:
      "radial-gradient(circle at 50% 40%, rgba(224,122,56,0.35) 0%, rgba(10,10,12,0) 60%)",
  },
  font: {
    family:
      "'Heebo', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  },
} as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
