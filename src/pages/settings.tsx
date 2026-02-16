import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase.ts";
import { useAuth } from "../providers/auth.tsx";
import {
  importFromJSON,
  exportToJSON,
  clearAllItems,
  saveAiApiKey,
  getAiApiKey,
} from "../firebase-db.ts";
import { Button } from "../components/action.tsx";
import { Input } from "../components/input.tsx";

export function Settings() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyMsg, setApiKeyMsg] = useState<string | null>(null);

  useEffect(() => {
    getAiApiKey().then((key) => {
      if (key) setApiKey(key);
      setApiKeyLoaded(true);
    });
  }, []);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);
    try {
      const count = await importFromJSON(file);
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
          className="text-sm text-red-600 hover:underline cursor-pointer"
        >
          Sign out
        </button>
      </div>

      {/* AI */}
      <div className="section">
        <h2 className="text-h3 mb-3">AI</h2>
        <p className="text-sm text-muted mb-3">
          OpenRouter API key for photo analysis.{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand underline"
          >
            Get a free key
          </a>
        </p>
        {apiKeyLoaded && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setApiKeySaving(true);
              setApiKeyMsg(null);
              try {
                await saveAiApiKey(apiKey.trim());
                setApiKeyMsg("Saved");
              } catch {
                setApiKeyMsg("Failed to save");
              } finally {
                setApiKeySaving(false);
              }
            }}
            className="flex gap-2 items-end"
          >
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
              className="flex-1"
            >
              API Key
            </Input>
            <Button
              type="submit"
              variation="primary"
              size="medium"
              disabled={apiKeySaving}
            >
              {apiKeySaving ? "Saving..." : "Save"}
            </Button>
          </form>
        )}
        {apiKeyMsg && (
          <p className="mt-2 text-sm text-muted" role="alert">
            {apiKeyMsg}
          </p>
        )}
      </div>

      {/* Import */}
      <div className="section">
        <h2 className="text-h3 mb-3">Import</h2>
        <p className="text-sm text-muted mb-3">
          Import items from a JSON file. Photos will need to be
          uploaded separately via the Edit page.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <div className="flex gap-3">
          <Button
            variation="primary"
            size="medium"
            onClick={() => fileRef.current?.click()}
            disabled={importing || clearing}
          >
            {importing ? "Importing..." : "Import JSON"}
          </Button>
          <button
            onClick={async () => {
              if (!confirm("Delete ALL items? This cannot be undone.")) return;
              setClearing(true);
              setMessage(null);
              try {
                const count = await clearAllItems();
                setMessage(`Cleared ${count} items.`);
              } catch (err) {
                setMessage(`Clear failed: ${err instanceof Error ? err.message : "Unknown error"}`);
              } finally {
                setClearing(false);
              }
            }}
            disabled={importing || clearing}
            className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {clearing ? "Clearing..." : "Clear all"}
          </button>
        </div>
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
          Download all data as JSON.
        </p>
        <Button
          variation="secondary"
          size="medium"
          onClick={exportToJSON}
        >
          Export Data
        </Button>
      </div>
    </div>
  );
}
