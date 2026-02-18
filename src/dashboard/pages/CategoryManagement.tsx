import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, GripVertical, Loader2, Save, FolderOpen, AlertTriangle, ChevronUp, ChevronDown, ShieldCheck, Lock, Unlock, Search } from "lucide-react";
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
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Category Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage menu categories. Categories determine how items are grouped in the kiosk.
          </p>
          <div className="flex items-center gap-2 mt-3 text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 border border-red-100 dark:border-red-900/50 w-full sm:w-fit shadow-sm">
            <Lock className="w-4 h-4" />
            <span>CRITICAL: Protected slugs (main-dishes, sauces, etc.) must NOT be changed to keep Kiosk working</span>
          </div>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                className="pl-9 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="h-10">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Category</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        )}
      </div>

      {/* Category List */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="hidden lg:grid grid-cols-[40px_1fr_200px_130px_180px] gap-4 px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
          <span></span>
          <span>Name</span>
          <span>Slug</span>
          <span>Items</span>
          <span>Actions</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:block">
            {sortedCategories.map((category, index) => (
              <div
                key={category.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between lg:grid lg:grid-cols-[40px_1fr_200px_130px_180px] gap-2 lg:gap-4 px-4 py-4 lg:py-3 border-b hover:bg-muted/30 transition-colors"
              >
                {/* Drag handle / Position */}
                <div className="hidden lg:flex items-center gap-1 text-muted-foreground">
                  <GripVertical className="w-4 h-4" />
                  <span className="text-xs">{index + 1}</span>
                </div>

                {/* Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium flex items-center gap-1.5 truncate">
                      {category.name}
                      {isProtectedSlug(category.slug) && (
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" title="System Category" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground lg:hidden truncate">{category.slug}</p>
                    {getCategoryItemCount(category.id) === 0 && (
                      <Badge variant="secondary" className="lg:hidden mt-1 bg-amber-50 text-amber-600 border-amber-200 text-[10px] px-1.5 py-0 h-4">Empty</Badge>
                    )}
                  </div>
                </div>

                {/* Slug */}
                <div className="hidden lg:block truncate">
                  <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                    {category.slug}
                  </Badge>
                </div>

                {/* Item Count */}
                <div className="hidden lg:flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {getCategoryItemCount(category.id)}
                  </span>
                  {getCategoryItemCount(category.id) === 0 && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">Empty</Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 mt-2 lg:mt-0">
                  {canEdit && (
                    <>
                      {isProtectedSlug(category.slug) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8 transition-colors",
                            unlockedCategories[category.id] ? "text-amber-500 hover:text-amber-600 bg-amber-50" : "text-muted-foreground hover:text-blue-500 hover:bg-blue-50"
                          )}
                          onClick={() => toggleLock(category.id)}
                          title={unlockedCategories[category.id] ? "Lock category" : "Unlock to edit"}
                        >
                          {unlockedCategories[category.id] ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </Button>
                      )}
                      <div className="flex items-center bg-muted/30 rounded-md px-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0 || reorderCategories.isPending}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === sortedCategories.length - 1 || reorderCategories.isPending}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 text-muted-foreground transition-colors",
                          isProtectedSlug(category.slug) && !unlockedCategories[category.id] ? "opacity-30 cursor-not-allowed" : "hover:text-primary hover:bg-primary/10"
                        )}
                        onClick={() => openEditDialog(category)}
                        disabled={isProtectedSlug(category.slug) && !unlockedCategories[category.id]}
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
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          disabled={isProtectedSlug(category.slug)}
                          title={isProtectedSlug(category.slug) ? "Protected category cannot be deleted" : "Delete category"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-2">
                              <p>
                                This will permanently delete "{category.name}". This action cannot be undone.
                              </p>
                              {getCategoryItemCount(category.id) > 0 && (
                                <p className="text-destructive font-bold bg-destructive/5 p-2 rounded-lg border border-destructive/20 text-xs">
                                  ⚠️ DANGER: This category contains {getCategoryItemCount(category.id)} menu item(s). 
                                  You must move or delete these items first, or they will be removed from the system!
                                </p>
                              )}
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCategory(category.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
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
