import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { loadFont } from "@remotion/google-fonts/Heebo";
import { z } from "zod";
import { theme } from "./theme";
import { Scene1Logo } from "./scenes/Scene1Logo";
import { Scene2Pain } from "./scenes/Scene2Pain";
import { Scene3Dashboard } from "./scenes/Scene3Dashboard";
import { Scene4Budget } from "./scenes/Scene4Budget";
import { Scene5Timeline } from "./scenes/Scene5Timeline";
import { Scene6DailyLog } from "./scenes/Scene6DailyLog";
import { Scene7Marquee } from "./scenes/Scene7Marquee";
import { Scene8CTA } from "./scenes/Scene8CTA";

loadFont("normal", { weights: ["400", "500", "600", "700", "800", "900"] });

export const PromoSchema = z.object({
  scenes: z.array(
    z.object({
      id: z.string(),
      voiceoverFile: z.string().nullable(),
      durationInFrames: z.number(),
      caption: z.string(),
    }),
  ),
});

export type PromoProps = z.infer<typeof PromoSchema>;

const SCENE_COMPONENTS: Record<
  string,
  React.FC<{ voiceoverFile: string | null; caption: string }>
> = {
  scene1: Scene1Logo,
  scene2: Scene2Pain,
  scene3: Scene3Dashboard,
  scene4: Scene4Budget,
  scene5: Scene5Timeline,
  scene6: Scene6DailyLog,
  scene7: Scene7Marquee,
  scene8: Scene8CTA,
};

export const Promo: React.FC<PromoProps> = ({ scenes }) => {
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <Series>
        {scenes.map((s) => {
          const Component = SCENE_COMPONENTS[s.id];
          if (!Component) return null;
          return (
            <Series.Sequence
              key={s.id}
              durationInFrames={s.durationInFrames}
              name={s.id}
            >
              <Component voiceoverFile={s.voiceoverFile} caption={s.caption} />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
