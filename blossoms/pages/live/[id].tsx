import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { Shell } from '../../components/Shell';
import { MAX_SUPPLY, tokenIds } from '../../config/season';

type Props = { id: number };

/** Live renderer shell. Official stills later load `?official=1` here. */
export default function LivePage({ id }: Props) {
  return (
    <>
      <Head>
        <title>Live {id} · Blossoms</title>
      </Head>
      <Shell>
        <main className="bl-stage">
          <p className="bl-kicker">Live</p>
          <h1 className="bl-title">#{id}</h1>
          <p className="bl-lede">The official renderer will paint this frame from the on-chain seed.</p>
          <div className="bl-theatre bl-theatre--empty">
            <span className="bl-theatre-note">Awaiting seed</span>
          </div>
        </main>
      </Shell>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: tokenIds().map((id) => ({ params: { id: String(id) } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const id = Number(params?.id);
  if (!Number.isInteger(id) || id < 1 || id > MAX_SUPPLY) {
    return { notFound: true };
  }
  return { props: { id } };
};
