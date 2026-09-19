import type { GetStaticPaths, GetStaticProps } from 'next';
import { getBlossomCanvasWork, getWorksBySeries, type SeriesId } from '../../config/catalog';
import { getAfbSpecialEditions } from '../../lib/chainWorks';
import { getEmbersWorks } from '../../lib/embersWorks';
import { CollectionSite } from '../../components/CollectionSite';
import { SERIES_IDS, isCollectionSeries } from '../../lib/sites';
import { allWorkSlugs } from '../../lib/workSlug';

type Props = {
  collection: SeriesId;
  item: string | null;
};

export default function CollectionPage({ collection, item }: Props) {
  return <CollectionSite seriesId={collection} itemSlug={item} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths: { params: { collection: string; item?: string[] } }[] = [];
  for (const seriesId of SERIES_IDS) {
    paths.push({ params: { collection: seriesId, item: [] } });
    const works =
      seriesId === 'a-familiar-burn'
        ? [
            getBlossomCanvasWork('still'),
            ...getWorksBySeries(seriesId),
            ...getEmbersWorks(),
            ...getAfbSpecialEditions(),
          ]
        : getWorksBySeries(seriesId);
    const seen = new Set<string>();
    for (const work of works) {
      for (const slug of allWorkSlugs(work)) {
        const key = slug.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        paths.push({ params: { collection: seriesId, item: [slug] } });
      }
    }
  }
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<Props> = async (ctx) => {
  const collection = String(ctx.params?.collection || '');
  if (!isCollectionSeries(collection)) return { notFound: true };
  const itemParts = ctx.params?.item;
  const item = Array.isArray(itemParts) && itemParts[0] ? itemParts[0] : null;
  return { props: { collection, item } };
};
