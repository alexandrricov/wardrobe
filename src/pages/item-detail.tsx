import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase.ts";
import { updateItem, deleteItem } from "../firebase-db.ts";
import { categoryLabel } from "../categories.ts";
import type { ClosetItem, ClosetItemDB } from "../types.ts";
import { ItemForm } from "../components/item-form.tsx";
import { Button } from "../components/action.tsx";

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ClosetItemDB | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !id) return;
    return onSnapshot(doc(db, "users", uid, "items", id), (snap) => {
      if (snap.exists()) {
        setItem({ id: snap.id, ...snap.data() } as ClosetItemDB);
      } else {
        setItem(null);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="text-center text-muted py-8">Loading...</div>;
  if (!item) return <div className="text-center text-muted py-8">Item not found</div>;

  if (editing) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-sm text-muted hover:text-canvas-text mb-4"
        >
          &larr; Cancel editing
        </button>
        <ItemForm
          defaultValues={item}
          submitLabel="Save Changes"
          onSubmit={async (data: ClosetItem, photoFile) => {
            await updateItem(item.id, data, photoFile);
            setEditing(false);
          }}
          onDelete={async () => {
            await deleteItem(item.id);
            navigate("/");
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="text-sm text-muted hover:text-canvas-text mb-4 inline-block">
        &larr; Back
      </Link>

      <div className="sm:flex gap-6">
        {/* Photo */}
        <div className="sm:w-64 shrink-0 mb-4 sm:mb-0">
          {item.photo ? (
            <img
              src={item.photo}
              alt={item.item}
              className="w-full aspect-square object-contain rounded-lg"
            />
          ) : (
            <div className="w-full aspect-square bg-border/30 rounded-lg flex items-center justify-center text-muted text-sm">
              no photo
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h1 className="text-h2 mb-1">{item.item}</h1>
          <p className="text-muted text-sm mb-4">
            {item.brand ?? "Unknown brand"}
          </p>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <Detail label="Category" value={categoryLabel(item.category)} />
            {item.subcategory && <Detail label="Subcategory" value={item.subcategory} />}
            <Detail label="Color" value={item.color.join(", ")} />
            <Detail label="Season" value={item.season.join(", ")} />
            <Detail label="Size" value={item.size ?? "—"} />
            <Detail label="Materials" value={item.materials.length ? item.materials.join(", ") : "—"} />
            <Detail label="SKU" value={item.sku ?? "—"} />
            {item.link && (
              <>
                <dt className="text-muted">Link</dt>
                <dd>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline truncate block"
                  >
                    {item.link}
                  </a>
                </dd>
              </>
            )}
          </dl>

          <Button
            variation="primary"
            size="medium"
            onClick={() => setEditing(true)}
            className="mt-6"
          >
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
