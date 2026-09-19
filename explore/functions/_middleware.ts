/**
 * Collection hosts (afamiliarburn.nikxart.xyz, …) serve the same Pages
 * project. Rewrite `/` and `/slug` onto `/a-familiar-burn/…`.
 */

const HOST_TO_SERIES: Record<string, string> = {
  'afamiliarburn.nikxart.xyz': 'a-familiar-burn',
  'thevoid.nikxart.xyz': 'the-void',
  'lifeimpressions.nikxart.xyz': 'life-impressions',
  'forher.nikxart.xyz': 'for-her',
  'foryou.nikxart.xyz': 'for-you',
  'oneofones.nikxart.xyz': 'one-of-ones',
};

export const onRequest = async (context: {
  request: Request;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
}): Promise<Response> => {
  const url = new URL(context.request.url);
  const host = url.hostname.replace(/^www\./, '');
  const series = HOST_TO_SERIES[host];
  if (!series) return context.next();

  const path = url.pathname;
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/') ||
    path.startsWith('/garden') ||
    path.startsWith('/atelier') ||
    path.startsWith('/market') ||
    path.startsWith('/looking') ||
    /\.[a-z0-9]+$/i.test(path)
  ) {
    return context.next();
  }

  const rest = path === '/' ? '' : path;
  if (path === `/${series}` || path.startsWith(`/${series}/`)) {
    return context.next();
  }

  url.pathname = `/${series}${rest}`;
  return context.next(new Request(url.toString(), context.request));
};
