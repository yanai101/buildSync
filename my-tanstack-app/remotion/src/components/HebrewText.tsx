import React from "react";
import { theme } from "../theme";

type Props = {
  children: React.ReactNode;
  size?: number;
  weight?: 300 | 400 | 500 | 600 | 700 | 800 | 900;
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
  style?: React.CSSProperties;
  align?: "right" | "center" | "left";
};

export const HebrewText: React.FC<Props> = ({
  children,
  size = 56,
  weight = 700,
  color = theme.colors.text,
  letterSpacing = -0.5,
  lineHeight = 1.15,
  align = "center",
  style,
}) => {
  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        fontFamily: theme.font.family,
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing,
        lineHeight,
        textAlign: align,
        direction: "rtl",
        unicodeBidi: "plaintext",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
