'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MigrationBanner } from '@/components/collection/MigrationBanner';
import { PortfolioSummary } from '@/components/collection/PortfolioSummary';
import { CollectionList } from '@/components/collection/CollectionList';
import { AddItemDialog } from '@/components/collection/AddItemDialog';
import { ExportImport } from '@/components/collection/ExportImport';
import { FilterBar } from '@/components/collection/FilterBar';
import { getCollectionStore } from '@/lib/storage/local-collection-store';
import type { LocalCollectionItem } from '@cardtrail/shared-types';

export function CollectionContent() {
  const [items, setItems] = useState<LocalCollectionItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LocalCollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LocalCollectionItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  // Load collection items - wrapped in useCallback to prevent infinite loops
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const store = getCollectionStore();
      const data = await store.list();
      setItems(data);
    } catch (error) {
      console.error('Failed to load collection:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();

    // Listen for cross-tab changes
    const handleCollectionChange = () => {
      loadItems();
    };

    window.addEventListener('collection-changed', handleCollectionChange);
    return () => {
      window.removeEventListener('collection-changed', handleCollectionChange);
    };
  }, [loadItems]);

  // Filter items based on search and grade
  useEffect(() => {
    let filtered = items;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.cardId.toString().includes(term) ||
          (item.notes && item.notes.toLowerCase().includes(term))
      );
    }

    if (gradeFilter) {
      filtered = filtered.filter((item) => item.grade === gradeFilter);
    }

    setFilteredItems(filtered);
  }, [items, searchTerm, gradeFilter]);

  // Calculate portfolio metrics
  const metrics = items.reduce(
    (acc, item) => {
      const totalCost = item.purchasePrice * item.quantity;
      // For now, use purchase price as estimated value
      // Phase 01 integration will fetch real prices
      const estimatedValue = totalCost;

      return {
        totalInvested: acc.totalInvested + totalCost,
        estimatedValue: acc.estimatedValue + estimatedValue,
        holdingsCount: acc.holdingsCount + 1,
      };
    },
    { totalInvested: 0, estimatedValue: 0, holdingsCount: 0 }
  );

  const handleAddItem = async (item: Omit<LocalCollectionItem, 'id' | 'addedAt'>) => {
    try {
      const store = getCollectionStore();
      if (editingItem) {
        await store.update(editingItem.id!, item);
      } else {
        await store.upsert(item);
      }
      await loadItems();
      setIsDialogOpen(false);
      setEditingItem(null);
    } catch (error) {
      throw error;
    }
  };

  const handleEditItem = (item: LocalCollectionItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const store = getCollectionStore();
      await store.remove(id);
      await loadItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleExport = async () => {
    const store = getCollectionStore();
    return await store.export();
  };

  const handleImport = async (data: unknown) => {
    const store = getCollectionStore();
    const result = await store.import(data);
    await loadItems();
    return result;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-48 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">持仓</h1>
          <p className="text-muted-foreground">追踪你的投资组合并管理持仓</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          添加持仓
        </Button>
      </div>

      {/* Migration Banner */}
      <MigrationBanner />

      {/* Portfolio Summary */}
      <PortfolioSummary
        totalInvested={metrics.totalInvested}
        estimatedValue={metrics.estimatedValue}
        holdingsCount={metrics.holdingsCount}
        currency="CNY"
      />

      {/* Filter Bar */}
      {items.length > 0 && (
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          gradeFilter={gradeFilter}
          onGradeChange={setGradeFilter}
        />
      )}

      {/* Collection List */}
      <CollectionList
        items={filteredItems}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        currency="CNY"
      />

      {/* Export/Import */}
      {items.length > 0 && <ExportImport onExport={handleExport} onImport={handleImport} />}

      {/* Add/Edit Dialog */}
      <AddItemDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingItem(null);
        }}
        onSave={handleAddItem}
        initialData={editingItem}
      />
    </div>
  );
}
