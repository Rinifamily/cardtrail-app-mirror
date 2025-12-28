'use client';

import { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LocalCollectionItem } from '@cardtrail/shared-types';

interface CollectionListProps {
  items: LocalCollectionItem[];
  onEdit: (item: LocalCollectionItem) => void;
  onDelete: (id: string) => void;
  currency?: 'CNY' | 'USD' | 'JPY';
}

export function CollectionList({ items, onEdit, onDelete }: CollectionListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const formatCurrency = (amount: number, curr: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getGradeBadgeColor = (grade?: string) => {
    switch (grade) {
      case 'psa10':
        return 'bg-amber-500/20 text-amber-700 dark:text-amber-300';
      case 'psa9':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'psa8':
        return 'bg-green-500/20 text-green-700 dark:text-green-300';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      onDelete(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">
          持仓中暂无项目。可从搜索结果或卡牌详情页添加卡牌。
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="p-4 transition-colors hover:bg-accent/50">
          <div className="flex items-start justify-between gap-4">
            {/* Item Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Card #{item.cardId}</h3>
                {item.grade && (
                  <Badge variant="secondary" className={getGradeBadgeColor(item.grade)}>
                    {item.grade.toUpperCase()}
                  </Badge>
                )}
                {item.gradingCompany && (
                  <Badge variant="outline" className="text-xs">
                    {item.gradingCompany}
                  </Badge>
                )}
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="text-muted-foreground">数量：</span>{' '}
                  <span className="font-medium">{item.quantity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">购入价：</span>{' '}
                  <span className="font-medium">
                    {formatCurrency(item.purchasePrice, item.purchaseCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">日期：</span>{' '}
                  <span className="font-medium">{formatDate(item.purchaseDate)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">总计：</span>{' '}
                  <span className="font-semibold">
                    {formatCurrency(item.purchasePrice * item.quantity, item.purchaseCurrency)}
                  </span>
                </div>
              </div>

              {item.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(item)}
                className="h-8 w-8"
                aria-label="编辑项目"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(item.id!)}
                className={`h-8 w-8 ${
                  deleteConfirm === item.id
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'hover:text-red-500'
                }`}
                aria-label={deleteConfirm === item.id ? '确认删除' : '删除项目'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
