import { MAISON_BLOCK_KINDS, type MaisonBlock, type MaisonBlockKind } from './types';

export type MaisonField = {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'work' | 'works' | 'wallet';
  max?: number;
  hint?: string;
};

export type MaisonKindDef = {
  kind: MaisonBlockKind;
  label: string;
  blurb: string;
  fields: MaisonField[];
  defaults: Record<string, unknown>;
};

/** Single source for new block kinds — renderer, desk, and skill all read this. */
export const MAISON_REGISTRY: MaisonKindDef[] = [
  {
    kind: 'lead',
    label: 'Lead',
    blurb: 'Room title and a short opening line.',
    fields: [
      { key: 'kicker', label: 'Kicker', kind: 'text', max: 80 },
      { key: 'title', label: 'Title', kind: 'text', max: 120 },
      { key: 'line', label: 'Line', kind: 'textarea', max: 280 },
    ],
    defaults: { kicker: '', title: '', line: '' },
  },
  {
    kind: 'copy',
    label: 'Copy',
    blurb: 'A readable serif column. Plain text, preserved newlines.',
    fields: [{ key: 'body', label: 'Body', kind: 'textarea', max: 4000 }],
    defaults: { body: '' },
  },
  {
    kind: 'quote',
    label: 'Quote',
    blurb: 'One italic line, optional attribution.',
    fields: [
      { key: 'text', label: 'Quote', kind: 'textarea', max: 400 },
      { key: 'cite', label: 'Cite', kind: 'text', max: 80 },
    ],
    defaults: { text: '', cite: '' },
  },
  {
    kind: 'work',
    label: 'Work',
    blurb: 'One catalogue work, still by default.',
    fields: [{ key: 'workId', label: 'Work', kind: 'work' }],
    defaults: { workId: '' },
  },
  {
    kind: 'hang',
    label: 'Hang',
    blurb: 'A quiet museum row of one to three stills. Not Arrange Wall.',
    fields: [{ key: 'workIds', label: 'Works', kind: 'works', max: 3, hint: 'One to three works, left to right.' }],
    defaults: { workIds: [] },
  },
  {
    kind: 'strip',
    label: 'Strip',
    blurb: 'A horizontal run of stills.',
    fields: [{ key: 'workIds', label: 'Works', kind: 'works', max: 8 }],
    defaults: { workIds: [] },
  },
  {
    kind: 'looking',
    label: 'Looking',
    blurb: 'A door into the Looking Room. Optional garden wallet.',
    fields: [
      { key: 'label', label: 'Label', kind: 'text', max: 80 },
      { key: 'wallet', label: 'Garden wallet', kind: 'wallet' },
    ],
    defaults: { label: 'Open the Looking Room', wallet: '' },
  },
  {
    kind: 'divider',
    label: 'Divider',
    blurb: 'A quiet pause between blocks.',
    fields: [],
    defaults: {},
  },
];

const BY_KIND = new Map(MAISON_REGISTRY.map((d) => [d.kind, d]));

export function maisonKind(kind: string): MaisonKindDef | null {
  return BY_KIND.get(kind as MaisonBlockKind) ?? null;
}

export function isMaisonKind(kind: string): kind is MaisonBlockKind {
  return (MAISON_BLOCK_KINDS as readonly string[]).includes(kind);
}

export function newBlockId() {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createBlock(kind: MaisonBlockKind): MaisonBlock {
  const def = maisonKind(kind);
  return {
    id: newBlockId(),
    kind,
    data: { ...(def?.defaults ?? {}) },
  };
}
