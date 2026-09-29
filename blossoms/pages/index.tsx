import Head from 'next/head';
import { Shell } from '../components/Shell';
import { MAX_SUPPLY, N_MAX } from '../config/season';

export default function Home() {
  return (
    <>
      <Head>
        <title>Blossoms · Nikxname</title>
      </Head>
      <Shell>
        <main className="bl-stage">
          <p className="bl-kicker">Season I · Ethereum</p>
          <h1 className="bl-title">Blossoms</h1>
          <p className="bl-lede">
            Stand in a finalized epoch. Click. A canvas grows from the block and from you.
            What you see is what you mint.
          </p>
          <p className="bl-meta">
            {MAX_SUPPLY} canvases · 1×1–{N_MAX}×{N_MAX} · preview ritual coming
          </p>
          <div className="bl-theatre bl-theatre--empty" aria-hidden>
            <span className="bl-theatre-note">Empty theatre</span>
          </div>
        </main>
      </Shell>
    </>
  );
}
