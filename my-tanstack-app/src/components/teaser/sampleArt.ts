// Sample "site photos" for feature teasers (AI-generated, see public/teaser/).
// Illustrative only — never real user data. Compressed JPGs (~640px) so the
// previews stay light.

// Available now: frame, pipes, wires. More (ac, plaster, tiles, window, paint)
// can be added to public/teaser/ and this union later.
export type SampleArtKind = 'frame' | 'pipes' | 'wires';

export const sampleArt = (kind: SampleArtKind) => `/teaser/${kind}.jpg`;
