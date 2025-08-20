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
import { UploadCloud, Video, Mic, Redo2, Download, Play, Loader2, Save } from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useUploadReel } from "@/hooks/useUploadReel";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

/* ⬇️ ΝΕΑ imports για τον editor */
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getFirestore,
  collection,
  query as fsQuery,
  where,
  limit as fsLimit,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc, // ⬅️ ADDED: για να σβήνουμε placeholder doc στο discard
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

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

/* Helper: παίρνουμε το storage path από ένα Firebase downloadURL */
function storagePathFromDownloadURL(url: string): string | null {
  try {
    const u = new URL(url);
    // .../o/<ENCODED_PATH>?alt=media&token=...
    const idx = u.pathname.indexOf("/o/");
    if (idx === -1) return null;
    const enc = u.pathname.slice(idx + 3);
    const encodedPath = enc.split("?")[0];
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────────── */
/* Background Editor (modal + inline preview) */
/* ------------------------------------------------------------- */

type BackgroundStyle = "original" | "blur" | "black";

function BackgroundEditorModal({
  open,
  src,
  onClose,
  onDiscard, // ⬅️ ADDED: callback για να γίνει πλήρες reset στο UI μετά το discard
}: {
  open: boolean;
  src: string | null;
  onClose: () => void;
  onDiscard?: () => void; // ⬅️ ADDED
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [reelId, setReelId] = useState<string | null>(null);
  const [processingSrc, setProcessingSrc] = useState<string | null>(null);

  // Close confirm modal state
  const [closeOpen, setCloseOpen] = useState(false);

  useEffect(() => {
    let abort = false;
    async function load() {
      if (!open || !src || !auth.currentUser) return;
      setLoadingDoc(true);
      setReelId(null);
      setProcessingSrc(null);

      try {
        const uid = auth.currentUser.uid;
        const db = getFirestore();
        const reelsCol = collection(db, "users", uid, "reels");

        // 1) ψάξε με downloadURL == src
        let snap = await getDocs(
          fsQuery(reelsCol, where("downloadURL", "==", src), fsLimit(1))
        );
        // 2) αλλιώς με rawDownloadURL == src
        if (snap.empty) {
          snap = await getDocs(
            fsQuery(reelsCol, where("rawDownloadURL", "==", src), fsLimit(1))
          );
        }

        if (!abort && !snap.empty) {
          const d = snap.docs[0];
          const data = d.data() as any;
          setReelId(d.id);
          // Αν υπάρχει rawDownloadURL, δουλεύουμε ΠΑΝΤΑ πάνω σε αυτό.
          setProcessingSrc(data.rawDownloadURL ?? data.downloadURL ?? src);
        } else if (!abort) {
          // δεν βρέθηκε — επεξεργάσου όπως έχει
          setReelId(null);
          setProcessingSrc(src);
        }
      } catch (e) {
        console.error(e);
        if (!abort) {
          setReelId(null);
          setProcessingSrc(src);
        }
      } finally {
        if (!abort) setLoadingDoc(false);
      }
    }
    load();
    return () => {
      abort = true;
    };
  }, [open, src]);

  if (!open || !src || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setCloseOpen(true)}
      />
      <div className="relative w-[96%] max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <Card className="bg-transparent border-0 shadow-none">
          <CardHeader className="flex items-center justify-between p-0 pb-4">
            <CardTitle className="text-white/90">Preview & Background</CardTitle>
            <Button onClick={() => setCloseOpen(true)} className="gradient-primary text-white">
              Close
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingDoc || !processingSrc ? (
              <div className="h-[420px] grid place-items-center text-white/70">
                Loading…
              </div>
            ) : (
              <BackgroundStylePreviewInline
                src={processingSrc}
                defaultStyle="blur"
                onSave={async (blob, { style }) => {
                  try {
                    const uid = auth.currentUser!.uid;
                    const db = getFirestore();
                    const storage = getStorage();

                    const fileKey = reelId ?? `processed_${Date.now()}`;
                    const outRef = ref(
                      storage,
                      `users/${uid}/reels/processed/${fileKey}.webm`
                    );
                    await uploadBytes(outRef, blob, { contentType: "video/webm" });
                    const processedURL = await getDownloadURL(outRef);

                    if (reelId) {
                      await setDoc(
                        doc(db, "users", uid, "reels", reelId),
                        {
                          backgroundStyle: style,
                          rawDownloadURL: processingSrc,
                          downloadURL: processedURL,
                          processedDownloadURL: processedURL,
                          processedAt: serverTimestamp(),
                          status: "ready",
                        },
                        { merge: true }
                      );
                    }
                    // ✅ Success toast (μόνο στο Save)
                    toast({
                      title: "Saved!",
                      description: "Your ReelCV was updated successfully.",
                      duration: 3500,
                    });
                    onClose();
                    navigate("/dashboard/reelcv");
                  } catch (e: any) {
                    console.error(e);
                    toast({
                      title: "Failed",
                      description: e?.message ?? "Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Close confirm modal */}
      <ConfirmCloseModal
        open={closeOpen}
        onCancel={() => setCloseOpen(false)}
        onConfirm={async () => {
          try {
            // 1) Σβήνουμε file στο Storage (το raw upload)
            if (src) {
              const path = storagePathFromDownloadURL(src);
              if (path) {
                const storage = getStorage();
                await deleteObject(ref(storage, path)).catch(() => {});
              }
            }

            // 2) Σβήνουμε και το Firestore doc (το 0s placeholder)
            if (auth.currentUser) {
              const uid = auth.currentUser.uid;
              const db = getFirestore();
              const reelsCol = collection(db, "users", uid, "reels");

              if (reelId) {
                await deleteDoc(doc(db, "users", uid, "reels", reelId)).catch(() => {});
              } else if (src) {
                // fallback: βρες doc με downloadURL==src ή rawDownloadURL==src
                let snap = await getDocs(
                  fsQuery(reelsCol, where("downloadURL", "==", src), fsLimit(1))
                );
                if (snap.empty) {
                  snap = await getDocs(
                    fsQuery(reelsCol, where("rawDownloadURL", "==", src), fsLimit(1))
                  );
                }
                if (!snap.empty) {
                  await deleteDoc(doc(db, "users", uid, "reels", snap.docs[0].id)).catch(
                    () => {}
                  );
                }
              }
            }
          } finally {
            setCloseOpen(false);
            onClose();
            onDiscard?.(); // ⬅️ ενημέρωσε το parent να κάνει reset UI
          }
        }}
      />
    </div>,
    document.body
  );
}

/* Inline preview + render/record */
function BackgroundStylePreviewInline({
  src,
  onSave,
  defaultStyle = "blur",
  aspect = 16 / 9,
}: {
  src: string;
  onSave: (blob: Blob, opts: { style: "original" | "blur" | "black" }) => Promise<void> | void;
  defaultStyle?: "original" | "blur" | "black";
  aspect?: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [style, setStyle] = useState<"original" | "blur" | "black">(defaultStyle);
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Offscreen canvases
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const personCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const segRef = useRef<SelfieSegmentation | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  // Όταν αλλάζει στυλ, ξεκίνα playback απ’ την αρχή
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !ready) return;
    try {
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof (p as any).then === "function") (p as any).then(() => {}).catch(() => {});
    } catch {}
  }, [style, ready]);

  // Init video
  useEffect(() => {
    const v = videoRef.current!;
    const oncanplay = () => {
      setReady(true);
      v.play().catch(() => {});
    };
    v.addEventListener("canplay", oncanplay);
    v.src = src;
    v.crossOrigin = "anonymous";
    v.playsInline = true;
    v.muted = true;
    v.load();
    return () => {
      v.pause();
      v.removeEventListener("canplay", oncanplay);
    };
  }, [src]);

  // Init MediaPipe
  useEffect(() => {
    const seg = new SelfieSegmentation({
      locateFile: (f) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`,
    });
    seg.setOptions({ modelSelection: 1 });
    segRef.current = seg;
    return () => {
      // @ts-ignore
      seg.close?.();
      segRef.current = null;
    };
  }, []);

  // Render loop
  useEffect(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    const seg = segRef.current;
    if (!v || !c || !seg) return;

    const ctx = c.getContext("2d")!;

    const frameCanvas =
      frameCanvasRef.current ?? (frameCanvasRef.current = document.createElement("canvas"));
    const frameCtx = frameCanvas.getContext("2d")!;

    const personCanvas =
      personCanvasRef.current ?? (personCanvasRef.current = document.createElement("canvas"));
    const personCtx = personCanvas.getContext("2d")!;

    const bgCanvas =
      bgCanvasRef.current ?? (bgCanvasRef.current = document.createElement("canvas"));
    const bgCtx = bgCanvas.getContext("2d")!;

    const fit = () => {
      const w = v.videoWidth || 1280;
      const h = v.videoHeight || 720;
      const H = 720;
      const W = Math.round(H * aspect);
      c.width = W; c.height = H;
      frameCanvas.width = W; frameCanvas.height = H;
      personCanvas.width = W; personCanvas.height = H;
      bgCanvas.width = W; bgCanvas.height = H;

      const s = Math.min(W / w, H / h);
      const dw = Math.round(w * s);
      const dh = Math.round(h * s);
      const dx = Math.floor((W - dw) / 2);
      const dy = Math.floor((H - dh) / 2);
      return { W, H, dw, dh, dx, dy };
    };

    const dims = fit();

    seg.onResults((res: any) => {
      const hardMask: HTMLCanvasElement = res.segmentationMask;

      // soft mask (feather)
      const softMaskCanvas = document.createElement("canvas");
      softMaskCanvas.width = c.width;
      softMaskCanvas.height = c.height;
      const softMaskCtx = softMaskCanvas.getContext("2d")!;
      softMaskCtx.clearRect(0, 0, c.width, c.height);
      softMaskCtx.filter = "blur(6px)";
      softMaskCtx.drawImage(hardMask, 0, 0, c.width, c.height);
      softMaskCtx.filter = "none";

      // 1) frame
      frameCtx.clearRect(0, 0, dims.W, dims.H);
      frameCtx.drawImage(v, 0, 0, dims.W, dims.H);

      if (style === "original") {
        ctx.clearRect(0, 0, dims.W, dims.H);
        ctx.drawImage(frameCanvas, 0, 0, dims.W, dims.H);
        busyRef.current = false;
        return;
      }

      // 2) personCanvas = original * softMask
      personCtx.clearRect(0, 0, dims.W, dims.H);
      personCtx.drawImage(frameCanvas, 0, 0, dims.W, dims.H);
      personCtx.globalCompositeOperation = "destination-in";
      personCtx.drawImage(softMaskCanvas, 0, 0, dims.W, dims.H);
      personCtx.globalCompositeOperation = "source-over";

      if (style === "black") {
        ctx.clearRect(0, 0, dims.W, dims.H);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, dims.W, dims.H);
        ctx.drawImage(personCanvas, 0, 0, dims.W, dims.H);
        busyRef.current = false;
        return;
      }

      // 3) bgCanvas = (blurred original) * (1 - softMask)
      bgCtx.clearRect(0, 0, dims.W, dims.H);
      bgCtx.filter = "blur(16px)";
      bgCtx.drawImage(frameCanvas, 0, 0, dims.W, dims.H);
      bgCtx.filter = "none";
      bgCtx.globalCompositeOperation = "destination-out";
      bgCtx.drawImage(softMaskCanvas, 0, 0, dims.W, dims.H);
      bgCtx.globalCompositeOperation = "source-over";

      // 4) compose
      ctx.clearRect(0, 0, dims.W, dims.H);
      ctx.drawImage(bgCanvas, 0, 0, dims.W, dims.H);
      ctx.drawImage(personCanvas, 0, 0, dims.W, dims.H);
      busyRef.current = false;
    });

    let mounted = true;
    const tick = async () => {
      if (!mounted) return;
      if (!ready || busyRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      try {
        busyRef.current = true;
        await seg.send({ image: v });
      } catch (e) {
        console.warn("SelfieSegmentation send error:", e);
        busyRef.current = false;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    tick();
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, aspect, style]);

  // Export → canvas + audio
  const exportProcessed = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setProcessing(true);

    const v = videoRef.current;
    v.muted = false;

    const outStream = (canvasRef.current as HTMLCanvasElement).captureStream(30);
    const srcStream: MediaStream =
      (v as any).captureStream?.() || (v as any).mozCaptureStream?.() || new MediaStream();
    srcStream.getAudioTracks().forEach((t) => outStream.addTrack(t));

    const rec = new MediaRecorder(outStream, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 4_000_000,
    });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => e.data && chunks.push(e.data);
    const done = new Promise<Blob>((resolve) => (rec.onstop = () =>
      resolve(new Blob(chunks, { type: "video/webm" }))));

    v.currentTime = 0;
    await v.play().catch(() => {});
    rec.start(250);
    const onEnded = () => {
      rec.stop();
      v.removeEventListener("ended", onEnded);
    };
    v.addEventListener("ended", onEnded);

    const blob = await done;
    await onSave(blob, { style });
    setProcessing(false);
  };

  const handleSaveClick = () => {
    if (style === "original") {
      exportProcessed();
    } else {
      setConfirmOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: `${aspect}` }}>
        <video ref={videoRef} className="hidden" playsInline controls={false} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      <div className="mt-2">
        <RadioGroup value={style} onValueChange={(v: any) => setStyle(v)} className="grid grid-cols-3 gap-3">
          <div className="flex items-center space-x-2 rounded-lg border border-white/10 p-3">
            <RadioGroupItem value="original" id="bg-original" />
            <Label htmlFor="bg-original" className="text-white/80">Original</Label>
          </div>
          <div className="flex items-center space-x-2 rounded-lg border border-white/10 p-3">
            <RadioGroupItem value="blur" id="bg-blur" />
            <Label htmlFor="bg-blur" className="text-white/80">Blurred</Label>
          </div>
          <div className="flex items-center space-x-2 rounded-lg border border-white/10 p-3">
            <RadioGroupItem value="black" id="bg-black" />
            <Label htmlFor="bg-black" className="text-white/80">Solid Black</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex items-center justify-end">
        <Button onClick={handleSaveClick} disabled={processing}>
          {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {processing ? "Processing…" : "Save"}
        </Button>
      </div>

      {/* Confirm apply modal (μόνο για blur/black) */}
      <ApplyBackgroundModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          exportProcessed();
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Apply Background Confirm Modal */

function ApplyBackgroundModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative w-[92%] max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-violet-700" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8M3 7h6m-6 0v10a2 2 0 002 2h10" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Apply background?</h3>
          <p className="mt-2 text-sm text-gray-600">
            This will <strong>replace the current video</strong> with the processed version.
            If you want to change again later, record a new video or pick <em>Original</em> and Save.
          </p>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Close (discard) Confirm Modal */

function ConfirmCloseModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-[92%] max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-rose-700" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Discard this preview?</h3>
          <p className="mt-2 text-sm text-gray-600">
            If you close now, the uploaded video for this preview will be <strong>deleted</strong> and nothing will be saved.
          </p>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              Keep editing
            </button>
            <button
              onClick={onConfirm}
              className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              Discard & Delete
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

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
/* Upload Panel */

function UploadPanel({ onUploadDone }: { onUploadDone: (rawUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const { state, progress, error, downloadURL, upload, cancel, reset } =
    useUploadReel(MAX_SIZE_MB, {
      onDone: (info?: any) => {
        const url = info?.downloadURL ?? downloadURL;
        if (url) onUploadDone(url);
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

  // auto-open editor μόλις τελειώσει το upload
  useEffect(() => {
    if (state === "success" && downloadURL) {
      setTimeout(() => onUploadDone(downloadURL), 0);
    }
  }, [state, downloadURL, onUploadDone]);

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
/* Recording Panel */

type RecordingPanelProps = {
  onDraftReady: (url: string) => void;
  onDraftCleared: () => void;
  onUploadDone: (rawUrl: string) => void;
};

function RecordingPanel({ onDraftReady, onDraftCleared, onUploadDone }: RecordingPanelProps) {
  const { toast } = useToast();
  const {
    state: uploadState,
    progress,
    upload,
    cancel: cancelUpload,
    reset: resetUpload,
    downloadURL: recordedDownloadURL,
  } = useUploadReel(MAX_SIZE_MB, {
    onDone: (info?: any) => {
      const url = info?.downloadURL ?? recordedDownloadURL;
      if (url) onUploadDone(url);
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

  // auto-open editor μετά το submit του recording
  useEffect(() => {
    if (uploadState === "success" && recordedDownloadURL) {
      setTimeout(() => onUploadDone(recordedDownloadURL), 0);
    }
  }, [uploadState, recordedDownloadURL, onUploadDone]);

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

  // softer beep
  const beep = () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 660;
      gain.gain.value = 0.0;

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.linearRampToValueAtTime(0.03, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.02, now + 0.10);
      gain.gain.linearRampToValueAtTime(0.0, now + 0.20);

      osc.start(now);
      osc.stop(now + 0.22);

      osc.onended = () => ctx.close();
    } catch {}
  };

  async function startRecording() {
    if (!canRecord) return;
    const stream = await ensureStream();

    // live preview immediately
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

    // countdown (not recorded)
    setCountdown(3);
    setState("countdown");
    beep();
    if (ctdRef.current) window.clearInterval(ctdRef.current);
    ctdRef.current = window.setInterval(() => {
      setCountdown((n) => {
        const next = (n ?? 1) - 1;
        if (next <= 0) {
          if (ctdRef.current) window.clearInterval(ctdRef.current);
          actuallyStartRecording();
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
                  {/* countdown overlay */}
                  {state === "countdown" && countdown !== null && (
                    <div className="absolute inset-0 grid place-items-center bg-black/40">
                      <div className="relative flex items-center justify-center">
                        <div className="absolute h-40 w-40 rounded-full bg-white/10 blur-2xl" />
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
  const lastOpenedRef = useRef<string | null>(null);
  // draft state
  const [hasDraft, setHasDraft] = useState(false);
  const [draftUrl, setDraftUrl] = useState<string | null>(null);

  // modal controls
  const [modalOpen, setModalOpen] = useState(false);
  const nextTabRef = useRef<"upload" | "record">("upload");

  // Background editor state
  const [bgOpen, setBgOpen] = useState(false);
  const [bgSrc, setBgSrc] = useState<string | null>(null);

  // ⬅️ ADDED: nonce ώστε με discard να remount-άρουν Upload/Record panels (πλήρες reset UI)
  const [resetNonce, setResetNonce] = useState(0);

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

  const { toast } = useToast();
  const handleUploadDone = (rawUrl: string) => {
    if (!rawUrl) return;
    if (lastOpenedRef.current === rawUrl && bgOpen) return; // guard
    lastOpenedRef.current = rawUrl;
    setBgSrc(rawUrl);
    toast({ title: "Almost there", description: "Preview your background and click Apply to save." });
    setBgOpen(true); // ανοίγει αυτόματα ο editor
  };

  // όταν κλείνει το modal, καθάρισε refs για να μη ξανανοίξει
  const handleCloseEditor = () => {
    setBgOpen(false);
    setBgSrc(null);
    lastOpenedRef.current = null;
  };

  // ⬅️ ADDED: όταν γίνει discard, κλείσε modal, καθάρισε state, και κάνε reset UI panels
  const handleDiscard = () => {
    handleCloseEditor();
    setHasDraft(false);
    if (draftUrl) {
      URL.revokeObjectURL(draftUrl);
      setDraftUrl(null);
    }
    setResetNonce((n) => n + 1); // remount Upload/Record -> “αρχική οθόνη”
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="sr-only">Upload Video</h2>
      </div>

      <Tabs value={tab} onValueChange={requestTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="record">Record</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <UploadPanel key={`upload-${resetNonce}`} onUploadDone={handleUploadDone} />
        </TabsContent>

        {/* forceMount: keep Record state alive */}
        <TabsContent value="record" forceMount>
          <RecordingPanel
            key={`record-${resetNonce}`}
            onUploadDone={handleUploadDone}
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

      {/* Background editor modal */}
      <BackgroundEditorModal
        open={bgOpen}
        src={bgSrc}
        onClose={handleCloseEditor}
        onDiscard={handleDiscard} // ⬅️ ADDED: reset UI & καθαρισμός μετά από discard
      />
    </div>
  );
}
