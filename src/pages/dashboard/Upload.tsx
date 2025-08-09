// src/pages/dashboard/Upload.tsx
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, Video } from "lucide-react";
import { useUploadReel } from "@/hooks/useUploadReel";

const MAX_SIZE_MB = 200;

export default function UploadCenter() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const { state, progress, error, downloadURL, upload, cancel, reset } =
    useUploadReel(MAX_SIZE_MB);

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
    <div className="max-w-3xl">
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

            <p className="mb-4 text-lg">
              Drag and drop a file here or
            </p>

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

          {/* progress */}
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
              <Progress value={state === "running" ? progress : state === "success" ? 100 : 0} />
              <div className="flex gap-2">
                {state === "running" && (
                  <Button variant="outline" onClick={cancel}>
                    Cancel
                  </Button>
                )}
                {(state === "success" || state === "error" || state === "canceled") && (
                  <Button variant="ghost" onClick={reset}>
                    Reset
                  </Button>
                )}
                {downloadURL && (
                  <a className="ml-auto text-sm underline" href={downloadURL} target="_blank" rel="noreferrer">
                    Open file
                  </a>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}

          {/* tip */}
          <p className="mt-8 text-sm text-muted-foreground">
            Tip: Keep your ReelCV short (60–90s) and to the point — intro, skills, a quick example, and what you’re looking for.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
