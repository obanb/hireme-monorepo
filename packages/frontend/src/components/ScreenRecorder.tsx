'use client';

import { useState, useRef, useCallback } from 'react';

export default function ScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = useCallback(async () => {
    try {
      // 3-2-1 countdown
      for (let i = 3; i >= 1; i--) {
        setCountdown(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCountdown(null);

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' } as MediaTrackConstraints,
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hireme-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setElapsed(0);
      };

      // Stop if user clicks "Stop sharing" in browser
      stream.getVideoTracks()[0].onended = () => {
        if (recorderRef.current?.state === 'recording') {
          recorderRef.current.stop();
        }
        cleanup();
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch {
      setCountdown(null);
      setIsRecording(false);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    cleanup();
  }, [cleanup]);

  // Countdown overlay
  if (countdown !== null) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center">
        <div className="text-white text-9xl font-black animate-pulse">{countdown}</div>
      </div>
    );
  }

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={`fixed bottom-6 right-6 z-[9998] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all duration-200 ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/40'
          : 'bg-stone-900 hover:bg-stone-800 text-white shadow-stone-900/30'
      }`}
      title={isRecording ? 'Stop recording' : 'Start screen recording'}
    >
      {isRecording ? (
        <>
          <span className="w-3 h-3 rounded-sm bg-white animate-pulse" />
          <span className="font-mono text-sm font-semibold">{formatTime(elapsed)}</span>
          <span className="text-xs opacity-75">STOP</span>
        </>
      ) : (
        <>
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm font-semibold">REC</span>
        </>
      )}
    </button>
  );
}
