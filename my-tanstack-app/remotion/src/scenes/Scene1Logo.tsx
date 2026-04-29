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
import { GradientOrbit } from "../components/GradientOrbit";
import { SceneVO } from "../components/SceneVO";
import { Caption } from "../components/Caption";

type Props = { voiceoverFile: string | null; caption: string };

export const Scene1Logo: React.FC<Props> = ({ voiceoverFile, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({
    frame: frame - 6,
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.7 },
  });
  const logoScale = interpolate(logoIn, [0, 1], [0.6, 1]);

  const titleIn = spring({
    frame: frame - 22,
    fps,
    config: { damping: 200 },
  });
  const titleLift = interpolate(titleIn, [0, 1], [30, 0]);

  const taglineIn = spring({
    frame: frame - 44,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <GradientOrbit size={1400} opacity={0.45} speed={0.6} />
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
          gap: 30,
        }}
      >
        <div style={{ transform: `scale(${logoScale})`, opacity: logoIn }}>
          <Img
            src={staticFile("logo.png")}
            style={{
              width: 220,
              height: 220,
              filter: "drop-shadow(0 20px 60px rgba(224,122,56,0.6))",
            }}
          />
        </div>
        <div
          style={{
            opacity: titleIn,
            transform: `translateY(${titleLift}px)`,
          }}
        >
          <HebrewText size={140} weight={900} letterSpacing={-3}>
            <span
              style={{
                background: theme.gradients.hero,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              BuildSync
            </span>
          </HebrewText>
        </div>
        <div style={{ opacity: taglineIn }}>
          <HebrewText size={38} weight={500} color={theme.colors.textMuted}>
            הפלטפורמה המקיפה ביותר לניהול בנייה ושיפוצים
          </HebrewText>
        </div>
      </AbsoluteFill>
      <Caption text={caption} hold={3} />
      <SceneVO src={voiceoverFile} />
    </AbsoluteFill>
  );
};
