import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, LayoutGrid, List } from "lucide-react";
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

type FilterType = "all" | "available" | "unavailable" | "popular" | "new" | "scheduled";

export default function MenuManagement() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: items, isLoading } = useAllMenuItems();
  const { data: categories } = useCategories();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");

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
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items..."
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]">
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
            <SelectTrigger className="w-[140px]">
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
        </div>

        {/* Items list */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_120px_100px_120px_100px] gap-4 px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
            <span>Item</span>
            <span>Category</span>
            <span>Price</span>
            <span>Badges</span>
            <span>Actions</span>
          </div>
          {filtered?.map((item) => (
            <MenuItemRow
              key={item.id}
              item={item}
              category={categories?.find((c) => c.id === item.category_id)}
              canEdit={canEdit}
              onEdit={() => navigate(`/menu/${item.id}`)}
            />
          ))}
          {filtered?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No menu items found
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
