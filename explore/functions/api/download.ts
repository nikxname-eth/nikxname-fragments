function isAllowedHost(url: URL): boolean {
  if (url.pathname.includes('..')) return false;
  const host = url.hostname;
  if (url.origin === 'https://assets.nikxart.xyz') return true;
  if (host === 'arweave.net' || host.endsWith('.arweave.net')) return true;
  if (host === 'bits.raster.art') return true;
  return false;
}

export const onRequestGet = async (context: { request: Request }): Promise<Response> => {
  const requestUrl = new URL(context.request.url);
  const assetUrl = requestUrl.searchParams.get('url');
  const filename = requestUrl.searchParams.get('name') ?? 'artwork';

  if (!assetUrl) return new Response('Missing url', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(assetUrl);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }

  if (!isAllowedHost(parsed)) {
    return new Response('Forbidden', { status: 403 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok) {
    return new Response('Asset not found', { status: upstream.status });
  }

  const safeName = filename.replace(/[^\w.\-]+/g, '_');
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
