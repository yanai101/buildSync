#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "voiceover");
const MANIFEST_PATH = join(OUT_DIR, "manifest.json");

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";
const API_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL_ID = "eleven_multilingual_v2";

const SCRIPT = [
  { id: "scene1", text: "BuildSync. הפלטפורמה המקיפה ביותר לניהול בנייה ושיפוצים." },
  { id: "scene2", text: "די לרדוף אחרי קבלנים. די לאקסלים שבורים. די לקבלות בוואטסאפ." },
  { id: "scene3", text: "BuildSync מרכזת תקציב, משימות, תקשורת ותיעוד — בדשבורד אחד שמבין את השטח." },
  { id: "scene4", text: "שקיפות פיננסית מלאה. מעקב על כל שקל, בכל שלב, בכל חדר." },
  { id: "scene5", text: "ארבעה־עשר שלבי ביצוע, ציר זמן חי, ואבני דרך אוטומטיות." },
  { id: "scene6", text: "יומן עבודה יומי שמגן עליך משפטית — חתום, נעול, מוכן בלחיצה." },
  { id: "scene7", text: "התראות חיות, אישורים, ותקשורת — הכל במקום אחד." },
  { id: "scene8", text: "BuildSync — תתקדם לניהול של העתיד." },
];

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);

const fileExists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

const readManifest = async () => {
  if (!(await fileExists(MANIFEST_PATH))) return {};
  try {
    const raw = await readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.scenes
      ? Object.fromEntries(parsed.scenes.map((s) => [s.id, s]))
      : {};
  } catch {
    return {};
  }
};

const ttsRequest = async (text) => {
  if (!API_KEY) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set. Copy .env.local.example to .env.local and fill it in.",
    );
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${body}`);
  }
  return Buffer.from(await res.arrayBuffer());
};

const measureDurationSeconds = async (filePath) => {
  const { Input, ALL_FORMATS, BlobSource } = await import("mediabunny");
  const buf = await readFile(filePath);
  const blob = new Blob([buf], { type: "audio/mpeg" });
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(blob) });
  const seconds = await input.computeDuration();
  return seconds;
};

const main = async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const previous = await readManifest();
  const scenes = [];

  for (const item of SCRIPT) {
    const filename = `${item.id}.mp3`;
    const filePath = join(OUT_DIR, filename);
    const hash = sha(`${item.text}|${VOICE_ID}|${MODEL_ID}`);
    const cached = previous[item.id];
    const cacheHit =
      cached?.sha === hash &&
      cached?.text === item.text &&
      (await fileExists(filePath));

    if (cacheHit) {
      console.log(`✓ ${item.id} (cached)`);
      scenes.push({
        id: item.id,
        text: item.text,
        sha: hash,
        file: `voiceover/${filename}`,
        durationInSeconds: cached.durationInSeconds,
      });
      continue;
    }

    console.log(`→ ${item.id} (synthesizing)…`);
    const audio = await ttsRequest(item.text);
    await writeFile(filePath, audio);
    const durationInSeconds = await measureDurationSeconds(filePath);
    scenes.push({
      id: item.id,
      text: item.text,
      sha: hash,
      file: `voiceover/${filename}`,
      durationInSeconds,
    });
    console.log(`  saved ${filename} (${durationInSeconds.toFixed(2)}s)`);
  }

  const total = scenes.reduce((acc, s) => acc + s.durationInSeconds, 0);
  await writeFile(
    MANIFEST_PATH,
    JSON.stringify({ voiceId: VOICE_ID, model: MODEL_ID, scenes }, null, 2),
  );
  console.log(`\nManifest written. Total VO: ${total.toFixed(2)}s`);
  if (total > 60) {
    console.warn(
      `⚠ Total exceeds 60s by ${(total - 60).toFixed(2)}s — consider trimming the script.`,
    );
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
