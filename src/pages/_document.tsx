import { Html, Head, Main, NextScript } from 'next/document';

const META = {
  title: 'Together In Bloom — Nikxname',
  description: 'An on-chain art discovery experience. 27 fragments revealed over time. Collection I — A Familiar Burn.',
  url: 'https://nikxart.xyz',
  ogImage: 'https://assets.nikxart.xyz/Banner-Medium.jpg?width=1200&quality=88&format=auto',
  twitterHandle: '@nikxname',
};

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content={META.description} />
        <meta name="theme-color" content="#06060a" />
        <meta name="color-scheme" content="dark light" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={META.url} />
        <meta property="og:title" content={META.title} />
        <meta property="og:description" content={META.description} />
        <meta property="og:image" content={META.ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="607" />
        <meta property="og:site_name" content="Nikxname" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={META.twitterHandle} />
        <meta name="twitter:creator" content={META.twitterHandle} />
        <meta name="twitter:title" content={META.title} />
        <meta name="twitter:description" content={META.description} />
        <meta name="twitter:image" content={META.ogImage} />

        {/* Favicon */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='450 80 130 185'%3E%3Cpath fill='%23e6ddd0' d='M458.753235%2C132.001770 C458.755554%2C127.504929 458.911346%2C123.500244 458.716980%2C119.512619 C458.535492%2C115.789352 460.113708%2C114.564713 463.730499%2C114.614639 C474.554260%2C114.764023 485.381500%2C114.678162 496.207306%2C114.655212 C498.665497%2C114.649994 501.366821%2C115.139023 502.906708%2C112.445747 C504.507050%2C109.646790 501.995697%2C108.244270 500.713654%2C106.448624 C497.899780%2C102.507446 497.817932%2C98.277412 500.012787%2C94.196426 C502.851837%2C88.917679 507.635498%2C86.115837 513.543701%2C86.370087 C519.176697%2C86.612488 523.864319%2C89.348610 526.276306%2C94.685829 C528.339600%2C99.251511 527.997375%2C103.727791 524.319092%2C107.620728 C523.056519%2C108.957001 521.935242%2C110.544472 523.131897%2C112.539101 C524.209473%2C114.335304 525.964783%2C114.650681 527.890137%2C114.648964 C538.882568%2C114.639183 549.874939%2C114.652794 560.867371%2C114.669273 C568.346252%2C114.680481 568.349060%2C114.688400 568.354614%2C121.933983 C568.362976%2C132.759827 568.380432%2C143.585693 568.361938%2C154.411484 C568.358093%2C156.682327 568.653259%2C158.818420 570.861877%2C160.004593 C573.127197%2C161.221252 574.559204%2C159.461060 576.136658%2C158.298141 C580.685181%2C154.944839 585.544250%2C154.707870 590.034729%2C157.600037 C594.858643%2C160.706970 597.863403%2C167.150391 596.823303%2C172.157471 C594.484741%2C183.415070 584.680969%2C187.368134 575.133057%2C180.890991 C573.714233%2C179.928467 572.325806%2C179.003052 570.572876%2C180.115707 C568.622009%2C181.353989 568.364502%2C183.301712 568.366272%2C185.365448 C568.375549%2C196.191299 568.379944%2C207.017136 568.386108%2C217.842987 C568.387024%2C219.508469 568.259827%2C221.186096 568.415771%2C222.836945 C568.758972%2C226.470062 567.239014%2C227.958939 563.570435%2C227.910278 C552.415222%2C227.762283 541.257080%2C227.838150 530.101440%2C227.710922 C527.554077%2C227.681854 524.953125%2C227.303482 523.362427%2C229.801300 C521.654236%2C232.483521 524.056213%2C234.034607 525.348206%2C235.861282 C528.263428%2C239.982986 528.286438%2C244.401672 525.802124%2C248.537292 C522.774963%2C253.576508 518.066467%2C256.580170 512.085144%2C256.056976 C506.462555%2C255.565186 501.988434%2C252.578796 499.673004%2C247.222885 C497.638885%2C242.517715 498.342804%2C238.128021 502.066162%2C234.365204 C503.140472%2C233.279495 504.019775%2C231.979416 503.250549%2C230.340515 C502.230774%2C228.167709 500.175049%2C227.953491 498.148071%2C227.946945 C487.322479%2C227.911987 476.496643%2C227.954941 465.671051%2C227.916885 C458.879700%2C227.893005 458.784637%2C227.764313 458.774231%2C220.822540 C458.757507%2C209.663651 458.677765%2C198.503906 458.790436%2C187.346207 C458.835815%2C182.852707 459.989441%2C182.322739 463.875916%2C184.489380 C471.188171%2C188.565842 478.085114%2C187.374481 483.553345%2C181.090286 C488.653503%2C175.229095 489.105164%2C166.402176 484.617584%2C160.291534 C479.136719%2C152.828323 471.728119%2C151.196396 463.718506%2C155.897446 C460.026398%2C158.064438 458.820740%2C156.498535 458.782257%2C152.986511 C458.707489%2C146.158859 458.756287%2C139.329834 458.753235%2C132.001770 Z'/%3E%3C/svg%3E"
        />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap"
          rel="stylesheet"
        />

        {/* MANIFOLD DIRECT ON-PAGE CONNECT AND INTERACTIVE MINT SCRIPTS */}
        <script src="https://manifoldxyz.dev" defer />
        <link rel="stylesheet" href="https://manifoldxyz.dev" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
