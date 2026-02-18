import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, LayoutGrid, List, ArrowUpDown, X, Power, PowerOff, ChevronDown, MoveHorizontal, ChevronUp, ChevronDown as ChevronDownIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAllMenuItems, useCategories, useMenuRealtime } from "@shared/hooks/useMenu";
import { 
  useToggleMenuItemAvailability,
  useBulkUpdateMenuAvailability,
  useUpdateMenuItem 
} from "@shared/hooks/useMenuMutations";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import MenuItemRow from "../components/MenuItemRow";
import MenuItemGridCard from "../components/MenuItemGridCard";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@shared/components/ui/dropdown-menu";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { cn } from "@shared/lib/utils";
import { toast } from "sonner";
import type { MenuItemType } from "@shared/types/menu";

type FilterType = "all" | "available" | "unavailable" | "popular" | "new" | "scheduled";
type ItemTypeFilter = "all" | MenuItemType;
type ViewMode = "list" | "grid";
type SortBy = "name" | "price" | "category" | "sort_order";
type SortOrder = "asc" | "desc";

export default function MenuManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAuth();
  const { data: items, isLoading } = useAllMenuItems();
  const { data: categories } = useCategories();
  const bulkUpdateAvailability = useBulkUpdateMenuAvailability();

  // Sync state with URL Search Params
  const search = searchParams.get("q") || "";
  const filterCategory = searchParams.get("cat") || "all";
  const filterType = (searchParams.get("f") as FilterType) || "all";
  const filterItemType = (searchParams.get("t") as ItemTypeFilter) || "all";
  const sortBy = (searchParams.get("sort") as SortBy) || "sort_order";
  const sortOrder = (searchParams.get("order") as SortOrder) || "asc";

  const updateParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "all" || (key === "q" && !value)) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams, { replace: true });
  };

  const [showFilters, setShowFilters] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("menuViewMode");
    return (saved === "list" || saved === "grid") ? saved : "list";
  });

  const updateMenuItem = useUpdateMenuItem();

  // Subscribe to menu changes for realtime sync
  useMenuRealtime();

  const canEdit = role ? hasPermission(role, "menu:update") : false;
  const canCreate = role ? hasPermission(role, "menu:create") : false;

  const filtered = items?.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || item.category_id === filterCategory;

    // Type filters
    let matchesType = true;
    if (filterType === "available") matchesType = item.available;
    if (filterType === "unavailable") matchesType = !item.available;
    if (filterType === "popular") matchesType = !!item.is_popular;
    if (filterType === "new") matchesType = !!item.is_new;
    if (filterType === "scheduled") {
      matchesType = !!item.available_from || !!item.available_until;
    }

    // Item type filter
    const matchesItemType =
      filterItemType === "all" || item.item_type === filterItemType;

    return matchesSearch && matchesCategory && matchesType && matchesItemType;
  });

  // Sort items
  const sortedItems = filtered ? [...filtered].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "price":
        comparison = a.price - b.price;
        break;
      case "category": {
        const catA = categories?.find(c => c.id === a.category_id)?.name || "";
        const catB = categories?.find(c => c.id === b.category_id)?.name || "";
        comparison = catA.localeCompare(catB);
        break;
      }
      case "sort_order":
      default:
        comparison = a.sort_order - b.sort_order;
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  }) : [];

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      updateParams({ order: sortOrder === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: field, order: "asc" });
    }
  };

  const handleBulkAvailability = async (categoryId: string, available: boolean) => {
    const categoryItems = items?.filter(i => categoryId === 'all' || i.category_id === categoryId) || [];
    if (categoryItems.length === 0) return;

    try {
      await bulkUpdateAvailability.mutateAsync({
        ids: categoryItems.map(i => i.id),
        available
      });
      toast.success(`${categoryItems.length} items marked as ${available ? 'available' : 'unavailable'}`);
    } catch {
      toast.error("Failed to update items");
    }
  };

  const handleMove = async (itemId: string, direction: 'up' | 'down') => {
    const item = items?.find(i => i.id === itemId);
    if (!item) return;

    // Only move within the same category
    const categoryItems = sortedItems.filter(i => i.category_id === item.category_id);
    const currentIndex = categoryItems.findIndex(i => i.id === itemId);
    
    if (direction === 'up' && currentIndex > 0) {
      const targetItem = categoryItems[currentIndex - 1];
      await updateMenuItem.mutateAsync({ id: item.id, sort_order: targetItem.sort_order });
      await updateMenuItem.mutateAsync({ id: targetItem.id, sort_order: item.sort_order });
      toast.success("Moved item up");
    } else if (direction === 'down' && currentIndex < categoryItems.length - 1) {
      const targetItem = categoryItems[currentIndex + 1];
      await updateMenuItem.mutateAsync({ id: item.id, sort_order: targetItem.sort_order });
      await updateMenuItem.mutateAsync({ id: targetItem.id, sort_order: item.sort_order });
      toast.success("Moved item down");
    }
  };

  // Stats
  const stats = {
    total: items?.length || 0,
    available: items?.filter((i) => i.available).length || 0,
    popular: items?.filter((i) => i.is_popular).length || 0,
    new: items?.filter((i) => i.is_new).length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90">Menu Management</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm font-medium mr-1.5 border-r border-border/50 pr-3">
                {stats.total} total items
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-green-200 text-green-700 bg-green-50/50">
                  {stats.available} active
                </Badge>
                {stats.popular > 0 && (
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-amber-200 text-amber-700 bg-amber-50/50">
                    {stats.popular} popular
                  </Badge>
                )}
                {stats.new > 0 && (
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-blue-200 text-blue-700 bg-blue-50/50">
                    {stats.new} new
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {canCreate && (
            <Button 
              onClick={() => navigate("/menu/new")} 
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98] h-12 px-8 rounded-xl font-bold shrink-0"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Menu Item
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-4 mb-6 bg-card/40 p-2 rounded-2xl border border-border/30 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full lg:max-w-2xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={(e) => updateParams({ q: e.target.value })}
                placeholder="Search by name, category, or description..."
                className="pl-11 pr-10 h-12 rounded-xl border-border/40 bg-background/40 focus-visible:ring-primary/10 transition-all font-medium text-base"
              />
              {search && (
                <button 
                  onClick={() => updateParams({ q: "" })}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground/60" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible no-scrollbar">
              <Button
                variant={isReorderMode ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-11 px-4 rounded-xl font-bold transition-all shrink-0", 
                  isReorderMode ? "bg-amber-600 hover:bg-amber-700 border-amber-600" : "bg-background/50 hover:bg-accent border-border/60"
                )}
                onClick={() => {
                  setIsReorderMode(!isReorderMode);
                  if (!isReorderMode) {
                    setViewMode("list");
                    updateParams({ sort: "sort_order", order: "asc" });
                  }
                }}
              >
                <MoveHorizontal className="w-4 h-4 mr-2" />
                {isReorderMode ? "Exit Reorder" : "Reorder"}
              </Button>

              <div className="flex items-center p-1 bg-muted/50 border border-border/60 rounded-xl shrink-0">
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === "list" 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  title="List view"
                >
                  <List className="w-4.5 h-4.5" />
                </button>
                <button
                  disabled={isReorderMode}
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === "grid" 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    isReorderMode && "opacity-30 cursor-not-allowed"
                  )}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Category Chips (Horizontal Scroll) */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => updateParams({ cat: "all" })}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                filterCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-accent"
              )}
            >
              All
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => updateParams({ cat: cat.id })}
                className={cn(
                  "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  filterCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-accent"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Advanced Filters Toolbar */}
          <div className={cn(
            "flex-wrap items-center gap-3 p-2 rounded-xl bg-muted/20 border border-border/30",
            showFilters ? "flex animate-in slide-in-from-top-2 duration-300" : "hidden md:flex"
          )}>
            {/* Category Filter + Bulk Group */}
            <div className="flex items-center gap-0 w-full md:w-auto p-0.5 bg-background shadow-sm rounded-lg border border-border/40 divide-x divide-border/40">
              <Select value={filterCategory} onValueChange={(v) => updateParams({ cat: v })}>
                <SelectTrigger className="w-full md:w-[170px] h-9 border-0 bg-transparent shadow-none focus:ring-0 px-3">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/50 rounded-none transition-colors" title="Category Actions">
                    <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 mt-2">
                  <DropdownMenuLabel className="flex items-center text-[10px] uppercase tracking-wider text-muted-foreground p-2">
                    Actions for {filterCategory === 'all' ? 'All Items' : categories?.find(c => c.id === filterCategory)?.name}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-green-600 focus:text-green-600 focus:bg-green-50"
                    onClick={() => handleBulkAvailability(filterCategory, true)}
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Mark All Active
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive focus:bg-destructive/5"
                    onClick={() => handleBulkAvailability(filterCategory, false)}
                  >
                    <PowerOff className="w-4 h-4 mr-2" />
                    Mark All Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Availability Filter */}
            <Select value={filterType} onValueChange={(v) => updateParams({ f: v })}>
              <SelectTrigger className="w-full md:w-[175px] h-10 md:h-10 rounded-lg border-border/40 bg-background shadow-sm">
                <div className="flex items-center whitespace-nowrap overflow-hidden">
                  <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground/60 shrink-0" />
                  <SelectValue placeholder="Availability" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Active Only</SelectItem>
                <SelectItem value="unavailable">Inactive Only</SelectItem>
                <SelectItem value="popular">Popular Items</SelectItem>
                <SelectItem value="new">New Items</SelectItem>
                <SelectItem value="scheduled">Scheduled Items</SelectItem>
              </SelectContent>
            </Select>

            {/* Item Relationship Filter */}
            <Select value={filterItemType} onValueChange={(v) => updateParams({ t: v })}>
              <SelectTrigger className="w-full md:w-[185px] h-10 md:h-10 rounded-lg border-border/40 bg-background shadow-sm">
                <SelectValue placeholder="Relationships" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Relationships</SelectItem>
                <SelectItem value="standalone">Standalone Items</SelectItem>
                <SelectItem value="combo_component">Combo Components</SelectItem>
                <SelectItem value="combo_driver">Combo Drivers (Sauces)</SelectItem>
              </SelectContent>
            </Select>

            {/* Sorting - Pushed to right on Desktop */}
            <div className="flex-1 hidden md:block" />

            <Select value={sortBy} onValueChange={(v) => updateParams({ sort: v, order: "asc" })}>
              <SelectTrigger className="w-full md:w-[160px] h-10 md:h-10 rounded-lg border-border/40 bg-background shadow-sm">
                <div className="flex items-center whitespace-nowrap overflow-hidden">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-2 text-muted-foreground/60 shrink-0" />
                  <SelectValue placeholder="Sort order" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sort_order">Default Order</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="price">Price (Low-High)</SelectItem>
                <SelectItem value="category">Category Group</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Items list */}
        {viewMode === "list" ? (
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="hidden md:flex md:items-center md:gap-4 lg:grid lg:grid-cols-[1fr_120px_100px_120px_100px] px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
              <button 
                onClick={() => toggleSort("name")}
                className="flex-1 flex items-center gap-1 hover:text-foreground transition-colors text-left lg:flex-none"
                aria-sort={sortBy === "name" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
              >
                Item
                {sortBy === "name" && <ArrowUpDown className="w-3 h-3" aria-hidden="true" />}
              </button>
              <button 
                onClick={() => toggleSort("category")}
                className="hidden lg:flex items-center gap-1 hover:text-foreground transition-colors"
                aria-sort={sortBy === "category" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
              >
                Category
                {sortBy === "category" && <ArrowUpDown className="w-3 h-3" aria-hidden="true" />}
              </button>
              <button 
                onClick={() => toggleSort("price")}
                className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
                aria-sort={sortBy === "price" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
              >
                Price
                {sortBy === "price" && <ArrowUpDown className="w-3 h-3" aria-hidden="true" />}
              </button>
              <span className="hidden lg:block">Badges</span>
              <span className="shrink-0">Actions</span>
            </div>
            {sortedItems?.map((item, index) => (
              <div key={item.id} className="relative">
                <MenuItemRow
                  item={item}
                  category={categories?.find((c) => c.id === item.category_id)}
                  canEdit={canEdit}
                  onEdit={() => navigate(`/menu/${item.id}`)}
                />
                {isReorderMode && (
                  <div className="absolute right-32 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button 
                      variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => handleMove(item.id, 'up')}
                      disabled={index === 0 || sortedItems[index-1]?.category_id !== item.category_id}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => handleMove(item.id, 'down')}
                      disabled={index === sortedItems.length - 1 || sortedItems[index+1]?.category_id !== item.category_id}
                    >
                      <ChevronDownIcon className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {sortedItems?.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No menu items found
              </div>
            )}
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {sortedItems?.map((item) => (
              <MenuItemGridCard
                key={item.id}
                item={item}
                category={categories?.find((c) => c.id === item.category_id)}
                canEdit={canEdit}
                onEdit={() => navigate(`/menu/${item.id}`)}
              />
            ))}
            {sortedItems?.length === 0 && (
              <div className="col-span-full p-8 text-center text-muted-foreground bg-card rounded-xl border">
                No menu items found
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
