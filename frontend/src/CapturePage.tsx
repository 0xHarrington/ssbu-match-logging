// CapturePage — hands-free auto-logging capture (plans/010 V0).
//
// Prop the phone against the TV and hit Start. The page samples the rear
// camera ~2x/s, downscales each frame to a 32x18 luminance grid, and fires a
// keyframe upload when it sees a scene change followed by ~2s of stability —
// which is exactly what the stage-select and results screens look like, and
// what gameplay (constant motion) never looks like. The backend classifies
// each keyframe with Haiku vision and assembles pending matches; they come
// back through the pending poll as confirm cards. Nothing is written to the
// CSV until a human taps Confirm.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  confirmVisionPending,
  discardVisionPending,
  getCharacters,
  getVisionPending,
  postVisionKeyframe,
  ApiError,
} from './lib/api';
import { ACTIVE_STAGES } from './lib/stages';
import { StageGrid, StocksPicker, WinnerPicker } from './session/components/formControls';
import CharacterPicker from './session/components/CharacterPicker';
import { PLAYER_HEX } from './session/palette';
import type { Player, VisionPendingMatch } from './types';

// Detector tuning (see plans/010; revisit after the first live session).
const SAMPLE_MS = 500;
const GRID_W = 32;
const GRID_H = 18;
const SPIKE_THRESHOLD = 18; // mean abs luminance diff that reads as a scene cut
const STABLE_THRESHOLD = 5; // below this the screen counts as static
const STABLE_MS = 2000; // how long it must stay static before we upload
const RESEND_MIN_DIFF = 6; // don't re-upload a near-identical screen
const UPLOAD_MAX_EDGE = 1280;
const RETRY_QUEUE_MAX = 20;
const PENDING_POLL_MS = 3000;

type MattSide = 'left' | 'right';

const REVIEW_LABELS: Record<string, string> = {
  left_character: 'fighters',
  right_character: 'fighters',
  stage: 'stage',
  stocksRemaining: 'stocks',
};

function meanAbsDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

