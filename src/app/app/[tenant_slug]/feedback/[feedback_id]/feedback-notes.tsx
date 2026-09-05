"use client";
import { useState, useTransition } from "react";
import { StickyNote, Plus, Trash2, Lock, Loader2 } from "lucide-react";
import { addNote, deleteNote } from "./actions";
import { useRouter } from "next/navigation";

type Note = {
  id: string;
  authorName: string;
  note: string;
  createdAt: Date | number;
  userId: string | null;
};

export default function FeedbackNotes({
  feedbackId,
  notes,
  currentUserId,
}: {
  feedbackId: string;
  notes: Note[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(notes.length > 0);

  async function handleAdd() {
    if (!newNote.trim()) return;
    setAdding(true);
    try {
      await addNote(feedbackId, newNote.trim());
      setNewNote("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="font-semibold flex items-center gap-2 text-slate-900">
          <StickyNote className="w-4 h-4 text-amber-600" />
          Catatan Tim (Internal)
          <span className="text-xs text-slate-500 font-normal">
            <Lock className="w-3 h-3 inline" /> Tidak terlihat pelanggan
          </span>
        </h3>
        <span className="text-xs text-slate-500">
          {notes.length} catatan
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Add new */}
          <div className="bg-white rounded-lg p-3 border border-amber-200">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Catatan internal untuk tim. Misal: 'sudah telepon pelanggan di 08123..., follow up lagi besok'."
              className="w-full text-sm border-none outline-none resize-none bg-transparent placeholder:text-slate-400"
            />
            <div className="flex justify-between items-center pt-2 border-t border-amber-100">
              <span className="text-xs text-slate-400">
                {newNote.length}/500 · Hanya terlihat di dashboard
              </span>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newNote.trim() || adding}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                Tambah
              </button>
            </div>
          </div>

          {/* Existing notes */}
          {notes.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">
              Belum ada catatan internal.
            </p>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <NoteItem
                  key={n.id}
                  note={n}
                  canDelete={n.userId === currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NoteItem({ note, canDelete }: { note: Note; canDelete: boolean }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const ts = note.createdAt instanceof Date
    ? note.createdAt
    : new Date((note.createdAt as number) * 1000);

  async function handleDelete() {
    if (!confirm("Hapus catatan ini?")) return;
    setDeleting(true);
    try {
      await deleteNote(note.id);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white border border-amber-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
            {note.authorName[0]?.toUpperCase()}
          </div>
          <span className="text-xs font-medium text-slate-700">{note.authorName}</span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-400">
            {ts.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-slate-300 hover:text-red-500 transition disabled:opacity-50"
            title="Hapus catatan"
          >
            {deleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
          </button>
        )}
      </div>
      <p className="text-sm text-slate-800 whitespace-pre-wrap pl-8">{note.note}</p>
    </div>
  );
}
