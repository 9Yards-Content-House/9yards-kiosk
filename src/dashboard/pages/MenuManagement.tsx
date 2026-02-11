import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useAllMenuItems, useCategories } from "@shared/hooks/useMenu";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import MenuItemRow from "../components/MenuItemRow";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";

export default function MenuManagement() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: items, isLoading } = useAllMenuItems();
  const { data: categories } = useCategories();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const canEdit = role ? hasPermission(role, "menu:update") : false;
  const canCreate = role ? hasPermission(role, "menu:create") : false;

  const filtered = items?.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || item.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">
            {items?.length || 0} items across {categories?.length || 0} categories
          </p>
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
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-10 px-3 rounded-md border bg-background text-sm"
        >
          <option value="all">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Items list */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_120px_100px_80px_80px] gap-4 px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
          <span>Item</span>
          <span>Category</span>
          <span>Price</span>
          <span>Available</span>
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
  );
}
