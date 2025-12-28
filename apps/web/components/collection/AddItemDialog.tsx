'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LocalCollectionItem } from '@cardtrail/shared-types';

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<LocalCollectionItem, 'id' | 'addedAt'>) => Promise<void>;
  initialData?: LocalCollectionItem | null;
}

export function AddItemDialog({ isOpen, onClose, onSave, initialData }: AddItemDialogProps) {
  const [formData, setFormData] = useState({
    cardId: initialData?.cardId?.toString() || '',
    quantity: initialData?.quantity?.toString() || '1',
    purchasePrice: initialData?.purchasePrice?.toString() || '',
    purchaseCurrency: initialData?.purchaseCurrency || 'CNY',
    purchaseDate: initialData?.purchaseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    grade: initialData?.grade || '',
    gradingCompany: initialData?.gradingCompany || '',
    notes: initialData?.notes || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const item = {
        cardId: parseInt(formData.cardId, 10),
        quantity: parseInt(formData.quantity, 10),
        purchasePrice: parseFloat(formData.purchasePrice),
        purchaseCurrency: formData.purchaseCurrency as 'CNY' | 'USD' | 'JPY',
        purchaseDate: new Date(formData.purchaseDate).toISOString(),
        grade: formData.grade || undefined,
        gradingCompany: formData.gradingCompany || undefined,
        notes: formData.notes || undefined,
      } as Omit<LocalCollectionItem, 'id' | 'addedAt'>;

      await onSave(item);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {initialData ? '编辑持仓项目' : '添加到持仓'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card ID */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              卡牌 ID <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.cardId}
              onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
              required
              min="1"
              placeholder="输入卡牌 ID"
            />
          </div>

          {/* Quantity & Price */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                数量 <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                min="1"
                max="999"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                购入价格 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  className="flex-1"
                />
                <select
                  value={formData.purchaseCurrency}
                  onChange={(e) => setFormData({ ...formData, purchaseCurrency: e.target.value as 'CNY' | 'USD' | 'JPY' })}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="CNY">CNY</option>
                  <option value="USD">USD</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>
          </div>

          {/* Purchase Date */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              购入日期 <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              required
            />
          </div>

          {/* Grade & Grading Company */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">评级</label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">选择评级</option>
                <option value="raw">裸卡</option>
                <option value="psa8">PSA 8</option>
                <option value="psa9">PSA 9</option>
                <option value="psa10">PSA 10</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">评级公司</label>
              <select
                value={formData.gradingCompany}
                onChange={(e) => setFormData({ ...formData, gradingCompany: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!formData.grade || formData.grade === 'raw'}
              >
                <option value="">选择公司</option>
                <option value="PSA">PSA</option>
                <option value="BGS">BGS</option>
                <option value="CGC">CGC</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium">备注（可选）</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              maxLength={500}
              rows={3}
              placeholder="添加关于此项目的备注..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {formData.notes.length}/500 字符
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
