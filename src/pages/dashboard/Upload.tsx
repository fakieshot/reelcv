// src/pages/dashboard/Upload.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { UploadCloud, Video, Mic, Redo2, Download, Play } from "lucide-react";

import { useUploadReel } from "@/hooks/useUploadReel";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

/* ────────────────────────────────────────────────────────────── */
/* Utilities */
const MAX_SIZE_MB = 200;
const MAX_DURATION = 30;
type Visibility = "private" | "unlisted" | "public";

const isMobile =
  typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);

const secondsToMMSS = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
    2,
    "0"
  )}`;

/* ────────────────────────────────────────────────────────────── */
/* Fancy centered confirm modal (custom, not browser default) */

type ConfirmLeaveModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmLeaveModal({
  open,
  title = "Unsaved recording",
  message = "You have a recording that isn’t submitted yet. Leave this step anyway?",
  confirmText = "Leave anyway",
  cancelText = "Stay here",
  onConfirm,
  onCancel,
}: ConfirmLeaveModalProps) {
  if (typeof document === "undefined") return null;
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Card */}
      <div className="relative w-[92%] max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-amber-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 9v4m0 4h.01" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.34 2.87L1.82 18a2 2 0 001.73 3h16.9a2 2 0 001.73-3L13.66 2.87a2 2 0 00-3.32 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Upload Panel (όπως ήταν, με "Open file" διατηρημένο) */

function UploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const { state, progress, error, downloadURL, upload, cancel, reset } =
    useUploadReel(MAX_SIZE_MB, {
      onDone: () => {
        toast({
          title: "Upload complete",
          description: "Your video has been uploaded successfully.",
        });
      },
    });

  const onPick = () => inputRef.current?.click();

  const onFile = (file?: File) => {
    if (!file) return;
    reset();
    upload(file);
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    onFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    onFile(file);
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-2xl">Upload Video</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition ${
            dragActive ? "border-primary/60 bg-primary/5" : "border-muted"
          }`}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Video className="h-7 w-7 text-primary" />
          </div>

          <p className="mb-4 text-lg">Drag and drop a file here or</p>

          <Button onClick={onPick} disabled={state === "running"}>
            Choose File
          </Button>

          <p className="mt-4 text-sm text-muted-foreground">
            MP4 or WebM (max {MAX_SIZE_MB} MB)
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={onInput}
          />
        </div>

        {state !== "idle" && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <UploadCloud className="h-4 w-4" />
                {state === "running" && "Uploading..."}
                {state === "success" && "Completed"}
                {state === "error" && "Failed"}
                {state === "canceled" && "Canceled"}
              </span>
              {state === "running" && <span>{progress}%</span>}
            </div>
            <Progress
              value={state === "running" ? progress : state === "success" ? 100 : 0}
            />
            <div className="flex gap-2">
              {state === "running" && (
                <Button variant="outline" onClick={cancel}>
                  Cancel
                </Button>
              )}
              {(state === "success" ||
                state === "error" ||
                state === "canceled") && (
                <Button variant="ghost" onClick={reset}>
                  Reset
                </Button>
              )}
              {downloadURL && (
                <a
                  className="ml-auto text-sm underline"
                  href={downloadURL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open file
                </a>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          Tip: Keep your ReelCV short (60–90s) and to the point — intro, skills, a
          quick example, and what you’re looking for.
        </p>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Recording Panel (countdown + softer beep + Cancel Upload) */

type RecordingPanelProps = {
  onDraftReady: (url: string) => void;
  onDraftCleared: () => void;
};

function RecordingPanel({ onDraftReady, onDraftCleared }: RecordingPanelProps) {
  const { toast } = useToast();
  const {
    state: uploadState,
    progress,
    upload,
    cancel: cancelUpload,   // <-- to cancel upload
    reset: resetUpload,
  } = useUploadReel(MAX_SIZE_MB, {
    onDone: () => {
      toast({
        title: "Submitted",
        description: "Your recording has been uploaded.",
      });
      onDraftCleared();
    },
  });

  const [state, setState] = useState<
    "idle" | "countdown" | "recording" | "stopped"
  >("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("Barista application - Seaside Café");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const ctdRef = useRef<number | null>(null);

  const canRecord = useMemo(
    () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
    []
  );

  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (ctdRef.current) window.clearInterval(ctdRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTracks = () => {
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
  };

  const ensureStream = async () => {
    if (mediaRef.current) return mediaRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: true,
    });
    mediaRef.current = stream;
    return stream;
  };

  // live preview while recording OR during countdown
  useEffect(() => {
    if (
      (state === "recording" || state === "countdown") &&
      videoRef.current &&
      mediaRef.current
    ) {
      const el = videoRef.current;
      el.srcObject = mediaRef.current;
      el.muted = true;
      // @ts-ignore
      el.playsInline = true;
      // @ts-ignore
      el.autoplay = true;
      el.play().catch(() => {});
    }
    if (state === "stopped" && videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [state]);

  // softer, cinematic-ish beep
  const beep = () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 660; // λίγο πιο μαλακό από 880
      gain.gain.value = 0.0;

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      // απαλή είσοδος/έξοδος (ADSR-ish)
      gain.gain.linearRampToValueAtTime(0.03, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.02, now + 0.10);
      gain.gain.linearRampToValueAtTime(0.0, now + 0.20);

      osc.start(now);
      osc.stop(now + 0.22);

      osc.onended = () => ctx.close();
    } catch {
      /* ignore */
    }
  };

  async function startRecording() {
    if (!canRecord) return;
    const stream = await ensureStream();

    // show live preview immediately
    if (videoRef.current) {
      const el = videoRef.current;
      el.srcObject = stream;
      el.muted = true;
      // @ts-ignore
      el.playsInline = true;
      // @ts-ignore
      el.autoplay = true;
      await el.play().catch(() => {});
    }

    // start countdown (not recorded)
    setCountdown(3);
    setState("countdown");
    beep();
    if (ctdRef.current) window.clearInterval(ctdRef.current);
    ctdRef.current = window.setInterval(() => {
      setCountdown((n) => {
        const next = (n ?? 1) - 1;
        if (next <= 0) {
          if (ctdRef.current) window.clearInterval(ctdRef.current);
          actuallyStartRecording(); // recorder starts AFTER countdown
          return null;
        }
        beep();
        return next;
      });
    }, 1000);
  }

  function actuallyStartRecording() {
    if (!mediaRef.current) return;

    setState("recording");
    setDuration(0);
    chunksRef.current = [];

    const mime =
      (window as any).MediaRecorder?.isTypeSupported?.("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : (window as any).MediaRecorder?.isTypeSupported?.("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";

    const rec = new (window as any).MediaRecorder(mediaRef.current, {
      mimeType: mime,
      videoBitsPerSecond: 4_000_000,
    });
    recorderRef.current = rec;

    rec.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      if (videoRef.current) videoRef.current.srcObject = null;

      const blob = new Blob(chunksRef.current, { type: mime });
      const url = URL.createObjectURL(blob);

      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });

      onDraftReady(url);

      setState("stopped");
      if (timerRef.current) window.clearInterval(timerRef.current);
      stopTracks();
    };

    rec.start(250);

    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setDuration((s) => {
        const next = s + 1;
        if (next >= MAX_DURATION) stopRecording();
        return next;
      });
    }, 1000);
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function redo() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCountdown(null);
    setDuration(0);
    setState("idle");
    resetUpload();
    onDraftCleared();
  }

  function downloadCopy() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `${title || "recording"}.webm`;
    a.click();
  }

  async function submitRecording() {
    if (!auth.currentUser) return;
    if (!previewUrl) return;

    const res = await fetch(previewUrl);
    const blob = await res.blob();
    const file = new File([blob], `${title || "recording"}.webm`, { type: blob.type });
    await upload(file);
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-2xl">Record</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: video surface */}
          <div className="rounded-xl border bg-black/5 overflow-hidden">
            <div className="relative aspect-[4/3] bg-black">
              {state === "recording" || state === "countdown" ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover ${
                      isMobile ? "[transform:scaleX(-1)]" : ""
                    }`}
                  />
                  {/* Cinematic countdown overlay */}
                  {state === "countdown" && countdown !== null && (
                    <div className="absolute inset-0 grid place-items-center bg-black/40">
                      <div className="relative flex items-center justify-center">
                        {/* soft glow ring */}
                        <div className="absolute h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                        {/* number card */}
                        <div className="relative rounded-2xl bg-white/90 px-12 py-8 shadow-2xl ring-1 ring-black/5">
                          <div className="text-center">
                            <div className="text-6xl font-extrabold text-gray-900 leading-none animate-pulse">
                              {countdown}
                            </div>
                            <div className="mt-2 text-sm text-gray-600 tracking-wide">
                              Get ready…
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : previewUrl ? (
                <video
                  key={previewUrl}
                  src={previewUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Mic className="w-8 h-8 opacity-70" />
                    <span>No recording yet</span>
                  </div>
                </div>
              )}

              {(state === "recording" || state === "countdown") && (
                <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none">
                  <div className="h-2 rounded bg-white/20 overflow-hidden">
                    <div
                      className="h-2 bg-red-500 transition-all"
                      style={{
                        width: `${
                          state === "recording"
                            ? (duration / MAX_DURATION) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-right text-xs text-white/90">
                    {state === "recording" ? secondsToMMSS(duration) : ""}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: controls / meta */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Barista application – Seaside Café"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Visibility</label>
              <Select
                value={visibility}
                onValueChange={(v: Visibility) => setVisibility(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Private" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {state === "idle" && (
              <div className="flex gap-3">
                <Button onClick={startRecording} className="flex-1">
                  <Play className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              </div>
            )}

            {state === "countdown" && (
              <div className="flex gap-3">
                <Button disabled className="flex-1" variant="secondary">
                  Preparing…
                </Button>
              </div>
            )}

            {state === "recording" && (
              <div className="flex gap-3">
                <Button onClick={stopRecording} variant="secondary" className="flex-1">
                  Stop
                </Button>
              </div>
            )}

            {state === "stopped" && (
              <div className="flex flex-wrap gap-3 items-center w-full">
                <Button variant="outline" onClick={redo}>
                  <Redo2 className="w-4 h-4 mr-2" />
                  Redo Recording
                </Button>
                <Button variant="outline" onClick={downloadCopy}>
                  <Download className="w-4 h-4 mr-2" />
                  Download copy
                </Button>
                <Button
                  onClick={submitRecording}
                  className="ml-auto"
                  disabled={uploadState === "running"}
                >
                  Submit
                </Button>

                {/* Progress + Cancel Upload */}
                {uploadState !== "idle" && (
                  <div className="mt-4 w-full">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>
                        {uploadState === "running" && "Uploading..."}
                        {uploadState === "success" && "Completed"}
                        {uploadState === "error" && "Failed"}
                        {uploadState === "canceled" && "Canceled"}
                      </span>
                      {uploadState === "running" && <span>{progress}%</span>}
                    </div>
                    <Progress
                      value={
                        uploadState === "running" ? progress : uploadState === "success" ? 100 : 0
                      }
                    />
                    {uploadState === "running" && (
                      <div className="mt-2 flex justify-end">
                        <Button variant="outline" size="sm" onClick={cancelUpload}>
                          Cancel Upload
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Tip: Aim for 30 seconds. Say your name, what role you’re applying for, and
          2–3 quick reasons why you’re a great fit.
        </p>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Page (tabs + custom leave modal) */

export default function UploadCenter() {
  const [tab, setTab] = useState<"upload" | "record">("upload");

  // draft state
  const [hasDraft, setHasDraft] = useState(false);
  const [draftUrl, setDraftUrl] = useState<string | null>(null);

  // modal controls
  const [modalOpen, setModalOpen] = useState(false);
  const nextTabRef = useRef<"upload" | "record">("upload");

  // Only warn when LEAVING the "record" tab with a draft.
  const requestTabChange = (value: string) => {
    const next = (value as "upload" | "record") ?? "upload";

    if (next === tab) return;

    // Always allow entering "record" without warning
    if (next === "record") {
      setTab(next);
      return;
    }

    // If leaving "record" AND there's a draft, show custom modal
    if (tab === "record" && hasDraft) {
      nextTabRef.current = next;
      setModalOpen(true);
      return;
    }

    // Otherwise just change tab
    setTab(next);
  };

  const confirmLeave = () => {
    setModalOpen(false);
    setTab(nextTabRef.current);
  };
  const cancelLeave = () => setModalOpen(false);

  // native beforeunload for refresh/close (cannot customize)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasDraft) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasDraft]);

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Upload Video</h1>
      </div>

      <Tabs value={tab} onValueChange={requestTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="record">Record</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <UploadPanel />
        </TabsContent>

        {/* forceMount: keep Record state alive */}
        <TabsContent value="record" forceMount>
          <RecordingPanel
            onDraftReady={(url) => {
              setHasDraft(true);
              setDraftUrl(url);
            }}
            onDraftCleared={() => {
              setHasDraft(false);
              if (draftUrl) {
                URL.revokeObjectURL(draftUrl);
                setDraftUrl(null);
              }
            }}
          />
        </TabsContent>
      </Tabs>

      <ConfirmLeaveModal
        open={modalOpen}
        title="Unsaved recording"
        message="You have a recording that isn’t submitted yet. Leave this step anyway?"
        confirmText="Leave anyway"
        cancelText="Stay here"
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
      />
    </div>
  );
}