export default function CapturePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const uploadCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Detector state lives in refs — it mutates every 500ms and must not rerender.
  const prevGridRef = useRef<Uint8ClampedArray | null>(null);
  const lastSentGridRef = useRef<Uint8ClampedArray | null>(null);
  const armedRef = useRef(false);
  const stableSinceRef = useRef<number | null>(null);
  const inFlightRef = useRef(0);
  const retryQueueRef = useRef<Blob[]>([]);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const captureSessionIdRef = useRef(
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `cap-${Date.now()}`,
  );

  const [running, setRunning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null); // budget hit / not configured
  const [lastScreen, setLastScreen] = useState<string | null>(null);
  const [callsToday, setCallsToday] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<VisionPendingMatch[]>([]);
  const [characters, setCharacters] = useState<string[]>([]);
  const [mattSide, setMattSide] = useState<MattSide>(
    () => (localStorage.getItem('capture.mattSide') as MattSide) || 'left',
  );

  const mattSideRef = useRef(mattSide);
  mattSideRef.current = mattSide;

  useEffect(() => {
    localStorage.setItem('capture.mattSide', mattSide);
  }, [mattSide]);

  // Roster for the confirm card's character pickers.
  useEffect(() => {
    getCharacters()
      .then((r) => setCharacters(r.all_characters))
      .catch(() => setCharacters([]));
  }, []);

  const refreshPending = useCallback(() => {
    getVisionPending()
      .then(setPending)
      .catch(() => {
        /* poll failures are transient; keep the last list */
      });
  }, []);

  // Confirm cards should surface even if capture isn't running on this device.
  useEffect(() => {
    refreshPending();
    const t = setInterval(refreshPending, PENDING_POLL_MS);
    return () => clearInterval(t);
  }, [refreshPending]);

  const uploadKeyframe = useCallback(
    async (blob: Blob) => {
      inFlightRef.current += 1;
      setUploading(true);
      try {
        const res = await postVisionKeyframe(blob, {
          captureSessionId: captureSessionIdRef.current,
          mattSide: mattSideRef.current,
        });
        setLastScreen(res.screenType);
        setCallsToday(res.callsToday);
        if (res.pendingCount > 0) refreshPending();
        // A successful call is the moment to drain one queued retry.
        const queued = retryQueueRef.current.shift();
        if (queued) void uploadKeyframe(queued);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 429 || err.status === 503)) {
          setFatal(err.message);
          setRunning(false);
        } else if (retryQueueRef.current.length < RETRY_QUEUE_MAX) {
          retryQueueRef.current.push(blob);
        }
      } finally {
        inFlightRef.current -= 1;
        setUploading(false);
      }
    },
    [refreshPending],
  );

  const captureAndUpload = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || inFlightRef.current > 2) return;
    const canvas =
      uploadCanvasRef.current ?? (uploadCanvasRef.current = document.createElement('canvas'));
    const scale = Math.min(1, UPLOAD_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) void uploadKeyframe(blob);
      },
      'image/jpeg',
      0.8,
    );
  }, [uploadKeyframe]);

  // The sampler: scene-change spike -> armed; then sustained stability fires.
  const sample = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || document.hidden) return;
    const canvas =
      gridCanvasRef.current ?? (gridCanvasRef.current = document.createElement('canvas'));
    canvas.width = GRID_W;
    canvas.height = GRID_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, GRID_W, GRID_H);
    const { data } = ctx.getImageData(0, 0, GRID_W, GRID_H);
    const grid = new Uint8ClampedArray(GRID_W * GRID_H);
    for (let i = 0; i < grid.length; i++) {
      const o = i * 4;
      grid[i] = (data[o] + data[o + 1] + data[o + 2]) / 3;
    }

    const prev = prevGridRef.current;
    prevGridRef.current = grid;
    if (!prev) return;

    const diff = meanAbsDiff(grid, prev);
    if (diff > SPIKE_THRESHOLD) {
      armedRef.current = true;
      stableSinceRef.current = null;
      return;
    }
    if (!armedRef.current) return;
    if (diff > STABLE_THRESHOLD) {
      stableSinceRef.current = null;
      return;
    }
    if (stableSinceRef.current === null) {
      stableSinceRef.current = Date.now();
      return;
    }
    if (Date.now() - stableSinceRef.current < STABLE_MS) return;

    armedRef.current = false;
    stableSinceRef.current = null;
    const lastSent = lastSentGridRef.current;
    if (lastSent && meanAbsDiff(grid, lastSent) < RESEND_MIN_DIFF) return;
    lastSentGridRef.current = grid;
    captureAndUpload();
  }, [captureAndUpload]);

  const acquireWakeLock = useCallback(async () => {
    try {
      const nav = navigator as WakeLockNavigator;
      wakeLockRef.current = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      /* unsupported or denied — the on-screen hint covers it */
    }
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
    void wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
    prevGridRef.current = null;
    armedRef.current = false;
    stableSinceRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setCameraError(null);
    setFatal(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      await acquireWakeLock();
      setRunning(true);
    } catch (err) {
      setCameraError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission denied — allow camera access and try again.'
          : 'Could not open the camera on this device.',
      );
    }
  }, [acquireWakeLock]);

  // Sampling loop while running.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(sample, SAMPLE_MS);
    return () => clearInterval(t);
  }, [running, sample]);

  // Reacquire the wake lock when the tab returns to the foreground.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && running && wakeLockRef.current === null) {
        void acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [running, acquireWakeLock]);

  // Stop the camera when leaving the page.
  useEffect(() => stop, [stop]);

  const active = pending[0] ?? null;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '18px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: running ? 'var(--aqua)' : 'var(--gray)',
            boxShadow: running ? '0 0 8px var(--aqua)' : undefined,
          }}
        />
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--fg-light)',
            fontFamily: 'var(--font-display)',
            margin: 0,
          }}
        >
          Auto Capture
        </h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginLeft: 'auto' }}>
          {callsToday !== null ? `${callsToday} calls today` : 'V0'}
        </span>
      </div>

      {/* Camera preview */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '16/9',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'var(--deep2)',
          border: '1px solid var(--line)',
          marginBottom: 12,
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: running ? 'block' : 'none' }}
        />
        {!running && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 8,
              color: 'var(--gray)',
              fontSize: 13,
              textAlign: 'center',
              padding: 20,
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, color: 'var(--aqua)' }}>
              ◉ CAMERA AUTO-LOG
            </div>
            Prop the phone so the TV fills the frame, then press Start. Keep the
            screen on — matches confirm right here.
          </div>
        )}
        {running && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '4%',
                right: '4%',
                height: 2,
                background: 'linear-gradient(90deg,transparent,#8ec07c,transparent)',
                animation: 'captureScan 2.2s ease-in-out infinite alternate',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                display: 'flex',
                gap: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fg)',
              }}
            >
              <span style={{ background: 'rgba(12,10,9,0.72)', borderRadius: 8, padding: '4px 8px' }}>
                {uploading ? 'reading…' : lastScreen ? `saw: ${lastScreen.replace('_', ' ')}` : 'scanning'}
              </span>
              {pending.length > 0 && (
                <span style={{ background: 'rgba(12,10,9,0.72)', borderRadius: 8, padding: '4px 8px', color: 'var(--aqua)' }}>
                  {pending.length} to confirm
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <button
          onClick={running ? stop : () => void start()}
          style={{
            flex: 1.6,
            background: running ? 'var(--card)' : 'var(--aqua)',
            border: running ? '1px solid var(--border-light)' : 'none',
            borderRadius: 14,
            padding: 14,
            color: running ? 'var(--fg)' : '#1b1817',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
          }}
        >
          {running ? 'Stop capture' : 'Start capture'}
        </button>
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            border: '1px solid var(--line)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {(['left', 'right'] as const).map((side) => (
            <button
              key={side}
              onClick={() => setMattSide(side)}
              title={`Matt plays on the ${side} side (P${side === 'left' ? 1 : 2})`}
              style={{
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                background: mattSide === side ? 'var(--matt)' : 'var(--card)',
                color: mattSide === side ? '#1b1817' : 'var(--gray)',
              }}
            >
              Matt {side}
            </button>
          ))}
        </div>
      </div>

      {(cameraError || fatal) && (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--red, #fb4934)',
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 13,
            color: 'var(--fg)',
            marginBottom: 12,
          }}
        >
          {cameraError ?? `${fatal} — you can still log matches manually.`}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.5 }}>
        Detection fires on static screens after a scene change — stage select
        and the results screen — so normal gameplay costs nothing. Each match
        pops a confirm card here; nothing is logged until you approve it.
      </div>

      {active && (
        <ConfirmCard
          key={active.id}
          item={active}
          characters={characters}
          onDone={refreshPending}
        />
      )}

      <style>{`@keyframes captureScan { 0%{ top:6%;} 100%{ top:92%;} }`}</style>
    </div>
  );
}

