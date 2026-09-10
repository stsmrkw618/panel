"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

// ISBN（EAN-13, 978/979始まり）をカメラから読み取る。
export default function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (isbn: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | null = null;

    (async () => {
      try {
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (!result || doneRef.current) return;
            const text = result.getText().replace(/[^0-9Xx]/g, "");
            // 書籍JAN（ISBN）だけ拾う
            if (/^(978|979)\d{10}$/.test(text)) {
              doneRef.current = true;
              controls?.stop();
              onDetected(text);
            }
          },
        );
      } catch {
        setError(
          "カメラを起動できませんでした。権限とHTTPS接続をご確認ください。",
        );
      }
    })();

    return () => {
      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-vault/95">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="eyebrow eyebrow-bright">背表紙のISBNを映す</p>
        <button
          onClick={onClose}
          className="border border-brass-dim px-3 py-1 text-xs text-parchment/80"
        >
          やめる
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        {/* 読み取り枠のガイド */}
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 border-2 border-brass" />
      </div>

      {error ? (
        <p className="px-6 py-4 text-center text-sm text-[color:var(--color-seal)]">
          {error}
        </p>
      ) : (
        <p className="px-6 py-4 text-center text-sm text-parchment/70">
          枠の中にバーコードを収めてください。
        </p>
      )}
    </div>
  );
}
