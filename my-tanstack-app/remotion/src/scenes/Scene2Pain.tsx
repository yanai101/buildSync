import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import { HebrewText } from "../components/HebrewText";
import { SceneVO } from "../components/SceneVO";
import { Caption } from "../components/Caption";

type Props = { voiceoverFile: string | null; caption: string };

const ExcelSheet: React.FC<{ delay: number; x: number; y: number }> = ({
  delay,
  x,
  y,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shake = Math.sin((frame - delay) / 2) * 4;
  const tilt = interpolate(frame, [delay + 30, delay + 80], [0, -25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fall = interpolate(frame, [delay + 60, delay + 120], [0, 700], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [delay + 60, delay + 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 360,
        height: 220,
        background: "#1f2937",
        border: "1px solid #374151",
        borderRadius: 8,
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        transform: `translate(${shake}px, ${fall}px) rotate(${tilt}deg) scale(${enter})`,
        opacity: enter * opacity,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#10b981",
          color: "white",
          padding: "6px 14px",
          fontFamily: "system-ui",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        budget_v17_FINAL_final.xlsx
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            borderBottom: "1px solid #374151",
            background: i % 2 ? "#111827" : "#1f2937",
          }}
        >
          {Array.from({ length: 4 }).map((__, j) => (
            <div
              key={j}
              style={{
                flex: 1,
                padding: "6px 8px",
                fontFamily: "monospace",
                fontSize: 13,
                color: "#9ca3af",
                borderRight: "1px solid #374151",
              }}
            >
              {j === 0
                ? `שורה ${i + 1}`
                : ["#REF!", "#NAME?", `${(random(`${delay}-${i}-${j}`) * 9999) | 0}₪`][
                    j - 1
                  ]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const ChatBubble: React.FC<{ delay: number; x: number; y: number; text: string }> = ({
  delay,
  x,
  y,
  text,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const exitX = interpolate(frame, [delay + 80, delay + 140], [0, 1400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [delay + 80, delay + 140], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        background: "#075E54",
        color: "white",
        padding: "12px 18px",
        borderRadius: 18,
        fontFamily: theme.font.family,
        fontSize: 22,
        maxWidth: 360,
        direction: "rtl",
        transform: `translateX(${exitX}px) scale(${enter})`,
        opacity: enter * opacity,
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      {text}
    </div>
  );
};

export const Scene2Pain: React.FC<Props> = ({ voiceoverFile, caption }) => {
  const frame = useCurrentFrame();

  const xMarkOpacity = interpolate(frame, [110, 140, 220, 240], [0, 1, 1, 0.4], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 50%, #1c1c22 0%, #0a0a0c 80%)",
      }}
    >
      <ExcelSheet delay={0} x={120} y={140} />
      <ExcelSheet delay={12} x={1440} y={180} />
      <ExcelSheet delay={24} x={780} y={420} />

      <ChatBubble delay={20} x={200} y={620} text="הקבלן לא ענה כבר 3 ימים" />
      <ChatBubble delay={36} x={1100} y={680} text="איפה הקבלות מאתמול?" />
      <ChatBubble delay={48} x={650} y={780} text="חרגנו מהתקציב ב-12%?!" />

      {/* Big X marks */}
      {[
        { x: 280, y: 280, size: 240 },
        { x: 1500, y: 320, size: 200 },
        { x: 920, y: 540, size: 280 },
      ].map((m, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: m.x,
            top: m.y,
            width: m.size,
            height: m.size,
            opacity: xMarkOpacity,
            transform: `rotate(${i * 8 - 8}deg)`,
          }}
        >
          <svg viewBox="0 0 100 100" width={m.size} height={m.size}>
            <line
              x1="15"
              y1="15"
              x2="85"
              y2="85"
              stroke={theme.colors.danger}
              strokeWidth="14"
              strokeLinecap="round"
            />
            <line
              x1="85"
              y1="15"
              x2="15"
              y2="85"
              stroke={theme.colors.danger}
              strokeWidth="14"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ))}

      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(frame, [0, 18], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        <HebrewText size={64} weight={800}>
          הכאוס הישן
        </HebrewText>
      </div>

      <Caption text={caption} hold={5} />
      <SceneVO src={voiceoverFile} />
    </AbsoluteFill>
  );
};
