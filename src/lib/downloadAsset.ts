const DOWNLOAD_PROXY = '/api/download';

function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Same-origin proxy avoids CDN CORS limits on programmatic downloads. */
export async function downloadAsset(url: string, filename: string): Promise<void> {
  const proxyUrl = `${DOWNLOAD_PROXY}?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  saveBlob(blob, filename);
}