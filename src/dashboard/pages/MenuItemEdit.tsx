import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Upload, Trash2, Image as ImageIcon, X, Plus, Copy } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import type { MenuItemType } from "@shared/types/menu";

// Define Validation Schema
const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  price: z.coerce.number().min(0, "Price must be positive"),
  category_id: z.string().min(1, "Category is required"),
  image_url: z.string().optional().default(""),
  available: z.boolean().default(true),
  sort_order: z.coerce.number().default(0),
  is_popular: z.boolean().default(false),
  is_new: z.boolean().default(false),
  item_type: z.enum(["standalone", "combo_component", "combo_driver"]).default("standalone"),
  preparations: z.array(z.object({
    name: z.string().min(1, "Preparation name is required"),
    priceModifier: z.coerce.number().default(0),
  })).optional().default([]),
  sizes: z.array(z.object({
    name: z.string().min(1, "Size name is required"),
    price: z.coerce.number().min(0, "Size price is required"),
  })).optional().default([]),
}).superRefine((data, ctx) => {
  // Validate Combo Driver Requirements
  if (data.item_type === 'combo_driver') {
    if (!data.sizes || data.sizes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Combo drivers (sauces) need at least one size with a price",
        path: ["sizes"],
      });
    }
  }
  // Validate Standalone Requirements
  if (data.item_type === 'standalone' && data.price <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Standalone items need a price greater than 0",
      path: ["price"],
    });
  }
});

type MenuItemFormValues = z.infer<typeof menuItemSchema>;

