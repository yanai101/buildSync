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

const Row: React.FC<{ label: string; value: string; delay: number }> = ({
  label,
  value,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rowIn = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        opacity: rowIn,
        transform: `translateX(${(1 - rowIn) * 30}px)`,
        display: "flex",
        justifyContent: "space-between",
        padding: "14px 24px",
        borderBottom: "1px solid #e5e7eb",
        direction: "rtl",
        fontFamily: theme.font.family,
        fontSize: 24,
      }}
    >
      <div style={{ color: "#6b7280", fontWeight: 500 }}>{label}</div>
      <div style={{ color: "#111827", fontWeight: 700 }}>{value}</div>
    </div>
  );
};

export const Scene6DailyLog: React.FC<Props> = ({ voiceoverFile, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sheetIn = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const sheetLift = interpolate(sheetIn, [0, 1], [200, 0]);

  // Stamp: lands at frame 130
  const stampSpring = spring({
    frame: frame - 130,
    fps,
    config: { damping: 9, stiffness: 120, mass: 1 },
  });
  const stampScale = interpolate(stampSpring, [0, 1], [3.5, 1]);
  const stampOpacity = interpolate(frame, [128, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shake = frame > 140 && frame < 152 ? Math.sin(frame * 2) * 3 : 0;

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
          opacity: sheetIn,
          transform: `translateY(${sheetLift}px)`,
          width: 900,
          background: "white",
          borderRadius: 12,
          boxShadow: "0 40px 120px rgba(0,0,0,0.7)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            background: theme.gradients.accentDeep,
            color: "white",
            padding: "20px 32px",
            direction: "rtl",
          }}
        >
          <HebrewText size={36} weight={800} align="right" color="white">
            יומן עבודה יומי
          </HebrewText>
          <HebrewText
            size={20}
            weight={500}
            align="right"
            color="rgba(255,255,255,0.85)"
          >
            פרויקט: שדרוג דירת גן · רחוב הרצל 24, תל אביב
          </HebrewText>
        </div>

        <Row label="תאריך" value="29.04.2026" delay={10} />
        <Row label="מזג אוויר" value="22°C · בהיר" delay={20} />
        <Row label="צוות בשטח" value="9 אנשים · 3 קבלנים" delay={30} />
        <Row label="שלב פעיל" value="ריצוף וחיפוי" delay={40} />
        <Row label="התקדמות" value="64%" delay={50} />
        <Row label="תמונות שצורפו" value="14" delay={60} />
        <Row label="מפקח" value="✓ אושר ע״י דוד לוי" delay={75} />

        <div
          style={{
            padding: "20px 24px",
            background: "#f9fafb",
            direction: "rtl",
            fontFamily: theme.font.family,
            fontSize: 18,
            color: "#6b7280",
          }}
        >
          חתימה דיגיטלית · גובה הרשומה הוקלט בבלוקצ'יין פרטי · לא ניתן לשינוי בדיעבד
        </div>

        {/* Stamp */}
        <div
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: `translate(-50%, -50%) translateX(${shake}px) rotate(-18deg) scale(${stampScale})`,
            opacity: stampOpacity,
            border: `8px solid ${theme.colors.danger}`,
            borderRadius: 12,
            padding: "18px 44px",
            background: "rgba(239,68,68,0.08)",
          }}
        >
          <HebrewText size={72} weight={900} color={theme.colors.danger}>
            אושר וננעל
          </HebrewText>
        </div>
      </div>

      <Caption text={caption} hold={5} />
      <SceneVO src={voiceoverFile} />
    </AbsoluteFill>
  );
};
