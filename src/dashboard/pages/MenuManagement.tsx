import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, LayoutGrid, List, ArrowUpDown, GripVertical } from "lucide-react";
import { useAllMenuItems, useCategories, useMenuRealtime } from "@shared/hooks/useMenu";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import MenuItemRow from "../components/MenuItemRow";
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
import { formatPrice } from "@shared/lib/utils";

type FilterType = "all" | "available" | "unavailable" | "popular" | "new" | "scheduled";
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
  const [viewMode, setViewMode] = useState<ViewMode>("list");
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

    return matchesSearch && matchesCategory && matchesType;
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
      case "category":
        const catA = categories?.find(c => c.id === a.category_id)?.name || "";
        const catB = categories?.find(c => c.id === b.category_id)?.name || "";
        comparison = catA.localeCompare(catB);
        break;
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

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items..."
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
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
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger className="w-full sm:w-[140px]">
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
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortBy); setSortOrder("asc"); }}>
              <SelectTrigger className="w-full sm:w-[130px]">
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
            <div className="flex items-center border rounded-lg overflow-hidden ml-auto">
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
        </div>

        {/* Items list */}
        {viewMode === "list" ? (
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_120px_100px_120px_100px] gap-4 px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
              <button 
                onClick={() => toggleSort("name")}
                className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
              >
                Item
                {sortBy === "name" && <ArrowUpDown className="w-3 h-3" />}
              </button>
              <button 
                onClick={() => toggleSort("category")}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Category
                {sortBy === "category" && <ArrowUpDown className="w-3 h-3" />}
              </button>
              <button 
                onClick={() => toggleSort("price")}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Price
                {sortBy === "price" && <ArrowUpDown className="w-3 h-3" />}
              </button>
              <span>Badges</span>
              <span>Actions</span>
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
              <div
                key={item.id}
                onClick={() => canEdit && navigate(`/menu/${item.id}`)}
                className={`bg-card rounded-xl border overflow-hidden transition-all hover:shadow-lg ${
                  canEdit ? "cursor-pointer hover:border-secondary/50" : ""
                } ${!item.available ? "opacity-60" : ""}`}
              >
                <div className="aspect-square bg-muted relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {item.is_popular && (
                      <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5">Popular</Badge>
                    )}
                    {item.is_new && (
                      <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">New</Badge>
                    )}
                  </div>
                  {!item.available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">Unavailable</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate">{item.name}</h3>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {categories?.find((c) => c.id === item.category_id)?.name}
                  </p>
                  <p className="text-sm font-semibold mt-1.5 text-secondary">
                    {formatPrice(item.price)}
                  </p>
                </div>
              </div>
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
