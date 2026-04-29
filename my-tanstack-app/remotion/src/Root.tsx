import "./index.css";
import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { Promo, PromoProps, PromoSchema } from "./Promo";
import { FPS, HEIGHT, WIDTH } from "./theme";

type SceneSpec = {
  id: string;
  caption: string;
  fallbackSeconds: number;
};

const SCENES: SceneSpec[] = [
  {
    id: "scene1",
    caption: "BuildSync. הפלטפורמה המקיפה ביותר לניהול בנייה ושיפוצים.",
    fallbackSeconds: 5,
  },
  {
    id: "scene2",
    caption: "די לרדוף אחרי קבלנים. די לאקסלים שבורים. די לקבלות בוואטסאפ.",
    fallbackSeconds: 9,
  },
  {
    id: "scene3",
    caption:
      "BuildSync מרכזת תקציב, משימות, תקשורת ותיעוד — בדשבורד אחד שמבין את השטח.",
    fallbackSeconds: 8,
  },
  {
    id: "scene4",
    caption: "שקיפות פיננסית מלאה. מעקב על כל שקל, בכל שלב, בכל חדר.",
    fallbackSeconds: 10,
  },
  {
    id: "scene5",
    caption: "ארבעה־עשר שלבי ביצוע, ציר זמן חי, ואבני דרך אוטומטיות.",
    fallbackSeconds: 10,
  },
  {
    id: "scene6",
    caption: "יומן עבודה יומי שמגן עליך משפטית — חתום, נעול, מוכן בלחיצה.",
    fallbackSeconds: 8,
  },
  {
    id: "scene7",
    caption: "התראות חיות, אישורים, ותקשורת — הכל במקום אחד.",
    fallbackSeconds: 7,
  },
  {
    id: "scene8",
    caption: "BuildSync — תתקדם לניהול של העתיד.",
    fallbackSeconds: 4,
  },
];

const TAIL_FRAMES = 12;

const buildScenes = (
  manifest: {
    scenes?: { id: string; durationInSeconds: number; file: string }[];
  } | null,
): PromoProps["scenes"] => {
  return SCENES.map((spec) => {
    const m = manifest?.scenes?.find((x) => x.id === spec.id);
    const seconds = m?.durationInSeconds ?? spec.fallbackSeconds;
    return {
      id: spec.id,
      caption: spec.caption,
      voiceoverFile: m?.file ?? null,
      durationInFrames: Math.ceil(seconds * FPS) + TAIL_FRAMES,
    };
  });
};

const DEFAULT_SCENES = buildScenes(null);

const calculateMetadata: CalculateMetadataFunction<PromoProps> = async () => {
  let manifest: Awaited<ReturnType<typeof fetchManifest>> = null;
  try {
    manifest = await fetchManifest();
  } catch {
    manifest = null;
  }
  const scenes = buildScenes(manifest);
  const total = scenes.reduce((acc, s) => acc + s.durationInFrames, 0);
  return {
    props: { scenes },
    durationInFrames: total,
  };
};

const fetchManifest = async () => {
  const res = await fetch(staticFile("voiceover/manifest.json"));
  if (!res.ok) return null;
  return (await res.json()) as {
    scenes?: { id: string; durationInSeconds: number; file: string }[];
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BuildSyncPromo"
        component={Promo}
        schema={PromoSchema}
        defaultProps={{ scenes: DEFAULT_SCENES }}
        durationInFrames={DEFAULT_SCENES.reduce(
          (acc, s) => acc + s.durationInFrames,
          0,
        )}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
