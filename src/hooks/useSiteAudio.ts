import { useCallback, useEffect, useRef, useState } from 'react';
import { SITE_AUDIO_URL, SITE_AUDIO_VOLUME } from '../config/artist';

const STORAGE_KEY = 'nikxart-sound-on';

function readSoundPref(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSoundPref(on: boolean): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* private mode */
  }
}

export function useSiteAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSoundOn(readSoundPref());
    const audio = new Audio(SITE_AUDIO_URL);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = SITE_AUDIO_VOLUME;
    audioRef.current = audio;
    setReady(true);

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !ready) return;

    if (soundOn) {
      audio.play().catch(() => {
        /* autoplay blocked until user toggles sound */
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [soundOn, ready]);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      writeSoundPref(next);
      return next;
    });
  }, []);

  return { soundOn, toggleSound };
}