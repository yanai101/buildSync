import React from "react";
import { theme } from "../theme";

type Props = {
  children: React.ReactNode;
  padding?: number;
  radius?: number;
  style?: React.CSSProperties;
};

export const GlassCard: React.FC<Props> = ({
  children,
  padding = 24,
  radius = 20,
  style,
}) => {
  return (
    <div
      style={{
        background: theme.colors.glass,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid ${theme.colors.border}`,
        borderRadius: radius,
        padding,
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
