import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/lib/firebase";
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export default function AddExperienceModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  if (typeof document === "undefined" || !open) return null;

  const submit = async () => {
    if (!title.trim()) {
      toast({ title: "Missing title", description: "Please add a job title.", variant: "destructive" });
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      toast({ title: "Not signed in", description: "Please login first.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const db = getFirestore();
      const expId = crypto.randomUUID();
      // ✅ FIXED PATH: users/{uid}/profile/main/experience/{expId}
      const expRef = doc(collection(db, "users", uid, "profile", "main", "experience"), expId);
      await setDoc(expRef, {
        title: title.trim(),
        company: company.trim() || null,
        start: start.trim() || null,
        end: end.trim() || null,
        description: description.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Experience added", description: "Your experience entry has been saved." });
      onOpenChange(false);
      // clear fields
      setTitle("");
      setCompany("");
      setStart("");
      setEnd("");
      setDescription("");
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative w-[92%] max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Add Experience</h3>

          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Barista" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Company</label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Seaside Café" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start</label>
              <Input value={start} onChange={(e) => setStart(e.target.value)} placeholder="e.g. 2023-05" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End</label>
              <Input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="e.g. 2024-03 or Present" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a few lines about responsibilities or achievements…"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
