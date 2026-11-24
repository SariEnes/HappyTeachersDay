/** Single source of truth for the Teachers' Day card text (used by the modal AND the PNG export). */

export interface TextRun {
  readonly text: string;
  readonly italic?: boolean;
}

export const CERTIFICATE = {
  ribbon: 'CEIT 111 · METU · 24 NOVEMBER 2026',
  title: "HAPPY TEACHERS' DAY, HOCAM!",
  body: "Thank you for inspiring us in CEIT 111. We didn't just learn to do—we DID to learn! (And yes, we checked the parentheses and references.)",
  referencesTitle: 'References',
  references: [
    [
      { text: '1. You, Hocam. (2026). ' },
      { text: '"Do to Learn: Mastering Presentations & Formatting."', italic: true },
      { text: ' CEIT 111 Lectures, METU.' },
    ],
    [
      { text: '2. Şevki. (2026). ' },
      { text: 'Classroom Survival & Technical Support Guide', italic: true },
      { text: '.' },
    ],
  ] as ReadonlyArray<readonly TextRun[]>,
  fileName: 'HappyTeachersDay_Hocam.png',
} as const;
