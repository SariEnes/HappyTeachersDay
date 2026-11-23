import { chance, pick, type Rng } from '../core/rng';

export type HairStyle =
  | 'short'
  | 'buzz'
  | 'long'
  | 'ponytail'
  | 'bun'
  | 'curly'
  | 'cap'
  | 'hijab'
  | 'balding';

export type Outfit = 'blazer' | 'sweater' | 'tshirt' | 'hoodie';

/** Pure data describing how a character looks. All colours are #rrggbb. */
export interface Appearance {
  readonly skin: string;
  readonly hair: string;
  readonly hairStyle: HairStyle;
  readonly outfit: Outfit;
  readonly top: string;
  /** Tie / collar / cap / hijab / hair-tie colour depending on style. */
  readonly accent: string;
  readonly pants: string;
  readonly shoes: string;
  readonly glasses: boolean;
}

export const PROFESSOR: Appearance = {
  skin: '#efc6a0',
  hair: '#d9d9de', // silver-white
  hairStyle: 'balding',
  outfit: 'blazer',
  top: '#3a4157',
  accent: '#8e2433',
  pants: '#2d313e',
  shoes: '#1b1b20',
  glasses: false,
};

export const SEVKI: Appearance = {
  skin: '#e6b78d',
  hair: '#2a1f1a',
  hairStyle: 'short',
  outfit: 'sweater',
  top: '#4d7a5c',
  accent: '#ececec',
  pants: '#384a6e',
  shoes: '#5a3b28',
  glasses: true,
};

const SKINS = ['#ffdcb4', '#f3c99f', '#e8b48a', '#d49a6a', '#c68642', '#a86b3c', '#8d5524'] as const;
const HAIRS = ['#1a1414', '#2b1d14', '#3d2a1e', '#4a3121', '#6b4226', '#8a5a2b', '#b5803a', '#d6b26e', '#7a2e1c'] as const;
const TOPS = [
  '#c0392b', '#2e86de', '#27ae60', '#f39c12', '#8e44ad', '#16a085', '#d35400',
  '#2c3e50', '#e84393', '#6c5ce7', '#00a8a8', '#b8b8b8', '#f1f1ea', '#5d6d7e',
  '#a0522d', '#1e3799', '#78a35a', '#e1b12c',
] as const;
const ACCENTS = ['#d6336c', '#1c7ed6', '#2b8a3e', '#f59f00', '#5f3dc4', '#212529', '#e8590c', '#868e96', '#c2255c', '#0c8599'] as const;
const PANTS = ['#2f3b55', '#3b4a6b', '#1f2430', '#4a4a4a', '#5b4636', '#6b7a8f', '#2b2b2b'] as const;
const SHOES = ['#f1f1f1', '#1b1b1b', '#5a3b28', '#3a3f4a', '#c0392b'] as const;

const STYLE_WEIGHTS: ReadonlyArray<[HairStyle, number]> = [
  ['short', 24], ['buzz', 9], ['long', 20], ['ponytail', 12],
  ['bun', 7], ['curly', 11], ['cap', 7], ['hijab', 8],
];
const OUTFIT_WEIGHTS: ReadonlyArray<[Outfit, number]> = [
  ['tshirt', 34], ['hoodie', 30], ['sweater', 30], ['blazer', 6],
];

function weighted<T>(rng: Rng, table: ReadonlyArray<[T, number]>): T {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of table) {
    r -= w;
    if (r < 0) return v;
  }
  return table[table.length - 1][0];
}

export function createRandomStudent(rng: Rng): Appearance {
  return {
    skin: pick(rng, SKINS),
    hair: pick(rng, HAIRS),
    hairStyle: weighted(rng, STYLE_WEIGHTS),
    outfit: weighted(rng, OUTFIT_WEIGHTS),
    top: pick(rng, TOPS),
    accent: pick(rng, ACCENTS),
    pants: pick(rng, PANTS),
    shoes: pick(rng, SHOES),
    glasses: chance(rng, 0.25),
  };
}
