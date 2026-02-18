import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, GripVertical, Loader2, Save, FolderOpen, AlertTriangle, ChevronUp, ChevronDown, ShieldCheck, Lock, Unlock, Search, MoreVertical } from "lucide-react";
import { useCategories, useAllMenuItems } from "@shared/hooks/useMenu";
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
} from "@shared/hooks/useMenuMutations";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { toast } from "sonner";
import type { Category } from "@shared/types/menu";

// Protected slugs - changing these will break kiosk functionality
const PROTECTED_SLUGS = ['main-dishes', 'sauces', 'side-dishes', 'juices', 'desserts', 'lusaniya'];

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CategoryManagement() {
  const { role } = useAuth();
  const { data: categories = [], isLoading } = useCategories();
  const { data: menuItems = [] } = useAllMenuItems();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [unlockedCategories, setUnlockedCategories] = useState<Record<string, boolean>>({});

  const canEdit = role ? hasPermission(role, "menu:update") : false;
  const canCreate = role ? hasPermission(role, "menu:create") : false;
  const canDelete = role ? hasPermission(role, "menu:delete") : false;

  // Sort categories by sort_order
  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    let result = [...categories];
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.slug.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => a.sort_order - b.sort_order);
  }, [categories, searchQuery]);

  const sortedCategories = filteredCategories;

  // Count items per category
  const itemCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    menuItems.forEach((item) => {
      counts[item.category_id] = (counts[item.category_id] || 0) + 1;
    });
    return counts;
  }, [menuItems]);

  // Check if a slug is protected
  const isProtectedSlug = (slug: string) => PROTECTED_SLUGS.includes(slug);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    const slug = newCategorySlug.trim() || generateSlug(newCategoryName);

    // Check for duplicate slug
    if (categories.some((c) => c.slug === slug)) {
      toast.error("A category with this slug already exists");
      return;
    }

    try {
      await createCategory.mutateAsync({
        name: newCategoryName.trim(),
        slug,
        sort_order: categories.length + 1,
      });
      toast.success("Category created successfully");
      setNewCategoryName("");
      setNewCategorySlug("");
      setIsAddDialogOpen(false);
    } catch {
      toast.error("Failed to create category");
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editName.trim()) {
      toast.error("Category name is required");
      return;
    }

    // For protected slugs, always use the original slug
    const isProtected = isProtectedSlug(editingCategory.slug);
    const slug = isProtected ? editingCategory.slug : (editSlug.trim() || generateSlug(editName));

    // Check for duplicate slug (excluding current category)
    if (!isProtected && categories.some((c) => c.slug === slug && c.id !== editingCategory.id)) {
      toast.error("A category with this slug already exists");
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        name: editName.trim(),
        slug,
      });
      toast.success("Category updated successfully");
      setEditingCategory(null);
    } catch {
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    
    // Double-check protected categories can't be deleted
    if (category && isProtectedSlug(category.slug)) {
      toast.error("Cannot delete protected category");
      return;
    }

    try {
      await deleteCategory.mutateAsync(categoryId);
      toast.success("Category deleted successfully");
    } catch {
      toast.error("Failed to delete category. Make sure it has no menu items.");
    }
  };

  // Get item count for a category (for delete warnings)
  const getCategoryItemCount = (categoryId: string) => itemCountByCategory[categoryId] || 0;

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...sortedCategories];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    try {
      await reorderCategories.mutateAsync(newOrder.map((c) => c.id));
    } catch {
      toast.error("Failed to reorder categories");
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === sortedCategories.length - 1) return;
    const newOrder = [...sortedCategories];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    try {
      await reorderCategories.mutateAsync(newOrder.map((c) => c.id));
    } catch {
      toast.error("Failed to reorder categories");
    }
  };

  const openEditDialog = (category: Category) => {
    if (isProtectedSlug(category.slug) && !unlockedCategories[category.id]) {
      toast.error("Unlock this category first to edit");
      return;
    }
    setEditingCategory(category);
    setEditName(category.name);
    setEditSlug(category.slug);
  };

  const toggleLock = (categoryId: string) => {
    setUnlockedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
    toast.info("Safety lock toggled");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#212282]">Category Management</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
              Organize kiosk menu grouping and sorting.
            </p>
          </div>
          {canCreate && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-9 h-11 md:h-10 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)} className="h-11 md:h-10 px-4">
                <Plus className="w-4 h-4 mr-2" />
                <span>Add Category</span>
              </Button>
            </div>
          )}
        </div>

        {/* Warning Banner - More compact on mobile */}
        <div className="flex items-start gap-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50/50 dark:bg-red-950/20 rounded-xl px-3 py-2.5 border border-red-100 dark:border-red-900/40 shadow-sm overflow-hidden">
          <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            CRITICAL: <span className="opacity-80">Protected slugs (main-dishes, sauces, etc.) must NOT be changed to keep Kiosk working.</span>
          </p>
        </div>
      </div>

      {/* Category List */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="hidden lg:grid grid-cols-[60px_1fr_1fr_120px_220px] gap-4 px-6 py-3.5 border-b bg-muted/30 text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
          <span className="pl-2">#</span>
          <span>Category Name</span>
          <span>System Slug</span>
          <span className="text-center">Item Count</span>
          <span className="text-right pr-4">Management Actions</span>
        </div>

        {sortedCategories.length === 0 ? (
          <div className="p-8 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-1">No categories yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first category to start organizing menu items
            </p>
            {canCreate && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-border/40">
            {sortedCategories.map((category, index) => (
              <div
                key={category.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between lg:grid lg:grid-cols-[60px_1fr_1fr_120px_220px] gap-2 lg:gap-4 px-4 lg:px-6 py-4 lg:py-5 bg-card hover:bg-slate-50/80 transition-all group"
              >
                {/* Drag handle / Position */}
                <div className="hidden lg:flex items-center gap-2 text-muted-foreground/40 group-hover:text-primary/60 transition-colors">
                  <GripVertical className="w-4 h-4 cursor-grab active:cursor-grabbing" />
                  <span className="text-[11px] font-mono font-bold w-4">{index + 1}</span>
                </div>

                {/* Name & Slug & Items (Mobile) */}
                <div className="flex items-start lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <FolderOpen className="w-5 h-5 md:w-6 md:h-6 text-primary/70" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <p className="font-bold text-sm md:text-base text-slate-800 truncate">
                          {category.name}
                        </p>
                        {isProtectedSlug(category.slug) && (
                          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" title="System Category" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="font-mono text-[9px] md:text-[10px] px-1.5 py-0 h-4 md:h-5 lg:hidden bg-slate-50">
                          {category.slug}
                        </Badge>
                        <span className="text-[10px] md:text-xs text-muted-foreground font-medium lg:hidden">
                          {getCategoryItemCount(category.id)} items
                        </span>
                        {getCategoryItemCount(category.id) === 0 && (
                          <Badge variant="secondary" className="lg:hidden bg-amber-50 text-amber-600 border-amber-200 text-[9px] px-1.5 py-0 h-4">Empty</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Mobile Dropdown) */}
                  <div className="flex lg:hidden items-center gap-1">
                    <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || reorderCategories.isPending}
                      >
                        <ChevronUp className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === sortedCategories.length - 1 || reorderCategories.isPending}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </Button>
                    </div>

                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {isProtectedSlug(category.slug) && (
                            <DropdownMenuItem onClick={() => toggleLock(category.id)}>
                              {unlockedCategories[category.id] ? (
                                <>
                                  <Lock className="w-3.5 h-3.5 mr-2" /> Lock Slug
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5 mr-2" /> Unlock Slug
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => openEditDialog(category)}
                            disabled={isProtectedSlug(category.slug) && !unlockedCategories[category.id]}
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit Details
                          </DropdownMenuItem>
                          {canDelete && !isProtectedSlug(category.slug) && (
                             <AlertDialog>
                               <AlertDialogTrigger asChild>
                                 <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-destructive hover:text-destructive-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left text-destructive font-medium">
                                   <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Category
                                 </button>
                               </AlertDialogTrigger>
                               <AlertDialogContent>
                                 <AlertDialogHeader>
                                   <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                                   <AlertDialogDescription>
                                     This will permanently delete "{category.name}". This action cannot be undone.
                                     {getCategoryItemCount(category.id) > 0 && (
                                       <span className="block mt-2 font-bold text-destructive">
                                         ⚠️ This category contains {getCategoryItemCount(category.id)} items.
                                       </span>
                                     )}
                                   </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                   <AlertDialogCancel>Cancel</AlertDialogCancel>
                                   <AlertDialogAction onClick={() => handleDeleteCategory(category.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                                 </AlertDialogFooter>
                               </AlertDialogContent>
                             </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Slug (Desktop) */}
                <div className="hidden lg:block">
                  <code className="text-[11px] font-mono py-1 px-2.5 rounded bg-slate-100 text-slate-600 border border-slate-200/50">
                    {category.slug}
                  </code>
                </div>

                {/* Item Count (Desktop) */}
                <div className="hidden lg:flex items-center justify-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-50 border px-3 py-1 rounded-full">
                    <span className="text-sm font-bold text-slate-700">
                      {getCategoryItemCount(category.id)}
                    </span>
                    {getCategoryItemCount(category.id) === 0 && (
                      <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter bg-amber-100/50 text-amber-700 border-amber-200/50 px-1 py-0 h-3.5">Empty</Badge>
                    )}
                  </div>
                </div>

                {/* Actions (Desktop Only) */}
                <div className="hidden lg:flex items-center justify-end gap-1.5 pr-2">
                  {canEdit && (
                    <>
                      {isProtectedSlug(category.slug) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-9 w-9 rounded-lg transition-all",
                            unlockedCategories[category.id] ? "text-amber-500 bg-amber-50 border-amber-100 shadow-sm" : "text-muted-foreground/60 hover:text-blue-500 hover:bg-blue-50 border border-transparent"
                          )}
                          onClick={() => toggleLock(category.id)}
                          title={unlockedCategories[category.id] ? "Lock category slug" : "Unlock slug for editing"}
                        >
                          {unlockedCategories[category.id] ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </Button>
                      )}
                      <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/40">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-white hover:shadow-sm"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0 || reorderCategories.isPending}
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-white hover:shadow-sm"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === sortedCategories.length - 1 || reorderCategories.isPending}
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9 rounded-lg transition-all border border-transparent",
                          isProtectedSlug(category.slug) && !unlockedCategories[category.id] 
                            ? "opacity-20 cursor-not-allowed" 
                            : "text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/10"
                        )}
                        onClick={() => openEditDialog(category)}
                        disabled={isProtectedSlug(category.slug) && !unlockedCategories[category.id]}
                        title="Edit category details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 hover:border-destructive/10 border border-transparent transition-all"
                          disabled={isProtectedSlug(category.slug)}
                          title={isProtectedSlug(category.slug) ? "Protected category (cannot delete)" : "Delete category"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-3 pt-2">
                              <p className="text-sm">
                                This will permanently delete <span className="font-bold text-foreground">"{category.name}"</span>. This action cannot be undone.
                              </p>
                              {getCategoryItemCount(category.id) > 0 && (
                                <div className="bg-destructive/5 p-3 rounded-xl border border-destructive/20">
                                   <div className="flex items-center gap-2 text-destructive font-bold text-xs mb-1">
                                      <AlertTriangle className="w-4 h-4" />
                                      DANGER ZONE
                                   </div>
                                   <p className="text-xs text-destructive leading-relaxed">
                                      This category contains <span className="font-bold underline">{getCategoryItemCount(category.id)} menu item(s)</span>. 
                                      You must move or delete these items first, or they will be unlinked from the system!
                                   </p>
                                </div>
                              )}
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4">
                          <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCategory(category.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg px-6"
                          >
                            Delete Forever
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog 
        open={isAddDialogOpen} 
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            // Reset form when closing
            setNewCategoryName("");
            setNewCategorySlug("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category for organizing menu items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <Input
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  // Always auto-generate slug as user types name
                  setNewCategorySlug(generateSlug(e.target.value));
                }}
                placeholder="e.g. Appetizers"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Slug <span className="text-muted-foreground font-normal">(URL-friendly identifier)</span>
              </label>
              <Input
                value={newCategorySlug}
                onChange={(e) => setNewCategorySlug(e.target.value)}
                placeholder="e.g. appetizers"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-generated from name. Edit if needed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={createCategory.isPending}>
              {createCategory.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog 
        open={!!editingCategory} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingCategory(null);
            setEditName("");
            setEditSlug("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category name and slug.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Category name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Slug <span className="text-muted-foreground font-normal">(URL-friendly identifier)</span>
              </label>
              <Input
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                placeholder="category-slug"
                className="font-mono"
                disabled={editingCategory ? isProtectedSlug(editingCategory.slug) : false}
              />
              {editingCategory && isProtectedSlug(editingCategory.slug) ? (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  This is a protected slug used by the kiosk. It cannot be changed.
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Changing slug may affect combo builder if items reference this category.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory} disabled={updateCategory.isPending}>
              {updateCategory.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
