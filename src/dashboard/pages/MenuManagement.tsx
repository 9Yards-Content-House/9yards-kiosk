import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, LayoutGrid, List, ArrowUpDown, GripVertical } from "lucide-react";
import { useAllMenuItems, useCategories, useMenuRealtime } from "@shared/hooks/useMenu";
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
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { formatPrice, cn } from "@shared/lib/utils";
import type { MenuItemType } from "@shared/types/menu";

type FilterType = "all" | "available" | "unavailable" | "popular" | "new" | "scheduled";
type ItemTypeFilter = "all" | MenuItemType;
type ViewMode = "list" | "grid";
type SortBy = "name" | "price" | "category" | "sort_order";
type SortOrder = "asc" | "desc";

export default function MenuManagement() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: items, isLoading } = useAllMenuItems();
  const { data: categories } = useCategories();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterItemType, setFilterItemType] = useState<ItemTypeFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("menuViewMode");
    return (saved === "list" || saved === "grid") ? saved : "list";
  });

  useEffect(() => {
    localStorage.setItem("menuViewMode", viewMode);
  }, [viewMode]);
  const [sortBy, setSortBy] = useState<SortBy>("sort_order");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

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
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Menu Management</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-muted-foreground text-sm">
                {stats.total} items
              </span>
              <Badge variant="outline" className="text-xs">
                {stats.available} available
              </Badge>
              {stats.popular > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                  {stats.popular} popular
                </Badge>
              )}
              {stats.new > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  {stats.new} new
                </Badge>
              )}
            </div>
          </div>
          {canCreate && (
            <Button onClick={() => navigate("/menu/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu items..."
                className="pl-10"
              />
            </div>
            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden shrink-0"
              onClick={() => {
                const el = document.getElementById('mobile-filters');
                if (el) el.classList.toggle('hidden');
              }}
            >
              <Filter className="w-4 h-4" />
            </Button>
            {/* View Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 transition-colors ${
                  viewMode === "list" 
                    ? "bg-secondary text-white" 
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 transition-colors ${
                  viewMode === "grid" 
                    ? "bg-secondary text-white" 
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Category Chips (Horizontal Scroll) */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setFilterCategory("all")}
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
                onClick={() => setFilterCategory(cat.id)}
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

          {/* Filter Validations - 2-Col Grid on Mobile, Flex Row on Desktop */}
          <div id="mobile-filters" className="hidden md:flex flex-col md:flex-row gap-2 animate-in slide-in-from-top-2 duration-200">
            
            {/* Mobile Grid Container for Advanced Filters */}
            <div className="grid grid-cols-2 gap-2 md:contents">
              
              {/* Category Dropdown (Desktop Only) */}
              <div className="hidden md:block">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Category" />
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
              </div>

              <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                <SelectTrigger className="w-full md:w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterItemType} onValueChange={(v) => setFilterItemType(v as ItemTypeFilter)}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="Item Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="standalone">Standalone</SelectItem>
                  <SelectItem value="combo_component">Combo Component</SelectItem>
                  <SelectItem value="combo_driver">Combo Driver</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortBy); setSortOrder("asc"); }}>
                <SelectTrigger className="w-full md:w-[130px] md:ml-auto">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sort_order">Default</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>

            </div>
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
            {sortedItems?.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                category={categories?.find((c) => c.id === item.category_id)}
                canEdit={canEdit}
                onEdit={() => navigate(`/menu/${item.id}`)}
              />
            ))}
            {sortedItems?.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No menu items found
              </div>
            )}
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
