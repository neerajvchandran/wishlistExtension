import React, { useState, useEffect, useMemo } from 'react';
import { WishlistItem, Category, CANONICAL_CATEGORIES } from '@everything-wishlist/shared';
import { Header } from './components/Header';
import { CategoryFilter } from './components/CategoryFilter';
import { WishlistGrid } from './components/WishlistGrid';
import { QuickPromptModal } from './components/QuickPromptModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { SettingsModal } from './components/SettingsModal';
import {
  fetchItems,
  createItem,
  updateItem,
  deleteItem,
  fetchCategories
} from './services/api';

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      startScreenCapture: () => void;
      onScreenCaptured: (callback: (imageBase64: string) => void) => () => void;
      onCaptureCancelled: (callback: () => void) => () => void;
      getBackendUrl: () => Promise<string>;
      setBackendUrl: (url: string) => Promise<string>;
    };
  }
}

export const App: React.FC = () => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIntent, setSelectedIntent] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load initial data
  const loadData = async () => {
    try {
      const [fetchedItems, fetchedCategories] = await Promise.all([
        fetchItems(),
        fetchCategories()
      ]);

      setItems(fetchedItems);

      if (fetchedCategories && fetchedCategories.length > 0) {
        setCategories(fetchedCategories);
      } else {
        // Fallback to canonical taxonomy
        setCategories(
          CANONICAL_CATEGORIES.map((c, i) => ({
            id: String(i + 1),
            name: c.name,
            slug: c.slug,
            icon: c.icon,
            subcategories: c.subcategories
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load wishlist data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to Electron screen capture completed event
    if (window.electronAPI?.onScreenCaptured) {
      const unsubscribe = window.electronAPI.onScreenCaptured((imageBase64) => {
        setCapturedImage(imageBase64);
      });
      return () => unsubscribe();
    }
  }, []);

  // Compute live category item counts
  const categoriesWithCounts = useMemo(() => {
    const countMap: Record<string, number> = {};
    items.forEach((item) => {
      const cat = item.category || 'Other';
      countMap[cat] = (countMap[cat] || 0) + 1;
    });

    return categories.map((cat) => ({
      ...cat,
      item_count: countMap[cat.name] || 0
    }));
  }, [categories, items]);

  // Filter items by search query, category, and intent
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search match
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        const matchesCategory = item.category?.toLowerCase().includes(query);
        const matchesSubcategory = item.subcategory?.toLowerCase().includes(query);
        const matchesNotes = item.user_prompt?.toLowerCase().includes(query);
        const matchesWebsite = item.source_website?.toLowerCase().includes(query);

        if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesSubcategory && !matchesNotes && !matchesWebsite) {
          return false;
        }
      }

      // Category match
      if (selectedCategory !== 'all') {
        if (item.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Intent match
      if (selectedIntent !== 'all') {
        if (item.intent !== selectedIntent) {
          return false;
        }
      }

      return true;
    });
  }, [items, searchQuery, selectedCategory, selectedIntent]);

  // Actions
  const handleTriggerCapture = () => {
    if (window.electronAPI?.startScreenCapture) {
      window.electronAPI.startScreenCapture();
    } else {
      // Browser demonstration fallback: let user pick an image or simulate a snip
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setCapturedImage(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  const handleSaveCapturedItem = async (newItemData: Partial<WishlistItem>) => {
    const saved = await createItem(newItemData);
    setItems((prev) => [saved, ...prev]);
    setCapturedImage(null);
  };

  const handleSaveItemModal = async (itemData: Partial<WishlistItem>) => {
    if (editingItem) {
      const updated = await updateItem(editingItem.id, itemData);
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      setEditingItem(null);
    } else {
      const created = await createItem(itemData);
      setItems((prev) => [created, ...prev]);
      setIsNewItemModalOpen(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white pb-16">
      {/* Header Bar */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onTriggerCapture={handleTriggerCapture}
        onOpenNewItem={() => setIsNewItemModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        totalItems={items.length}
      />

      {/* Category & Intent Filter Tabs */}
      <CategoryFilter
        categories={categoriesWithCounts}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedIntent={selectedIntent}
        onSelectIntent={setSelectedIntent}
        totalItemsCount={items.length}
      />

      {/* Main Wishlist Content */}
      <main className="flex-1 w-full mt-2">
        <WishlistGrid
          items={filteredItems}
          selectedCategory={selectedCategory}
          onEditItem={(item) => setEditingItem(item)}
          onDeleteItem={handleDeleteItem}
          onTriggerCapture={handleTriggerCapture}
          onOpenNewItem={() => setIsNewItemModalOpen(true)}
        />
      </main>

      {/* Quick Prompt Modal after Screen Snip */}
      {capturedImage && (
        <QuickPromptModal
          imageBase64={capturedImage}
          onClose={() => setCapturedImage(null)}
          onSave={handleSaveCapturedItem}
        />
      )}

      {/* Item Detail / Edit Modal */}
      {(editingItem || isNewItemModalOpen) && (
        <ItemDetailModal
          item={editingItem}
          isOpen={true}
          onClose={() => {
            setEditingItem(null);
            setIsNewItemModalOpen(false);
          }}
          onSave={handleSaveItemModal}
          onDelete={handleDeleteItem}
          categories={categories}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
