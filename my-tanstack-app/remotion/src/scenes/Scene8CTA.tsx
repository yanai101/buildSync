import React from "react";
import {
  AbsoluteFill,
  Img,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import { HebrewText } from "../components/HebrewText";
import { GradientOrbit } from "../components/GradientOrbit";
import { SceneVO } from "../components/SceneVO";
import { Caption } from "../components/Caption";

type Props = { voiceoverFile: string | null; caption: string };

export const Scene8CTA: React.FC<Props> = ({ voiceoverFile, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 14 } });
  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 200 } });
  const ctaIn = spring({ frame: frame - 30, fps, config: { damping: 200 } });

  const pulse = 1 + Math.sin(frame / 8) * 0.02;

  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <GradientOrbit size={1600} opacity={0.55} speed={0.4} />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(10,10,12,0) 0%, rgba(10,10,12,0.85) 75%)",
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            transform: `scale(${logoIn * pulse})`,
            opacity: logoIn,
          }}
        >
          <Img
            src={staticFile("logo.png")}
            style={{
              width: 180,
              height: 180,
              filter: "drop-shadow(0 16px 48px rgba(224,122,56,0.6))",
            }}
          />
        </div>
        <div
          style={{
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 24}px)`,
          }}
        >
          <HebrewText size={92} weight={900} letterSpacing={-2}>
            תתקדם לניהול של העתיד
          </HebrewText>
        </div>
        <div
          style={{
            opacity: ctaIn,
            transform: `translateY(${(1 - ctaIn) * 20}px)`,
            display: "flex",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: "20px 44px",
              background: theme.gradients.accentDeep,
              borderRadius: 999,
              boxShadow: "0 20px 60px rgba(224,122,56,0.5)",
            }}
          >
            <HebrewText size={32} weight={800}>
              BuildSync.app
            </HebrewText>
          </div>
          <HebrewText size={28} weight={500} color={theme.colors.textMuted}>
            הירשמו עכשיו · 30 ימי ניסיון בחינם
          </HebrewText>
        </div>
      </AbsoluteFill>
      <Caption text={caption} hold={2.5} />
      <SceneVO src={voiceoverFile} />
    </AbsoluteFill>
  );
};
