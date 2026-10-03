export const MAISON_BLOCK_KINDS = [
  'lead',
  'copy',
  'quote',
  'work',
  'hang',
  'strip',
  'looking',
  'divider',
] as const;

export type MaisonBlockKind = (typeof MAISON_BLOCK_KINDS)[number];

export type MaisonStatus = 'draft' | 'private' | 'published';

export type MaisonBlock = {
  id: string;
  kind: MaisonBlockKind;
  data: Record<string, unknown>;
};

export type MaisonPage = {
  version: 1;
  slug: string;
  title: string;
  kicker: string;
  status: MaisonStatus;
  guestKey: string;
  blocks: MaisonBlock[];
  updatedAt: string;
};

export type MaisonIndexItem = {
  slug: string;
  title: string;
  status: MaisonStatus;
  updatedAt: string;
};

export type MaisonIndex = {
  version: 1;
  pages: MaisonIndexItem[];
};
