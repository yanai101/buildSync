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

const TOTAL_BUDGET = 1_250_000;

const formatShekel = (n: number) =>
  `₪${Math.round(n).toLocaleString("he-IL")}`;

export const Scene4Budget: React.FC<Props> = ({ voiceoverFile, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardIn = spring({ frame, fps, config: { damping: 200 } });
  const cardLift = interpolate(cardIn, [0, 1], [50, 0]);

  const spentPct = interpolate(frame, [10, 110], [0, 0.42], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const committedPct = interpolate(frame, [40, 140], [0, 0.27], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const counterValue = spentPct * TOTAL_BUDGET;

  // RBAC toggle flips at frame 170
  const togglePos = spring({
    frame: frame - 170,
    fps,
    config: { damping: 18 },
  });
  const isContractor = togglePos > 0.5;
  const blurAmount = interpolate(frame, [170, 200], [0, 14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: theme.gradients.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 1300,
          opacity: cardIn,
          transform: `translateY(${cardLift}px)`,
        }}
      >
        <GlassCard padding={56} radius={28}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              direction: "rtl",
              marginBottom: 36,
            }}
          >
            <HebrewText size={48} weight={800} align="right">
              שקיפות תקציב חיה
            </HebrewText>
            {/* RBAC Toggle */}
            <div
              style={{
                display: "flex",
                background: theme.colors.surfaceAlt,
                borderRadius: 999,
                padding: 6,
                border: `1px solid ${theme.colors.border}`,
                position: "relative",
                gap: 4,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  bottom: 6,
                  width: 110,
                  background: theme.gradients.accentDeep,
                  borderRadius: 999,
                  right: 6 + togglePos * 116,
                  transition: "none",
                  boxShadow: "0 4px 14px rgba(224,122,56,0.5)",
                }}
              />
              <div
                style={{
                  width: 110,
                  textAlign: "center",
                  padding: "10px 0",
                  zIndex: 1,
                }}
              >
                <HebrewText size={22} weight={700}>
                  יזם
                </HebrewText>
              </div>
              <div
                style={{
                  width: 110,
                  textAlign: "center",
                  padding: "10px 0",
                  zIndex: 1,
                }}
              >
                <HebrewText size={22} weight={700}>
                  קבלן
                </HebrewText>
              </div>
            </div>
          </div>

          {/* Counter */}
          <div
            style={{
              direction: "rtl",
              marginBottom: 32,
              filter: isContractor ? `blur(${blurAmount}px)` : "none",
            }}
          >
            <HebrewText
              size={28}
              weight={500}
              color={theme.colors.textMuted}
              align="right"
            >
              סה״כ הוצא מתוך תקציב של {formatShekel(TOTAL_BUDGET)}
            </HebrewText>
            <div
              style={{
                fontFamily: theme.font.family,
                fontSize: 96,
                fontWeight: 900,
                background: theme.gradients.hero,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textAlign: "right",
                direction: "ltr",
                letterSpacing: -2,
              }}
            >
              {formatShekel(counterValue)}
            </div>
          </div>

          {/* Stacked bar */}
          <div
            style={{
              position: "relative",
              height: 56,
              background: theme.colors.surfaceAlt,
              borderRadius: 999,
              overflow: "hidden",
              border: `1px solid ${theme.colors.border}`,
              filter: isContractor ? `blur(${blurAmount}px)` : "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: `${spentPct * 100}%`,
                background: theme.gradients.accentDeep,
              }}
            />
            <div
              style={{
                position: "absolute",
                right: `${spentPct * 100}%`,
                top: 0,
                bottom: 0,
                width: `${committedPct * 100}%`,
                background: theme.colors.warning,
                opacity: 0.85,
              }}
            />
          </div>

          <div
            style={{
              direction: "rtl",
              display: "flex",
              gap: 32,
              marginTop: 24,
              filter: isContractor ? `blur(${blurAmount}px)` : "none",
            }}
          >
            <Legend color={theme.colors.accent} label="הוצא בפועל" />
            <Legend color={theme.colors.warning} label="התחייבות" />
            <Legend color={theme.colors.surfaceAlt} label="זמין" />
          </div>

          {isContractor && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  background: "rgba(10,10,12,0.55)",
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: 16,
                  padding: "20px 36px",
                  opacity: interpolate(frame, [180, 200], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                <HebrewText size={34} weight={700} color={theme.colors.textMuted}>
                  🔒 נסתר משטח הקבלן
                </HebrewText>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      <Caption text={caption} hold={5} />
      <SceneVO src={voiceoverFile} />
    </AbsoluteFill>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div
      style={{
        width: 18,
        height: 18,
        background: color,
        borderRadius: 4,
      }}
    />
    <HebrewText size={22} weight={600} color={theme.colors.textMuted}>
      {label}
    </HebrewText>
  </div>
);
