"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function QRScanner() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Loose type — qr-scanner is loaded lazily.
  const scannerRef = useRef<{ start: () => Promise<void>; stop: () => void; destroy: () => void } | null>(null);
  const router = useRouter();

  // Cleanup on close
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

      // Wait a tick so video element mounts.
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      if (!videoRef.current) {
        setError("Camera element not ready. Try again.");
        setBusy(false);
        setOpen(false);
        return;
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          handleResult(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: "environment",
          maxScansPerSecond: 5,
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
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

  function handleResult(text: string) {
    // Accept either a full URL or a /p/{slug} path.
    try {
      let pathname: string;
      if (text.startsWith("http://") || text.startsWith("https://")) {
        const url = new URL(text);
        pathname = url.pathname;
      } else if (text.startsWith("/")) {
        pathname = text;
      } else {
        // Treat as raw slug.
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
            {/* video element controlled by qr-scanner */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Frame guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-[#c9a56a] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            </div>
          </div>

          <div className="px-4 py-4 bg-black/80 backdrop-blur border-t border-white/10 text-center">
            {error ? (
              <div className="text-sm text-red-300">{error}</div>
            ) : (
              <div className="text-sm text-zinc-400">
                Point the camera at the QR on the ID card.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
