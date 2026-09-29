/**
 * Host routing for the house Pages project:
 * - nikxart.xyz / www serve La Maison
 * - fragment.nikxart.xyz / → /fragment
 */

function isHomePath(pathname: string): boolean {
  return pathname === '/' || pathname === '/index.html' || pathname === '/index';
}

export const onRequest = async (context: {
  request: Request;
  next: () => Promise<Response>;
}): Promise<Response> => {
  const url = new URL(context.request.url);
  if (!isHomePath(url.pathname)) {
    return context.next();
  }

  const host = url.hostname.toLowerCase();
  if (host === 'fragment.nikxart.xyz' || host.startsWith('fragment.')) {
    url.pathname = '/fragment';
    return Response.redirect(url.toString(), 302);
  }

  return context.next();
};
