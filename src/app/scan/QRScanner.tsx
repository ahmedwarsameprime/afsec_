"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type QrScannerClass = typeof import("qr-scanner").default;

export function QRScanner() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Loose type — qr-scanner is loaded lazily.
  const scannerRef = useRef<{
    start: () => Promise<void>;
    stop: () => void;
    destroy: () => void;
    setCamera?: (id: string) => Promise<void>;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  async function startCamera() {
    setError(null);
    setBusy(true);

    if (typeof window === "undefined") {
      setBusy(false);
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser doesn't support camera access.");
      setBusy(false);
      return;
    }

    setOpen(true);

    try {
      const { default: QrScanner } = await import("qr-scanner");

      await new Promise((r) => requestAnimationFrame(() => r(null)));

      if (!videoRef.current) {
        setError("Camera element not ready. Try again.");
        setBusy(false);
        setOpen(false);
        return;
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => handleResult(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: "environment",
          // Decode the whole frame, not just a centred square — printed QRs
          // on ID cards are often off-centre when the operator holds the
          // phone at arm's length.
          calculateScanRegion: (v: HTMLVideoElement) => {
            const w = v.videoWidth;
            const h = v.videoHeight;
            const min = Math.min(w, h);
            const size = Math.round(min * 0.85);
            return {
              x: Math.round((w - size) / 2),
              y: Math.round((h - size) / 2),
              width: size,
              height: size,
            };
          },
          // Faster polling helps catch frames where the QR comes into focus.
          maxScansPerSecond: 10,
          returnDetailedScanResult: true,
        }
      );

      scannerRef.current = scanner;
      await scanner.start();

      // Bump the resolution above the qr-scanner default for sharper edges.
      // Phones often have 4K rear cameras; using even 1280×720 from the
      // native stream improves printed-card detection noticeably.
      await applyHiResConstraints(videoRef.current);

      setBusy(false);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message.includes("Permission")
            ? "Camera permission was denied. Enable it in your browser settings."
            : err.message
          : "Could not start the camera."
      );
      setBusy(false);
      setOpen(false);
    }
  }

  async function applyHiResConstraints(video: HTMLVideoElement) {
    const stream = video.srcObject as MediaStream | null;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    // Request the highest resolution & continuous focus the device offers.
    // Wrapped in try/catch — devices that don't support a constraint just
    // ignore it.
    try {
      // Use applyConstraints rather than getSettings/getCapabilities loops —
      // it's faster and the browser picks the closest match.
      await track.applyConstraints({
        // Best-effort high resolution; browser caps at what the device offers.
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
        // Continuous autofocus — critical for small printed QRs.
        advanced: [
          { focusMode: "continuous" } as MediaTrackConstraintSet,
        ],
      });
    } catch {
      /* device doesn't support these constraints — ignore */
    }
  }

  async function decodeFromFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const { default: QrScanner } = (await import("qr-scanner")) as {
        default: QrScannerClass;
      };
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });
      handleResult(result.data);
    } catch (err) {
      console.error(err);
      setError(
        "Couldn't read a QR code from that image. Try again with the QR more centred and in focus."
      );
    } finally {
      setBusy(false);
    }
  }

  function handleResult(text: string) {
    try {
      let pathname: string;
      if (text.startsWith("http://") || text.startsWith("https://")) {
        const url = new URL(text);
        pathname = url.pathname;
      } else if (text.startsWith("/")) {
        pathname = text;
      } else {
        pathname = `/p/${text}`;
      }

      const match = pathname.match(/^\/p\/([A-Za-z0-9_-]+)/);
      if (!match) {
        setError(
          "QR code is not a SOC-AFSEC credential. Make sure you're scanning a guard's ID card."
        );
        return;
      }
      const slug = match[1];

      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
      setOpen(false);

      router.push(`/p/${slug}`);
    } catch {
      setError("Could not read that QR code.");
    }
  }

  function close() {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setOpen(false);
    setError(null);
    setBusy(false);
  }

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={startCamera}
          disabled={busy}
          className="w-full bg-gradient-to-br from-[#c9a56a]/10 to-[#141414] border-2 border-[#c9a56a]/30 rounded-2xl p-6 text-center hover:border-[#c9a56a]/60 hover:from-[#c9a56a]/20 transition disabled:opacity-60"
        >
          <div className="text-5xl mb-3" aria-hidden>
            📷
          </div>
          <div className="text-lg font-bold mb-1">
            {busy ? "Opening camera…" : "Tap to scan a guard's QR"}
          </div>
          <div className="text-sm text-zinc-400">
            Allow camera access when prompted.
          </div>
        </button>

        {/* Fallback: take photo with native camera, then upload */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md border border-white/10 text-zinc-300 hover:bg-white/5 transition text-sm disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Or upload a photo of the QR
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) decodeFromFile(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      </div>

      {error && !open && (
        <div className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur border-b border-white/10">
            <div className="text-sm font-medium text-white">Scan ID Card</div>
            <button
              type="button"
              onClick={close}
              aria-label="Close scanner"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md text-zinc-300 hover:bg-white/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="flex-1 relative bg-black overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-[#c9a56a] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            </div>
          </div>

          <div className="px-4 py-4 bg-black/80 backdrop-blur border-t border-white/10 space-y-3">
            {error ? (
              <div className="text-sm text-red-300 text-center">{error}</div>
            ) : (
              <div className="text-sm text-zinc-400 text-center">
                Hold the card 10–20 cm away. The QR should fill the gold frame.
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border border-white/15 text-zinc-200 hover:bg-white/5 text-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Trouble scanning? Take a photo instead
            </button>
          </div>
        </div>
      )}
    </>
  );
}
