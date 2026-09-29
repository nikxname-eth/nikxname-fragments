import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { Shell } from '../../components/Shell';
import { MAX_SUPPLY, tokenIds } from '../../config/season';

type Props = { id: number };

export default function TokenPage({ id }: Props) {
  return (
    <>
      <Head>
        <title>Blossom {id} · Nikxname</title>
      </Head>
      <Shell>
        <main className="bl-stage">
          <p className="bl-kicker">Token</p>
          <h1 className="bl-title">#{id}</h1>
          <p className="bl-lede">This theatre is waiting for a minted seed.</p>
          <div className="bl-theatre bl-theatre--empty">
            <span className="bl-theatre-note">Unminted</span>
          </div>
          <p className="bl-id">
            {id} / {MAX_SUPPLY}
          </p>
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
