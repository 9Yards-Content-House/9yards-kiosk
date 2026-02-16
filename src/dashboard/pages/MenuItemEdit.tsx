import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Upload, Trash2, Image as ImageIcon, X, Plus, Copy } from "lucide-react";
import { useCategories } from "@shared/hooks/useMenu";
import { useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from "@shared/hooks/useMenuMutations";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Switch } from "@shared/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@shared/components/ui/alert-dialog";
import { toast } from "sonner";
import type { SaucePreparation, SauceSize, MenuItemType } from "@shared/types/menu";

export default function MenuItemEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const isNew = id === "new";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();
  const deleteMenuItem = useDeleteMenuItem();

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
    category_id: "",
    image_url: "",
    available: true,
    sort_order: 0,
    is_popular: false,
    is_new: false,
    item_type: "standalone" as MenuItemType,
    preparations: [] as SaucePreparation[],
    sizes: [] as SauceSize[],
  });

  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch existing item
  useEffect(() => {
    if (isNew || USE_MOCK_DATA) return;
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
            image_url: data.image_url || "",
            available: data.available,
            sort_order: data.sort_order,
            is_popular: data.is_popular || false,
            is_new: data.is_new || false,
            item_type: data.item_type || "standalone",
            preparations: data.preparations || [],
            sizes: data.sizes || [],
          });
          if (data.image_url) {
            setImagePreview(data.image_url);
          }
        }
      });
  }, [id, isNew]);

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload an image file (JPG, PNG, WebP, or GIF)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);

    try {
      if (USE_MOCK_DATA) {
        // For mock mode, create a local preview
        const url = URL.createObjectURL(file);
        setImagePreview(url);
        update("image_url", url);
        toast.success("Image preview ready (mock mode)");
        return;
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `menu/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        // If bucket doesn't exist, fall back to manual URL entry
        if (error.message.includes("bucket") || error.message.includes("not found")) {
          toast.error("Storage not configured. Please enter image URL manually or setup Supabase Storage.");
          return;
        }
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      setImagePreview(publicUrl);
      update("image_url", publicUrl);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image. You can enter the URL manually.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    update("image_url", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    // Validation
    if (!form.name.trim()) {
      toast.error("Please enter an item name");
      return;
    }
    if (!form.category_id) {
      toast.error("Please select a category");
      return;
    }
    if (form.item_type === 'combo_driver' && form.sizes.length === 0) {
      toast.error("Combo drivers (sauces) need at least one size with a price");
      return;
    }
    if (form.item_type === 'combo_driver' && form.sizes.some(s => !s.name.trim())) {
      toast.error("All sizes need a name");
      return;
    }
    if (form.item_type === 'standalone' && form.price <= 0) {
      toast.error("Standalone items need a price greater than 0");
      return;
    }

    try {
      const payload = {
        ...form,
        // Ensure combo components are always free
        price: form.item_type === 'combo_component' ? 0 : form.price,
        preparations: form.preparations.length > 0 ? form.preparations : null,
        sizes: form.sizes.length > 0 ? form.sizes : null,
      };

      if (isNew) {
        await createMenuItem.mutateAsync(payload);
      } else {
        await updateMenuItem.mutateAsync({ id: id!, ...payload });
      }
      toast.success(isNew ? "Item created" : "Item updated");
      navigate("/menu");
    } catch {
      toast.error("Failed to save item");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMenuItem.mutateAsync(id!);
      toast.success("Item deleted");
      navigate("/menu");
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const handleDuplicate = async () => {
    try {
      const duplicatePayload = {
        ...form,
        name: `${form.name} (Copy)`,
        preparations: form.preparations.length > 0 ? form.preparations : null,
        sizes: form.sizes.length > 0 ? form.sizes : null,
      };
      const result = await createMenuItem.mutateAsync(duplicatePayload);
      toast.success("Item duplicated");
      // Navigate to the new item
      if (result?.id) {
        navigate(`/menu/${result.id}`);
      } else {
        navigate("/menu");
      }
    } catch {
      toast.error("Failed to duplicate item");
    }
  };

  const isPending = createMenuItem.isPending || updateMenuItem.isPending;

  const update = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Preparation management
  const addPreparation = () => {
    setForm((prev) => ({
      ...prev,
      preparations: [...prev.preparations, { name: "", priceModifier: 0 }],
    }));
  };

  const updatePreparation = (index: number, field: keyof SaucePreparation, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      preparations: prev.preparations.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  const removePreparation = (index: number) => {
    setForm((prev) => ({
      ...prev,
      preparations: prev.preparations.filter((_, i) => i !== index),
    }));
  };

  // Size management
  const addSize = () => {
    setForm((prev) => ({
      ...prev,
      sizes: [...prev.sizes, { name: "", price: 0 }],
    }));
  };

  const updateSize = (index: number, field: keyof SauceSize, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  };

  const removeSize = (index: number) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index),
    }));
  };

  // Check if this is a combo driver item (shows preparations/sizes)
  const showPreparationsAndSizes = form.item_type === 'combo_driver';
  
  // Auto-suggest item_type based on category selection
  const handleCategoryChange = (categoryId: string) => {
    update("category_id", categoryId);
    const category = categories?.find(c => c.id === categoryId);
    if (category) {
      // Auto-suggest item_type based on category
      if (category.slug === 'sauces') {
        update("item_type", 'combo_driver');
      } else if (category.slug === 'main-dishes' || category.slug === 'side-dishes') {
        update("item_type", 'combo_component');
        update("price", 0); // Combo components are free
      } else {
        update("item_type", 'standalone');
      }
    }
  };

  // Handle item_type change with price auto-adjustment
  const handleItemTypeChange = (newType: MenuItemType) => {
    update("item_type", newType);
    if (newType === 'combo_component') {
      update("price", 0); // Combo components are always free
    }
    // Clear preparations/sizes if not a combo_driver
    if (newType !== 'combo_driver') {
      setForm(prev => ({ ...prev, preparations: [], sizes: [] }));
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/menu")}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">
            {isNew ? "Add Menu Item" : "Edit Menu Item"}
          </h1>
        </div>
        {!isNew && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={createMenuItem.isPending}>
              {createMenuItem.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Duplicate
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Menu Item?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{form.name}" from the menu. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border p-6 space-y-5">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Image</label>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative"
          >
            {imagePreview || form.image_url ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted">
                <img
                  src={imagePreview || form.image_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={() => setImagePreview(null)}
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white text-sm flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Change
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex flex-col items-center justify-center cursor-pointer bg-muted/30 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click or drag an image here</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP up to 5MB</p>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          {/* Manual URL fallback */}
          <div className="mt-2">
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Or enter image URL manually
              </summary>
              <Input
                value={form.image_url}
                onChange={(e) => {
                  update("image_url", e.target.value);
                  setImagePreview(e.target.value);
                }}
                placeholder="/images/menu/..."
                className="mt-2"
              />
            </details>
          </div>
        </div>

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
            <label className="block text-sm font-medium mb-1.5">
              Price (UGX)
              {form.item_type === 'combo_component' && (
                <span className="ml-2 text-xs font-normal text-green-600">
                  Free with combo
                </span>
              )}
            </label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => update("price", parseInt(e.target.value, 10) || 0)}
              min={0}
              disabled={form.item_type === 'combo_component'}
              className={form.item_type === 'combo_component' ? 'bg-muted' : ''}
            />
            {form.item_type === 'combo_component' && (
              <p className="text-xs text-muted-foreground mt-1">
                Combo components (main dishes, sides) are included free in combos
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="">Select category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Item type will be auto-suggested based on category
            </p>
          </div>
        </div>

        {/* Item Type */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Item Type</label>
          <select
            value={form.item_type}
            onChange={(e) => handleItemTypeChange(e.target.value as MenuItemType)}
            className="w-full h-10 px-3 rounded-md border bg-background text-sm"
          >
            <option value="standalone">Standalone - Sold separately (Lusaniya, Juices, Desserts)</option>
            <option value="combo_component">Combo Component - Free in combo (Main dishes, Side dishes)</option>
            <option value="combo_driver">Combo Driver - Sets combo price (Sauces with sizes)</option>
          </select>
          <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm">
            {form.item_type === 'combo_component' && (
              <div className="flex items-start gap-2">
                <span className="text-blue-500 text-lg">📦</span>
                <div>
                  <p className="font-medium text-blue-700">Combo Component</p>
                  <p className="text-muted-foreground text-xs">
                    Appears as a free selection in the combo builder. Examples: Matooke, White Rice, Cabbage, Avocado.
                    Price should be 0 as these are included free with any combo.
                  </p>
                </div>
              </div>
            )}
            {form.item_type === 'combo_driver' && (
              <div className="flex items-start gap-2">
                <span className="text-purple-500 text-lg">🍖</span>
                <div>
                  <p className="font-medium text-purple-700">Combo Driver (Sauce)</p>
                  <p className="text-muted-foreground text-xs">
                    The main protein/sauce that determines combo price. Customers choose size and preparation.
                    Add sizes (Regular, Half-Chicken, etc.) and preparations (Fried, Grilled, etc.) below.
                  </p>
                </div>
              </div>
            )}
            {form.item_type === 'standalone' && (
              <div className="flex items-start gap-2">
                <span className="text-green-500 text-lg">🥤</span>
                <div>
                  <p className="font-medium text-green-700">Standalone Item</p>
                  <p className="text-muted-foreground text-xs">
                    Sold independently, can also be added as extras in combo builder.
                    Examples: Ordinary Lusaniya, Passion Fruit Juice, Chapati, Samosa.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preparations (for combo drivers / sauces) */}
        {showPreparationsAndSizes && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Preparations (e.g. Fried, Grilled, Boiled)</label>
              <Button type="button" variant="outline" size="sm" onClick={addPreparation}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              How should this item be prepared? Leave empty if no preparation options.
            </p>
            <div className="space-y-2">
              {form.preparations.map((prep, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={prep.name}
                    onChange={(e) => updatePreparation(index, "name", e.target.value)}
                    placeholder="e.g. Fried, Grilled, Boiled"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePreparation(index)}
                    className="shrink-0 hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {form.preparations.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No preparations - customers won't be asked how they want it prepared</p>
              )}
            </div>
          </div>
        )}

        {/* Sizes (for combo drivers / sauces) */}
        {showPreparationsAndSizes && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Sizes & Prices</label>
              <Button type="button" variant="outline" size="sm" onClick={addSize}>
                <Plus className="w-4 h-4 mr-1" />
                Add Size
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Different portion sizes with their prices. The first size is the default shown in menus.
            </p>
            <div className="space-y-2">
              {form.sizes.map((size, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={size.name}
                    onChange={(e) => updateSize(index, "name", e.target.value)}
                    placeholder="e.g. Regular, Half-Chicken, Full"
                    className="flex-1"
                  />
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">UGX</span>
                    <Input
                      type="number"
                      value={size.price}
                      onChange={(e) => updateSize(index, "price", parseInt(e.target.value, 10) || 0)}
                      placeholder="Price"
                      className="pl-12"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSize(index)}
                    className="shrink-0 hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {form.sizes.length === 0 && (
                <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800 font-medium">⚠️ No sizes added</p>
                  <p className="text-xs text-amber-700">Combo drivers need at least one size. Add "Regular" as a starting point.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Sort Order</label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) => update("sort_order", parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.available}
                onCheckedChange={(v) => update("available", v)}
              />
              <label className="text-sm font-medium">Available</label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_popular}
                onCheckedChange={(v) => update("is_popular", v)}
              />
              <label className="text-sm font-medium">Mark as Popular</label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_new}
                onCheckedChange={(v) => update("is_new", v)}
              />
              <label className="text-sm font-medium">Mark as New</label>
            </div>
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
            onClick={handleSave}
            disabled={isPending || !form.name || !form.category_id}
            className="flex-1"
          >
            {isPending ? (
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
