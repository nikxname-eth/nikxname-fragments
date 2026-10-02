import { useState } from 'react';
import type { ExploreWork } from '../config/catalog';
import { ArrangeWall } from './ArrangeWall';

function posterFromVideo(blobUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = blobUrl;
    let settled = false;
    const done = (url: string) => {
      if (settled) return;
      settled = true;
      v.removeAttribute('src');
      v.load();
      resolve(url);
    };
    const grab = () => {
      try {
        if (!v.videoWidth || !v.videoHeight) return false;
        const c = document.createElement('canvas');
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
        done(c.toDataURL('image/jpeg', 0.82));
        return true;
      } catch {
        return false;
      }
    };
    v.addEventListener('error', () => done(''), { once: true });
    v.addEventListener('seeked', () => {
      if (!grab()) done('');
    });
    const start = async () => {
      try {
        await v.play();
        v.pause();
      } catch {
        /* autoplay can fail off-DOM; seeking still often yields a frame */
      }
      try {
        v.currentTime = Math.min(0.08, Number.isFinite(v.duration) ? v.duration * 0.02 : 0.08);
      } catch {
        grab() || done('');
      }
    };
    v.addEventListener('loadeddata', () => void start(), { once: true });
    window.setTimeout(() => grab() || done(''), 8000);
  });
}

function isGifFile(file: File) {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name);
}

function isVideoFile(file: File) {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);
}

export function ReviewHang() {
  const [works, setWorks] = useState<ExploreWork[]>([]);
  const [hang, setHang] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const added: ExploreWork[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const video = isVideoFile(file);
      const gif = !video && isGifFile(file);
      const poster = video ? await posterFromVideo(url) : url;
      added.push({
        id: `review-${Date.now()}-${i}`,
        seriesId: 'one-of-ones',
        title: file.name.replace(/\.[^.]+$/, ''),
        kind: 'edition',
        coverUrl: poster || url,
        originCoverUrl: poster || url,
        mediaUrl: url,
        motionUrl: video || gif ? url : undefined,
        mediaType: video ? 'video' : 'image',
        nativeFps: video || gif ? 24 : undefined,
        sort: works.length + i,
        blurb: 'Studio review — not released.',
      });
    }
    setWorks((prev) => [...prev, ...added]);
  };

  return (
    <div className="ex-review">
      <p className="ex-atelier-meta">
        Hang unreleased work exactly as in the Atelier. Files stay on this machine until you mint.
        Drop one to three frames — Save encodes motion (GIF or video) to mp4, stills to jpeg.
      </p>
      <div className="ex-atelier-toolbar">
        <label className="ex-atelier-btn">
          Add media
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => void onFiles(e.target.files)}
          />
        </label>
        <button
          type="button"
          className="ex-atelier-btn is-save"
          disabled={!works.length}
          onClick={() => setHang(true)}
        >
          Hang in Atelier
        </button>
      </div>
      {works.length ? (
        <ul className="ex-review-list">
          {works.map((w) => (
            <li key={w.id}>{w.title}</li>
          ))}
        </ul>
      ) : (
        <p className="ex-atelier-meta">No review works yet.</p>
      )}
      {hang ? (
        <ArrangeWall
          key={works.map((w) => w.id).join('|')}
          works={works}
          seed={works}
          onClose={() => setHang(false)}
          closeLabel="Return to Review"
        />
      ) : null}
    </div>
  );
}
