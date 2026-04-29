import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HebrewText } from "./HebrewText";
import { theme } from "../theme";

type Props = {
  text: string;
  /** seconds the caption stays fully visible after fade-in */
  hold?: number;
};

export const Caption: React.FC<Props> = ({ text, hold = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const lift = interpolate(enter, [0, 1], [24, 0]);

  const fadeOutStart = (hold + 0.4) * fps;
  const fadeOut = interpolate(frame, [fadeOutStart, fadeOutStart + 12], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        right: 80,
        bottom: 80,
        maxWidth: 1100,
        opacity: enter * fadeOut,
        transform: `translateY(${lift}px)`,
      }}
    >
      <div
        style={{
          background: "rgba(10,10,12,0.65)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 16,
          padding: "18px 28px",
        }}
      >
        <HebrewText size={36} weight={600} align="right" lineHeight={1.3}>
          {text}
        </HebrewText>
      </div>
    </div>
  );
};
