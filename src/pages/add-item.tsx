import { useNavigate } from "react-router";
import { createItem } from "../firebase-db.ts";
import type { ClosetItem } from "../types.ts";
import { ItemForm } from "../components/item-form.tsx";

export function AddItem() {
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="text-h2 mb-4">Add Item</h1>
      <ItemForm
        submitLabel="Add Item"
        onSubmit={async (data: ClosetItem, photoFile) => {
          const id = await createItem(data, photoFile);
          navigate(`/item/${id}`);
        }}
      />
    </div>
  );
}
