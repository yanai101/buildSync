import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

type Props = {
  size?: number;
  speed?: number;
  opacity?: number;
};

export const GradientOrbit: React.FC<Props> = ({
  size = 900,
  speed = 1,
  opacity = 0.55,
}) => {
  const frame = useCurrentFrame();
  const rotate = interpolate(frame, [0, 600 / speed], [0, 360], {
    extrapolateRight: "extend",
  });

  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        background: `conic-gradient(from 0deg, ${theme.colors.accent}, ${theme.colors.accentLight}, ${theme.colors.accent}, ${theme.colors.accentDark}, ${theme.colors.accent})`,
        filter: "blur(80px)",
        opacity,
        borderRadius: "50%",
      }}
    />
  );
};
