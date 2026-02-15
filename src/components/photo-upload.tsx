import { useRef, useState } from "react";
import clsx from "clsx";

type Props = {
  currentUrl?: string | null;
  onSelect: (file: File | null) => void;
};

export function PhotoUpload({ currentUrl, onSelect }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    if (!file) {
      setPreview(null);
      onSelect(null);
      return;
    }
    if (!file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    onSelect(file);
  }

  const shown = preview ?? currentUrl;

  return (
    <div
      className={clsx(
        "relative rounded-lg border-2 border-dashed transition-colors cursor-pointer",
        "flex items-center justify-center overflow-hidden",
        "aspect-square max-w-60",
        dragging ? "border-brand bg-brand/5" : "border-border",
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0] ?? null);
      }}
    >
      {shown ? (
        <img
          src={shown}
          alt="Preview"
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-muted text-sm text-center px-4">
          Drop photo here or click to browse
        </span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {shown && (
        <button
          type="button"
          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-black/80"
          onClick={(e) => {
            e.stopPropagation();
            handleFile(null);
          }}
          aria-label="Remove photo"
        >
          &times;
        </button>
      )}
    </div>
  );
}
