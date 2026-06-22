import { Html, Head, Main, NextScript } from 'next/document';

const META = {
  title: 'Together It Blooms — Nikxname',
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

        {/* Favicon — served statically from the export (public/favicon.svg) */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {/* PNG fallbacks (apple-touch-icon.png etc.) can be added to public/ later if desired */}

        {/* CDN + fonts */}
        <link rel="preconnect" href="https://assets.nikxart.xyz" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://assets.nikxart.xyz" />
        <link rel="preconnect" href="https://connect.manifoldxyz.dev" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://claims.manifoldxyz.dev" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://relay.walletconnect.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://relay.walletconnect.org" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap"
          rel="stylesheet"
        />

      </Head>
      <body>
        <Main />
        <NextScript />

        {/* 
          GATE SAFETY NET — vanilla JS so the "Enter" experience can NEVER be stuck.
          This runs as soon as the HTML + this tiny script parses (long before React + framer-motion bundle).
          It makes the artistic intro button instantly tappable/keyboard accessible.
          React will detect the sessionStorage / body class / custom event and fast-forward gracefully.
        */}
        <script id="gate-safety" dangerouslySetInnerHTML={{
          __html: `
(function(){
  var ENTER_KEY = 'nikxart-entered';
  function markEntered() {
    try { sessionStorage.setItem(ENTER_KEY, '1'); } catch(e){}
    try { document.documentElement.setAttribute('data-entered','1'); } catch(e){}
    document.body.classList.add('site-entered');
  }
  function removeIntro() {
    var intro = document.querySelector('.intro');
    if (!intro) return;
    intro.style.transition = 'opacity 700ms cubic-bezier(0.76,0,0.24,1)';
    intro.style.opacity = '0';
    setTimeout(function(){
      if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    }, 720);
  }
  function doEnter(ev) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    markEntered();
    removeIntro();
    // Notify React if it has already hydrated
    try { window.dispatchEvent(new CustomEvent('nikxart:entered')); } catch(e){}
    // Global escape hatch for console / future use
    try { window.__NIKX_ENTERED = true; } catch(e){}
  }
  // Event delegation (works even on the initial static HTML snapshot)
  document.addEventListener('click', function(e){
    var btn = e.target && e.target.closest && e.target.closest('.pz-btn, [data-enter-gate]');
    if (btn) doEnter(e);
  }, true);
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var inIntro = !!document.querySelector('.intro');
    if (!inIntro) return;
    var btn = document.querySelector('.pz-btn');
    if (btn || e.target.closest('.intro')) {
      doEnter(e);
    }
  }, true);
  // Tap anywhere on the intro background as last-resort (with very subtle hint)
  document.addEventListener('click', function(e){
    var intro = document.querySelector('.intro');
    if (!intro) return;
    // Only if they didn't click the button itself (button handler runs first via capture)
    if (e.target.closest('.pz-btn')) return;
    // If click is inside the intro rings area, treat as enter (generous target)
    var rect = intro.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
      doEnter(e);
    }
  }, true);
  // URL bypass for testing, links, crawlers, or when JS partially fails: ?enter or #enter
  try {
    if (location.search.indexOf('enter') !== -1 || location.hash.indexOf('enter') !== -1) {
      setTimeout(doEnter, 60);
    }
  } catch(e){}
  // Expose for support / manual recovery
  window.NIKX_FORCE_ENTER = doEnter;
  // If the user already has the session flag from a previous visit in this tab/session, pre-remove the overlay fast
  try {
    if (sessionStorage.getItem(ENTER_KEY) === '1') {
      // Hide immediately to avoid flash of dead gate
      var intro = document.querySelector('.intro');
      if (intro) { intro.style.opacity = '0'; intro.style.transition = 'none'; }
      setTimeout(function(){ removeIntro(); markEntered(); }, 30);
    }
  } catch(e){}
})();
          `
        }} />
      </body>
    </Html>
  );
}
