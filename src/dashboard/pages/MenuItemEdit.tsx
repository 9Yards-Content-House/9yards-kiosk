import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Upload, Trash2, Image as ImageIcon, X, Plus, Copy, Sparkles } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCategories } from "@shared/hooks/useMenu";
import { useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from "@shared/hooks/useMenuMutations";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { cn, formatPrice } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Switch } from "@shared/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@shared/components/ui/tooltip";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/components/ui/dialog";
import {
  HelpCircle,
  Info
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import MenuItemCardNew from "@kiosk/components/MenuItemCardNew";
import { toast } from "sonner";
import type { MenuItem, MenuItemType } from "@shared/types/menu";

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
  const [loading, setLoading] = useState(!isNew);
  
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
    if (isNew || USE_MOCK_DATA) {
      setLoading(false);
      return;
    }
    supabase
      .from("menu_items")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Menu item not found");
          navigate("/menu");
          return;
        }
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
        setLoading(false);
      });
  }, [id, isNew, form, navigate]);

  const onSubmit = async (data: MenuItemFormValues) => {
    try {
      const payload = {
        ...data,
        // Combo components have no standalone price (included in combo)
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
    // Only auto-set item_type for new items to avoid overriding manual choices
    if (isNew) {
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
  const resizeImage = (file: File): Promise<Blob | File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1200;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(blob || file);
          }, 'image/jpeg', 0.85);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload an image file (JPG, PNG, WebP, or GIF)");
      return;
    }
    
    setUploading(true);
    try {
      // Compress/Resize image before upload
      const processedFile = await resizeImage(file);
      
      if (USE_MOCK_DATA) {
        const url = URL.createObjectURL(processedFile as Blob);
        form.setValue("image_url", url, { shouldDirty: true });
        toast.success("Image preview ready (mock mode)");
        return;
      }

      const fileExt = "jpg"; // We convert to jpeg in resizeImage
      const fileName = `menu/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from("images")
        .upload(fileName, processedFile, { 
          cacheControl: "3600", 
          upsert: false,
          contentType: 'image/jpeg' // We always optimize to JPEG in resizeImage
        });

      if (error) {
        console.error("Supabase Storage Error:", error);
        throw error;
      }

      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
      form.setValue("image_url", urlData.publicUrl, { shouldDirty: true });
      toast.success("Image uploaded and optimized!");
    } catch (err: any) {
      console.error("Upload error:", err);
      const errorMessage = err.message || err.error_description || "Unknown error";
      toast.error(`Upload failed: ${errorMessage}`);
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
  const watchedAll = form.watch();

  // Handle unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty]);

  // Transform form values into MenuItem type for preview
  const previewItem: MenuItem = {
    id: id || 'preview',
    name: watchedAll.name || 'Item Name',
    description: watchedAll.description || 'Description goes here...',
    price: watchedAll.price || 0,
    category_id: watchedAll.category_id,
    image_url: watchedAll.image_url,
    available: watchedAll.available,
    sort_order: watchedAll.sort_order,
    is_popular: watchedAll.is_popular,
    is_new: watchedAll.is_new,
    item_type: watchedAll.item_type as MenuItemType,
    preparations: watchedAll.preparations?.length ? watchedAll.preparations.map(p => ({ ...p, priceModifier: p.priceModifier || 0 })) : null,
    sizes: watchedAll.sizes?.length ? watchedAll.sizes : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const selectedCategory = categories?.find(c => c.id === watchedAll.category_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  const errors = form.formState.errors;
  const hasGeneralErrors = !!(errors.name || errors.category_id || errors.description);
  const hasPricingErrors = !!(errors.price || errors.sizes || errors.preparations);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
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

      {/* Mobile Preview Toggle */}
      <div className="xl:hidden fixed bottom-24 right-4 z-50">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-full h-14 w-14 shadow-2xl bg-secondary hover:bg-secondary/90 text-white p-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-2rem)] rounded-3xl p-4 overflow-hidden">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-center font-black text-xs uppercase tracking-widest text-muted-foreground">Kiosk Card Preview</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-2">
              <div className="w-full max-w-[320px]">
                <MenuItemCardNew 
                  item={previewItem} 
                  categorySlug={selectedCategory?.slug}
                />
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-4 italic">
              * This is how the item looks on the kiosk.
            </p>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-24 flex-1 w-full max-w-2xl">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="flex w-full overflow-x-auto overflow-y-hidden bg-muted/50 p-1 h-auto no-scrollbar">
              <TabsTrigger value="general" className="relative flex-1 py-2 px-3">
                General
                {hasGeneralErrors && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
              </TabsTrigger>
              <TabsTrigger value="media" className="flex-1 py-2 px-3">Media</TabsTrigger>
              <TabsTrigger value="pricing" className="relative flex-1 py-2 px-3">
                Pricing
                {hasPricingErrors && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 py-2 px-3">Settings</TabsTrigger>
            </TabsList>

          {/* GENERAL TAB */}
          <TabsContent value="general" className="space-y-4 py-4">
             <div className="bg-card rounded-xl border p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Name <span className="text-red-500">*</span></label>
                  <Input {...form.register("name")} placeholder="Item name" autoFocus={isNew} />
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium mb-1.5">Category <span className="text-red-500">*</span></label>
                     <Select
                       value={form.watch("category_id")}
                       onValueChange={(value) => handleCategoryChange(value)}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Select category" />
                       </SelectTrigger>
                       <SelectContent>
                         {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     {form.formState.errors.category_id && (
                       <p className="text-red-500 text-xs mt-1">{form.formState.errors.category_id.message}</p>
                     )}
                   </div>
                   
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="block text-sm font-medium">Item Type</label>
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[280px] p-3 space-y-2">
                              <div>
                                <p className="font-bold text-xs uppercase mb-0.5">Standalone</p>
                                <p className="text-xs text-muted-foreground">Standard item sold individually with its own price (e.g. Rice, Chicken).</p>
                              </div>
                              <div>
                                <p className="font-bold text-xs uppercase mb-0.5 text-blue-600">Combo Component</p>
                                <p className="text-xs text-muted-foreground">Part of a meal. Price is 0 because it's included in the combo total.</p>
                              </div>
                              <div>
                                <p className="font-bold text-xs uppercase mb-0.5 text-purple-600">Combo Driver (Sauce)</p>
                                <p className="text-xs text-muted-foreground">Items that offer choices like sizes or preparation styles (e.g. Sauces).</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select
                        value={form.watch("item_type")}
                        onValueChange={(value) => handleItemTypeChange(value as MenuItemType)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standalone">Standalone</SelectItem>
                          <SelectItem value="combo_component">Combo Component</SelectItem>
                          <SelectItem value="combo_driver">Combo Driver (Sauce)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                </div>
             </div>
          </TabsContent>

          {/* MEDIA TAB */}
          <TabsContent value="media" className="py-4">
             <div className="bg-card rounded-xl border p-6">
                <label className="block text-sm font-medium mb-3">Item Image</label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="relative"
                >
                  {watchedImageUrl ? (
                    <div className="relative w-full h-64 rounded-lg overflow-hidden border bg-muted">
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
                      className={cn(
                        "w-full h-64 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200",
                        uploading ? "bg-muted border-muted-foreground/10" : "border-muted-foreground/20 hover:border-secondary/50 hover:bg-secondary/5 bg-muted/20"
                      )}
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
                <div className="mt-4">
                   <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Or use URL</label>
                   <Input
                     {...form.register("image_url")}
                     placeholder="https://example.com/image.jpg"
                   />
                </div>
             </div>
          </TabsContent>

          {/* PRICING TAB */}
          <TabsContent value="pricing" className="py-4 space-y-4">
             <div className="bg-card rounded-xl border p-6 space-y-6">
                <div>
                   <label className="block text-sm font-medium mb-1.5">Base Price (UGX)</label>
                   <Input
                     type="number"
                     {...form.register("price")}
                     disabled={watchedItemType === 'combo_component'}
                     className={watchedItemType === 'combo_component' ? 'bg-muted' : ''}
                   />
                   {form.formState.errors.price && (
                     <p className="text-red-500 text-xs mt-1">{form.formState.errors.price.message}</p>
                   )}
                   <p className="text-xs text-muted-foreground mt-1.5">
                     {watchedItemType === 'combo_component' 
                        ? 'Combo components are included in the combo price and cannot be sold individually.'
                        : 'For items with sizes, this is usually the price of the smallest/default size.'}
                   </p>
                </div>

                {showPreparationsAndSizes ? (
                  <>
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <label className="text-sm font-medium">Preparations</label>
                          <p className="text-xs text-muted-foreground">Cooking methods (e.g. Fried, Boiled)</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => appendPrep({ name: "", priceModifier: 0 })}>
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                     <div className="space-y-4">
                         {preparationFields.map((field, index) => (
                           <div key={field.id} className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/20 rounded-xl border relative">
                             <div className="flex-1 space-y-1.5">
                               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Label</label>
                               <Input {...form.register(`preparations.${index}.name` as const)} placeholder="Name (e.g. Fried)" className="bg-background" />
                             </div>
                             <div className="w-full sm:w-44 space-y-1.5">
                               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Extra Cost (UGX)</label>
                               <div className="flex items-center gap-2 bg-background rounded-lg px-3 border focus-within:ring-2 focus-within:ring-ring transition-all">
                                 <span className="text-[10px] font-black text-muted-foreground shrink-0 uppercase tracking-tighter">UGX</span>
                                 <Input 
                                   type="number" 
                                   {...form.register(`preparations.${index}.priceModifier` as const)} 
                                   placeholder="0" 
                                   className="h-10 border-none bg-transparent text-sm focus-visible:ring-0 p-0 shadow-none"
                                 />
                               </div>
                             </div>
                             <Button 
                               type="button" 
                               variant="ghost" 
                               size="icon" 
                               onClick={() => removePrep(index)} 
                               className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background border shadow-sm hover:text-destructive"
                             >
                               <X className="w-3 h-3" />
                             </Button>
                           </div>
                         ))}
                         {preparationFields.length === 0 && (
                            <p className="text-sm text-muted-foreground italic text-center py-4">No preparations defined.</p>
                         )}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <label className="text-sm font-medium">Sizes</label>
                          <p className="text-xs text-muted-foreground">Portion sizes with specific prices</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => appendSize({ name: "", price: 0 })}>
                          <Plus className="w-4 h-4 mr-1" /> Add Size
                        </Button>
                      </div>
                      <div className="space-y-4">
                         {sizeFields.map((field, index) => (
                           <div key={field.id} className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/20 rounded-xl border relative">
                             <div className="flex-1 space-y-1.5">
                               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Size Name</label>
                               <Input {...form.register(`sizes.${index}.name` as const)} placeholder="e.g. Regular, Large" className="bg-background" />
                             </div>
                             <div className="w-full sm:w-44 space-y-1.5">
                               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Price (UGX)</label>
                               <Input type="number" {...form.register(`sizes.${index}.price` as const)} placeholder="Price" className="bg-background" />
                             </div>
                             <Button 
                               type="button" 
                               variant="ghost" 
                               size="icon" 
                               onClick={() => removeSize(index)}
                               className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background border shadow-sm hover:text-destructive"
                             >
                               <X className="w-3 h-3" />
                             </Button>
                           </div>
                         ))}
                         {sizeFields.length === 0 && (
                            <p className="text-sm text-muted-foreground italic text-center py-4">No sizes defined.</p>
                         )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-muted/30 p-4 rounded-lg border border-dashed text-center">
                    <p className="text-sm text-muted-foreground">
                      Only "Combo Driver" items (like Sauces) support multiple sizes and preparation methods.
                    </p>
                  </div>
                )}
             </div>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="py-4">
            <div className="bg-card rounded-xl border p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-sm font-medium mb-1.5">Sort Order</label>
                     <Input type="number" {...form.register("sort_order")} />
                     <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first in the menu.</p>
                   </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                   <div className="flex items-center justify-between">
                     <div className="space-y-0.5">
                       <label className="text-sm font-medium">Available</label>
                       <p className="text-xs text-muted-foreground">Show this item on the menu</p>
                     </div>
                     <Switch
                       checked={form.watch("available")}
                       onCheckedChange={(v) => form.setValue("available", v)}
                     />
                   </div>
                   
                   <div className="flex items-center justify-between">
                     <div className="space-y-0.5">
                       <label className="text-sm font-medium">Popular</label>
                       <p className="text-xs text-muted-foreground">Highlight with a star badge</p>
                     </div>
                     <Switch
                       checked={form.watch("is_popular")}
                       onCheckedChange={(v) => form.setValue("is_popular", v)}
                     />
                   </div>

                   <div className="flex items-center justify-between">
                     <div className="space-y-0.5">
                       <label className="text-sm font-medium">New Item</label>
                       <p className="text-xs text-muted-foreground">Highlight with a "New" badge</p>
                     </div>
                     <Switch
                       checked={form.watch("is_new")}
                       onCheckedChange={(v) => form.setValue("is_new", v)}
                     />
                   </div>
                </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Floating Footer Actions */}
        <div className="sticky bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t flex gap-3 mt-6 z-10">
          <Button type="button" variant="outline" onClick={() => navigate("/menu")} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {isNew ? "Create Item" : "Save Changes"}
          </Button>
        </div>
      </form>

        {/* PREVIEW PANEL */}
        <aside className="hidden xl:block w-[360px] sticky top-8 space-y-6 shrink-0">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 flex items-center gap-2">
              Kiosk Preview
              <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            </h3>
            <span className="text-[9px] bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-full font-black tracking-tighter">LIVE</span>
          </div>
          
          <div className="p-6 bg-muted/30 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-muted-foreground/15 flex items-center justify-center min-h-[480px] shadow-inner">
             <div className="w-full transform transition-transform duration-500">
                <MenuItemCardNew 
                  item={previewItem} 
                  categorySlug={selectedCategory?.slug}
                />
             </div>
          </div>
          
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 backdrop-blur-sm">
             <div className="flex gap-3">
               <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                 <span className="text-[10px] font-bold">i</span>
               </div>
               <p className="text-xs text-blue-700 leading-relaxed">
                 This is a 1:1 preview of how the item appears on the kiosk screen. Changes update instantly.
               </p>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
