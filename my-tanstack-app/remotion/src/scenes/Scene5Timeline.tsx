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
import { SceneVO } from "../components/SceneVO";
import { Caption } from "../components/Caption";

type Props = { voiceoverFile: string | null; caption: string };

const STAGES = [
  { he: "תכנון והיתרים", w: 0.18 },
  { he: "פירוק והכנה", w: 0.1 },
  { he: "יסודות", w: 0.12 },
  { he: "שלד וקונסטרוקציה", w: 0.16 },
  { he: "אינסטלציה", w: 0.12 },
  { he: "חשמל", w: 0.12 },
  { he: "מיזוג", w: 0.08 },
  { he: "טיח וגבס", w: 0.1 },
  { he: "ריצוף וחיפוי", w: 0.14 },
  { he: "צבע ופרזול", w: 0.1 },
  { he: "ארונות ומטבח", w: 0.12 },
  { he: "סניטריה", w: 0.08 },
  { he: "גמרים", w: 0.1 },
  { he: "מסירה", w: 0.06 },
];

export const Scene5Timeline: React.FC<Props> = ({ voiceoverFile, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  const titleLift = interpolate(titleIn, [0, 1], [-20, 0]);

  return (
    <AbsoluteFill
      style={{
        background: theme.gradients.surface,
        padding: "80px 100px",
      }}
    >
      <div
        style={{
          opacity: titleIn,
          transform: `translateY(${titleLift}px)`,
          marginBottom: 36,
          direction: "rtl",
        }}
      >
        <HebrewText size={56} weight={800} align="right">
          ציר זמן · 14 שלבי ביצוע
        </HebrewText>
        <HebrewText size={26} weight={500} color={theme.colors.textMuted} align="right">
          התקדמות חיה ואבני דרך אוטומטיות
        </HebrewText>
      </div>

      <div style={{ direction: "rtl", display: "flex", flexDirection: "column", gap: 8 }}>
        {STAGES.map((s, i) => {
          const rowIn = spring({
            frame: frame - 12 - i * 4,
            fps,
            config: { damping: 200 },
          });
          const slide = interpolate(rowIn, [0, 1], [80, 0]);
          const fillStart = 30 + i * 4;
          const fillEnd = fillStart + 80;
          const fillPct = interpolate(frame, [fillStart, fillEnd], [0, s.w * 6], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const milestone = interpolate(
            frame,
            [fillEnd - 8, fillEnd + 6],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          return (
            <div
              key={i}
              style={{
                opacity: rowIn,
                transform: `translateX(${slide}px)`,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ width: 280, textAlign: "right" }}>
                <HebrewText size={22} weight={600}>
                  {`${i + 1}. ${s.he}`}
                </HebrewText>
              </div>
              <div
                style={{
                  flex: 1,
                  height: 32,
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 8,
                  position: "relative",
                  overflow: "visible",
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: `${Math.min(fillPct, 1) * 100}%`,
                    background: theme.gradients.accentDeep,
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(224,122,56,0.3)",
                  }}
                />
                {/* Milestone diamond at end */}
                <div
                  style={{
                    position: "absolute",
                    right: `calc(${Math.min(fillPct, 1) * 100}% - 12px)`,
                    top: "50%",
                    width: 24,
                    height: 24,
                    background: theme.colors.accentLight,
                    transform: `translateY(-50%) rotate(45deg) scale(${milestone})`,
                    boxShadow: "0 0 20px rgba(253,230,138,0.8)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Caption text={caption} hold={5} />
      <SceneVO src={voiceoverFile} />
    </AbsoluteFill>
  );
};
