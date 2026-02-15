import { useNavigate } from "react-router";
import { createItem } from "../firebase-db.ts";
import type { WardrobeItem } from "../types.ts";
import { ItemForm } from "../components/item-form.tsx";

export function AddItem() {
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="text-h2 mb-4">Add Item</h1>
      <ItemForm
        submitLabel="Add Item"
        onSubmit={async (data: WardrobeItem, photoFile) => {
          const id = await createItem(data, photoFile);
          navigate(`/item/${id}`);
        }}
      />
    </div>
  );
}
