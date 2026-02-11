import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/lib/supabase";
import { useCategories } from "@shared/hooks/useMenu";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Switch } from "@shared/components/ui/switch";
import { toast } from "sonner";
import type { MenuItem } from "@shared/types/menu";

export default function MenuItemEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const isNew = id === "new";

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
    category_id: "",
    image_url: "",
    available: true,
    sort_order: 0,
  });

  // Fetch existing item
  useEffect(() => {
    if (isNew) return;
    supabase
      .from("menu_items")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            name: data.name,
            description: data.description,
            price: data.price,
            category_id: data.category_id,
            image_url: data.image_url,
            available: data.available,
            sort_order: data.sort_order,
          });
        }
      });
  }, [id, isNew]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        const { error } = await supabase.from("menu_items").insert(form);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("menu_items")
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      toast.success(isNew ? "Item created" : "Item updated");
      navigate("/menu");
    },
    onError: () => {
      toast.error("Failed to save item");
    },
  });

  const update = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/menu")}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">
          {isNew ? "Add Menu Item" : "Edit Menu Item"}
        </h1>
      </div>

      <div className="bg-card rounded-xl border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name</label>
          <Input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Item name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Short description"
            className="w-full h-24 p-3 border rounded-lg resize-none bg-background text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Price (UGX)</label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => update("price", parseInt(e.target.value, 10) || 0)}
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => update("category_id", e.target.value)}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="">Select category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Image URL</label>
          <Input
            value={form.image_url}
            onChange={(e) => update("image_url", e.target.value)}
            placeholder="/images/menu/..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Sort Order</label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) => update("sort_order", parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              checked={form.available}
              onCheckedChange={(v) => update("available", v)}
            />
            <label className="text-sm font-medium">Available</label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => navigate("/menu")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.name || !form.category_id}
            className="flex-1"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isNew ? "Create Item" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
