import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SITE_AUDIO_URL, SITE_AUDIO_VOLUME } from '../config/artist';

const STORAGE_KEY = 'nikxart-sound-on';

function readSoundPref(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored === '1';
  } catch {
    return true;
  }
}

function writeSoundPref(on: boolean): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* private mode */
  }
}

type SiteAudioContextValue = {
  soundOn: boolean;
  toggleSound: () => void;
  /** Begin ambient audio after banner load (respects an explicit mute this session). */
  startSoundOnLanding: () => void;
  /** Mute master audio while a fragment is being viewed (gallery or share preview). */
  setMasterSuppressed: (source: string, suppressed: boolean) => void;
};

const SiteAudioContext = createContext<SiteAudioContextValue | null>(null);

export function SiteAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const suppressSources = useRef(new Set<string>());
  const [soundOn, setSoundOn] = useState(true);
  const [masterSuppressed, setMasterSuppressedState] = useState(false);
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

    if (soundOn && !masterSuppressed) {
      audio.play().catch(() => {
        /* autoplay blocked until user toggles sound */
      });
    } else {
      audio.pause();
      if (!soundOn) audio.currentTime = 0;
    }
  }, [soundOn, masterSuppressed, ready]);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      writeSoundPref(next);
      return next;
    });
  }, []);

  const startSoundOnLanding = useCallback(() => {
    if (!readSoundPref()) return;

    setSoundOn(true);
    writeSoundPref(true);
    audioRef.current?.play().catch(() => {
      /* autoplay blocked until the visitor interacts */
    });
  }, []);

  const setMasterSuppressed = useCallback((source: string, suppressed: boolean) => {
    if (suppressed) suppressSources.current.add(source);
    else suppressSources.current.delete(source);
    setMasterSuppressedState(suppressSources.current.size > 0);
  }, []);

  return (
    <SiteAudioContext.Provider
      value={{ soundOn, toggleSound, startSoundOnLanding, setMasterSuppressed }}
    >
      {children}
    </SiteAudioContext.Provider>
  );
}

export function useSiteAudio(): SiteAudioContextValue {
  const ctx = useContext(SiteAudioContext);
  if (!ctx) {
    throw new Error('useSiteAudio must be used within SiteAudioProvider');
  }
  return ctx;
}