export default function MenuItemEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const isNew = id === "new";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();
  const deleteMenuItem = useDeleteMenuItem();

  const [uploading, setUploading] = useState(false);
  
  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      category_id: "",
      image_url: "",
      available: true,
      sort_order: 0,
      is_popular: false,
      is_new: false,
      item_type: "standalone",
      preparations: [],
      sizes: [],
    },
  });

  const { fields: preparationFields, append: appendPrep, remove: removePrep } = useFieldArray({
    control: form.control,
    name: "preparations",
  });

  const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({
    control: form.control,
    name: "sizes",
  });

  const watchedItemType = form.watch("item_type");
  const watchedImageUrl = form.watch("image_url");

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
          form.reset({
            name: data.name,
            description: data.description || "",
            price: data.price,
            category_id: data.category_id,
            image_url: data.image_url || "",
            available: data.available,
            sort_order: data.sort_order,
            is_popular: data.is_popular || false,
            is_new: data.is_new || false,
            item_type: (data.item_type as MenuItemType) || "standalone",
            preparations: data.preparations || [],
            sizes: data.sizes || [],
          });
        }
      });
  }, [id, isNew, form]);

  const onSubmit = async (data: MenuItemFormValues) => {
    try {
      const payload = {
        ...data,
        // Ensure combo components are always free (redundant safeguard)
        price: data.item_type === 'combo_component' ? 0 : data.price,
        // Sanitize arrays
        preparations: data.preparations && data.preparations.length > 0 ? data.preparations : null,
        sizes: data.sizes && data.sizes.length > 0 ? data.sizes : null,
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
      const currentValues = form.getValues();
      const duplicatePayload = {
        ...currentValues,
        name: `${currentValues.name} (Copy)`,
        preparations: currentValues.preparations?.length ? currentValues.preparations : null,
        sizes: currentValues.sizes?.length ? currentValues.sizes : null,
      };
      
      const result = await createMenuItem.mutateAsync(duplicatePayload);
      toast.success("Item duplicated");
      if (result?.id) navigate(`/menu/${result.id}`);
      else navigate("/menu");
    } catch {
      toast.error("Failed to duplicate item");
    }
  };

  // Logic Adapters
  const handleCategoryChange = (categoryId: string) => {
    form.setValue("category_id", categoryId);
    const category = categories?.find(c => c.id === categoryId);
    if (category) {
      if (category.slug === 'sauces') {
        form.setValue("item_type", 'combo_driver');
      } else if (category.slug === 'main-dishes' || category.slug === 'side-dishes') {
        form.setValue("item_type", 'combo_component');
        form.setValue("price", 0);
      } else {
        form.setValue("item_type", 'standalone');
      }
    }
  };

  const handleItemTypeChange = (newType: MenuItemType) => {
    form.setValue("item_type", newType);
    if (newType === 'combo_component') {
      form.setValue("price", 0);
    }
    if (newType !== 'combo_driver') {
      form.setValue("preparations", []);
      form.setValue("sizes", []);
    }
  };

  // Image Upload Logic
  const handleImageUpload = async (file: File) => {
    if (!file) return;
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
        const url = URL.createObjectURL(file);
        form.setValue("image_url", url);
        toast.success("Image preview ready (mock mode)");
        return;
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `menu/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from("images")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
      form.setValue("image_url", urlData.publicUrl);
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
    if (file) handleImageUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  const removeImage = () => {
    form.setValue("image_url", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isPending = createMenuItem.isPending || updateMenuItem.isPending || form.formState.isSubmitting;
  const showPreparationsAndSizes = watchedItemType === 'combo_driver';

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isNew ? "Add Menu Item" : "Edit Menu Item"}
          </h1>
        </div>
        {!isNew && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
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
                    This will permanently delete "{form.getValues("name")}" from the menu.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card rounded-xl border p-6 space-y-5">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Image</label>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative"
          >
            {watchedImageUrl ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted">
                <img
                  src={watchedImageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={() => form.setValue("image_url", "")}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
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
          <div className="mt-2 text-sm text-muted-foreground">
             <Input
               {...form.register("image_url")}
               placeholder="Or enter image URL manually"
               className="mt-2"
             />
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <Input {...form.register("name")} placeholder="Item name" />
            {form.formState.errors.name && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              {...form.register("description")}
              placeholder="Short description"
              className="w-full h-24 p-3 border rounded-lg resize-none bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium mb-1.5">Price (UGX)</label>
               <Input
                 type="number"
                 {...form.register("price")}
                 disabled={watchedItemType === 'combo_component'}
                 className={watchedItemType === 'combo_component' ? 'bg-muted' : ''}
               />
               {form.formState.errors.price && (
                 <p className="text-red-500 text-xs mt-1">{form.formState.errors.price.message}</p>
               )}
             </div>
             
             <div>
               <label className="block text-sm font-medium mb-1.5">Category</label>
               <select
                 {...form.register("category_id")}
                 onChange={(e) => handleCategoryChange(e.target.value)}
                 className="w-full h-10 px-3 rounded-md border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <option value="">Select category</option>
                 {categories?.map((cat) => (
                   <option key={cat.id} value={cat.id}>{cat.name}</option>
                 ))}
               </select>
               {form.formState.errors.category_id && (
                 <p className="text-red-500 text-xs mt-1">{form.formState.errors.category_id.message}</p>
               )}
             </div>
          </div>
        </div>

        {/* Item Type */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Item Type</label>
          <select
            {...form.register("item_type")}
            onChange={(e) => handleItemTypeChange(e.target.value as MenuItemType)}
            className="w-full h-10 px-3 rounded-md border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="standalone">Standalone</option>
            <option value="combo_component">Combo Component</option>
            <option value="combo_driver">Combo Driver (Sauce)</option>
          </select>
        </div>

        {/* Dynamic Fields */}
        {showPreparationsAndSizes && (
          <div className="space-y-6 border-t pt-4">
            {/* Preparations */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Preparations</label>
                <Button type="button" variant="outline" size="sm" onClick={() => appendPrep({ name: "", priceModifier: 0 })}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                 {preparationFields.map((field, index) => (
                   <div key={field.id} className="flex gap-2">
                     <Input {...form.register(`preparations.${index}.name` as const)} placeholder="Name (e.g. Fried)" />
                     <Button type="button" variant="ghost" size="icon" onClick={() => removePrep(index)}>
                       <X className="w-4 h-4" />
                     </Button>
                   </div>
                 ))}
                 {form.formState.errors.preparations && (
                    <p className="text-red-500 text-xs">{form.formState.errors.preparations.message}</p>
                 )}
              </div>
            </div>

            {/* Sizes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Sizes</label>
                <Button type="button" variant="outline" size="sm" onClick={() => appendSize({ name: "", price: 0 })}>
                  <Plus className="w-4 h-4 mr-1" /> Add Size
                </Button>
              </div>
              <div className="space-y-2">
                 {sizeFields.map((field, index) => (
                   <div key={field.id} className="flex gap-2">
                     <Input {...form.register(`sizes.${index}.name` as const)} placeholder="Size Name" />
                     <Input type="number" {...form.register(`sizes.${index}.price` as const)} placeholder="Price" />
                     <Button type="button" variant="ghost" size="icon" onClick={() => removeSize(index)}>
                       <X className="w-4 h-4" />
                     </Button>
                   </div>
                 ))}
                 {form.formState.errors.sizes && (
                    <p className="text-red-500 text-xs">{form.formState.errors.sizes.message}</p>
                 )}
              </div>
            </div>
          </div>
        )}

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-4 pt-2">
           <div>
             <label className="block text-sm font-medium mb-1.5">Sort Order</label>
             <Input type="number" {...form.register("sort_order")} />
           </div>
           <div className="space-y-3 pt-1">
             <div className="flex items-center gap-3">
               <Switch
                 checked={form.watch("available")}
                 onCheckedChange={(v) => form.setValue("available", v)}
               />
               <label className="text-sm font-medium">Available</label>
             </div>
             <div className="flex items-center gap-3">
               <Switch
                 checked={form.watch("is_popular")}
                 onCheckedChange={(v) => form.setValue("is_popular", v)}
               />
               <label className="text-sm font-medium">Mark as Popular</label>
             </div>
             <div className="flex items-center gap-3">
               <Switch
                 checked={form.watch("is_new")}
                 onCheckedChange={(v) => form.setValue("is_new", v)}
               />
               <label className="text-sm font-medium">Mark as New</label>
             </div>
           </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => navigate("/menu")} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {isNew ? "Create Item" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
