import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import { HebrewText } from "../components/HebrewText";
import { GlassCard } from "../components/GlassCard";
import { SceneVO } from "../components/SceneVO";
import { Caption } from "../components/Caption";

type Props = { voiceoverFile: string | null; caption: string };

const ALERTS = [
  {
    color: theme.colors.danger,
    icon: "⚠",
    text: "חריגה צפויה של 2% בתקציב אינסטלציה",
  },
  {
    color: theme.colors.success,
    icon: "✓",
    text: "המפקח אישר את שלב יציקת הרצפה",
  },
  {
    color: theme.colors.accent,
    icon: "📷",
    text: "התקבלה תמונה חדשה עם הערת ביצוע",
  },
  {
    color: theme.colors.warning,
    icon: "🔒",
    text: "יומן עבודה יומי אושר וננעל לשינויים",
  },
  {
    color: theme.colors.success,
    icon: "₪",
    text: "תשלום אבן דרך 3 שוחרר אוטומטית",
  },
  {
    color: theme.colors.accent,
    icon: "💬",
    text: "יוסי (קבלן שלד): עדכון יומי הוסף",
  },
];

const AlertChip: React.FC<{ alert: (typeof ALERTS)[number] }> = ({ alert }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 28px",
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: 999,
      direction: "rtl",
      whiteSpace: "nowrap",
      boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: alert.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: 20,
        fontWeight: 800,
      }}
    >
      {alert.icon}
    </div>
    <HebrewText size={26} weight={600}>
      {alert.text}
    </HebrewText>
  </div>
);

export const Scene7Marquee: React.FC<Props> = ({ voiceoverFile, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  // Two stacked rows scrolling in opposite RTL directions
  const offsetA = interpolate(frame, [0, 240], [0, -1600], {
    extrapolateRight: "extend",
  });
  const offsetB = interpolate(frame, [0, 240], [-1600, 0], {
    extrapolateRight: "extend",
  });

  return (
    <AbsoluteFill
      style={{
        background: theme.colors.bg,
      }}
    >
      <AbsoluteFill style={{ background: theme.gradients.radialGlow, opacity: 0.7 }} />

      <div
        style={{
          position: "absolute",
          top: 100,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleIn,
        }}
      >
        <HebrewText size={64} weight={800}>
          הפלטפורמה חיה. תמיד.
        </HebrewText>
        <HebrewText size={28} weight={500} color={theme.colors.textMuted}>
          התראות, אישורים ותקשורת בזמן אמת
        </HebrewText>
      </div>

      <div
        style={{
          position: "absolute",
          top: 360,
          left: 0,
          right: 0,
          display: "flex",
          gap: 24,
          transform: `translateX(${offsetA}px)`,
        }}
      >
        {[...ALERTS, ...ALERTS, ...ALERTS].map((a, i) => (
          <AlertChip key={`a-${i}`} alert={a} />
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          top: 480,
          left: 0,
          right: 0,
          display: "flex",
          gap: 24,
          transform: `translateX(${offsetB}px)`,
        }}
      >
        {[...ALERTS.slice().reverse(), ...ALERTS.slice().reverse(), ...ALERTS.slice().reverse()].map(
          (a, i) => (
            <AlertChip key={`b-${i}`} alert={a} />
          ),
        )}
      </div>

      <div
        style={{
          position: "absolute",
          top: 640,
          left: 0,
          right: 0,
          display: "flex",
          gap: 24,
          transform: `translateX(${offsetA * 0.7}px)`,
        }}
      >
        {[...ALERTS, ...ALERTS, ...ALERTS].map((a, i) => (
          <AlertChip key={`c-${i}`} alert={a} />
        ))}
      </div>

      {/* Glass card overlay summarizing */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 820,
          transform: `translateX(-50%) scale(${titleIn})`,
        }}
      >
        <GlassCard padding={32} radius={20}>
          <HebrewText size={34} weight={700}>
            הכל במקום אחד · הכל בזמן אמת
          </HebrewText>
        </GlassCard>
      </div>

      <Caption text={caption} hold={5} />
      <SceneVO src={voiceoverFile} />
    </AbsoluteFill>
  );
};
