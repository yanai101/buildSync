import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import { HebrewText } from "../components/HebrewText";
import { GlassCard } from "../components/GlassCard";
import { SceneVO } from "../components/SceneVO";
import { Caption } from "../components/Caption";

type Props = { voiceoverFile: string | null; caption: string };

const FloatingLabel: React.FC<{
  delay: number;
  x: string;
  y: string;
  label: string;
  emoji: string;
}> = ({ delay, x, y, label, emoji }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  const float = Math.sin((frame - delay) / 18) * 6;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 40 + float}px) scale(${0.8 + enter * 0.2})`,
      }}
    >
      <GlassCard padding={18} radius={16}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            direction: "rtl",
          }}
        >
          <div style={{ fontSize: 36 }}>{emoji}</div>
          <HebrewText size={28} weight={700}>
            {label}
          </HebrewText>
        </div>
      </GlassCard>
    </div>
  );
};

export const Scene3Dashboard: React.FC<Props> = ({ voiceoverFile, caption }) => {
  const frame = useCurrentFrame();

  const zoom = interpolate(frame, [0, 240], [1.05, 1.18], {
    extrapolateRight: "extend",
  });
  const pan = interpolate(frame, [0, 240], [0, -30], {
    extrapolateRight: "extend",
  });
  const fadeIn = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: theme.colors.bg,
      }}
    >
      <AbsoluteFill
        style={{
          background: theme.gradients.radialGlow,
          opacity: 0.9,
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: fadeIn,
        }}
      >
        <div
          style={{
            transform: `scale(${zoom}) translateY(${pan}px)`,
            borderRadius: 24,
            overflow: "hidden",
            boxShadow:
              "0 50px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
          }}
        >
          <Img
            src={staticFile("dashboard_mockup.png")}
            style={{ width: 1500, height: "auto", display: "block" }}
          />
        </div>
      </AbsoluteFill>

      <FloatingLabel delay={20} x="6%" y="18%" label="תקציב" emoji="💰" />
      <FloatingLabel delay={40} x="78%" y="22%" label="משימות" emoji="✅" />
      <FloatingLabel delay={60} x="8%" y="68%" label="תקשורת" emoji="💬" />
      <FloatingLabel delay={80} x="76%" y="72%" label="תיעוד" emoji="📋" />

      <Caption text={caption} hold={5} />
      <SceneVO src={voiceoverFile} />
    </AbsoluteFill>
  );
};
