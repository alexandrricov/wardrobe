import { useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase.ts";
import { useAuth } from "../providers/auth.tsx";
import { importFromWardrobeJSON, exportToJSON } from "../firebase-db.ts";

export function Settings() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);
    try {
      const count = await importFromWardrobeJSON(file);
      setMessage(`Imported ${count} items successfully.`);
    } catch (err) {
      setMessage(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-h2">Settings</h1>

      {/* Account */}
      <div className="section">
        <h2 className="text-h3 mb-3">Account</h2>
        <div className="flex items-center gap-3 mb-4">
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              className="w-10 h-10 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <div className="text-sm font-medium">{user?.displayName}</div>
            <div className="text-xs text-muted">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="text-sm text-red-600 hover:underline"
        >
          Sign out
        </button>
      </div>

      {/* Import */}
      <div className="section">
        <h2 className="text-h3 mb-3">Import</h2>
        <p className="text-sm text-muted mb-3">
          Import items from a wardrobe.json file. Photos will need to be
          uploaded separately via the Edit page.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="px-4 py-2 rounded-lg bg-brand text-on-accent font-medium text-sm hover:bg-brand-dark disabled:opacity-50 transition-colors"
        >
          {importing ? "Importing..." : "Import wardrobe.json"}
        </button>
        {message && (
          <p
            className="mt-3 text-sm"
            role="alert"
          >
            {message}
          </p>
        )}
      </div>

      {/* Export */}
      <div className="section">
        <h2 className="text-h3 mb-3">Export</h2>
        <p className="text-sm text-muted mb-3">
          Download all wardrobe data as JSON.
        </p>
        <button
          onClick={exportToJSON}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-canvas2 transition-colors"
        >
          Export Data
        </button>
      </div>
    </div>
  );
}
