'use client';

import { AlertCircle } from 'lucide-react';

export function MigrationBanner() {
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
            本地数据存储
          </p>
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            您的收藏数据暂存在浏览器中。Phase 09 上线后将支持云端同步，届时可将数据迁移到云端保存。
          </p>
          <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100">
            建议定期导出备份
          </p>
        </div>
      </div>
    </div>
  );
}