// --- Confirm card ---------------------------------------------------------

interface ConfirmCardProps {
  item: VisionPendingMatch;
  characters: string[];
  onDone: () => void;
}

function ConfirmCard({ item, characters, onDone }: ConfirmCardProps) {
  const [shayneChar, setShayneChar] = useState(item.shayneCharacter ?? '');
  const [mattChar, setMattChar] = useState(item.mattCharacter ?? '');
  const [winner, setWinner] = useState<Player | null>(item.winner);
  const [stocks, setStocks] = useState<number | null>(item.stocksRemaining);
  const [stage, setStage] = useState(item.stage ?? '');
  const [pickerFor, setPickerFor] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stages: string[] =
    item.stage && !ACTIVE_STAGES.includes(item.stage as (typeof ACTIVE_STAGES)[number])
      ? [item.stage, ...ACTIVE_STAGES]
      : [...ACTIVE_STAGES];

  const reviewHints = [...new Set(item.needsReview.map((k) => REVIEW_LABELS[k] ?? k))];
  const ready = Boolean(shayneChar && mattChar && winner && stocks && stage);

  const confirm = async () => {
    if (!ready || !winner || !stocks) return;
    setBusy(true);
    setError(null);
    try {
      await confirmVisionPending(item.id, {
        shayneCharacter: shayneChar,
        mattCharacter: mattChar,
        winner,
        stocksRemaining: stocks,
        stage,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log match');
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    setBusy(true);
    try {
      await discardVisionPending(item.id);
      onDone();
    } catch {
      onDone(); // already gone (TTL/another device) — refresh either way
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 180,
        background: 'rgba(12,10,9,0.82)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--panel)',
          border: '1px solid var(--border-light)',
          borderRadius: '28px 28px 0 0',
          padding: '20px 18px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--aqua)', boxShadow: '0 0 8px var(--aqua)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-light)', fontFamily: 'var(--font-display)' }}>
            Match detected
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
            {Math.round(item.confidence * 100)}% sure
          </span>
        </div>

        {item.frameUrl && (
          <img
            src={item.frameUrl}
            alt="Detected results screen"
            style={{
              width: '100%',
              borderRadius: 12,
              border: '1px solid var(--line)',
              marginBottom: 12,
              maxHeight: 160,
              objectFit: 'cover',
            }}
          />
        )}

        {reviewHints.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--yellow, #fabd2f)', marginBottom: 10 }}>
            Couldn't read: {reviewHints.join(', ')} — double-check below.
          </div>
        )}

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <WinnerPicker
            shayneChar={shayneChar}
            mattChar={mattChar}
            value={winner}
            onChange={setWinner}
            layout="row"
            onTokenClick={setPickerFor}
          />
          {pickerFor && (
            <CharacterPicker
              characters={characters}
              current={pickerFor === 'Matt' ? mattChar : shayneChar}
              accent={PLAYER_HEX[pickerFor]}
              onSelect={(c) => {
                (pickerFor === 'Matt' ? setMattChar : setShayneChar)(c);
                setPickerFor(null);
              }}
              onClose={() => setPickerFor(null)}
            />
          )}
        </div>

        <div style={{ fontSize: 11, color: 'var(--gray)', margin: '0 0 6px 2px', fontFamily: 'var(--font-mono)' }}>
          WINNER'S STOCKS LEFT
        </div>
        <div style={{ marginBottom: 12 }}>
          <StocksPicker value={stocks} onChange={setStocks} padY={10} />
        </div>

        <div style={{ fontSize: 11, color: 'var(--gray)', margin: '0 0 6px 2px', fontFamily: 'var(--font-mono)' }}>
          STAGE
        </div>
        <div style={{ marginBottom: 16 }}>
          <StageGrid stages={stages} value={stage} onChange={setStage} variant="chip" />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: 'var(--red, #fb4934)', marginBottom: 10 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => void discard()}
            disabled={busy}
            style={{
              flex: 1,
              background: 'var(--card)',
              border: '1px solid var(--border-light)',
              borderRadius: 14,
              padding: 14,
              color: 'var(--gray)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
            }}
          >
            Discard
          </button>
          <button
            onClick={() => void confirm()}
            disabled={!ready || busy}
            style={{
              flex: 1.6,
              background: ready ? 'var(--aqua)' : 'var(--card)',
              border: ready ? 'none' : '1px solid var(--line)',
              borderRadius: 14,
              padding: 14,
              color: ready ? '#1b1817' : 'var(--gray)',
              fontWeight: 700,
              fontSize: 14,
              cursor: ready ? 'pointer' : 'default',
              fontFamily: 'var(--font-display)',
            }}
          >
            {busy ? 'Logging…' : 'Confirm & log'}
          </button>
        </div>
      </div>
    </div>
  );
}
