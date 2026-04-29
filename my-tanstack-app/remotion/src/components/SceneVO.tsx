import React from "react";
import { Audio, staticFile } from "remotion";

type Props = {
  src: string | null;
};

export const SceneVO: React.FC<Props> = ({ src }) => {
  if (!src) return null;
  return <Audio src={staticFile(src)} />;
};
