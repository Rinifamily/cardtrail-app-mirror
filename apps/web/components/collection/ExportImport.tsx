'use client';

import { useState, useRef } from 'react';
import { Download, Upload, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ExportImportProps<TExportPayload> {
  entityName?: string;
  downloadPrefix?: string;
  dedupeHints?: string[];
  onExport: () => Promise<TExportPayload>;
  onImport: (data: unknown) => Promise<{ added: number; updated: number; skipped: number }>;
}

const DEFAULT_HINTS = [
  'Items are deduplicated by (cardId + grade + purchaseDate)',
  'Newer items (by updatedAt) overwrite older ones',
  'Export regularly as backup before Phase 09 migration',
];

export function ExportImport<TExportPayload>({
  onExport,
  onImport,
  entityName = 'Collection · 持仓',
  downloadPrefix = 'cardtrail-collection',
  dedupeHints = DEFAULT_HINTS,
}: ExportImportProps<TExportPayload>) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    added: number;
    updated: number;
    skipped: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const data = await onExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${downloadPrefix}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export collection');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await onImport(data);
      setImportResult(result);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'SyntaxError') {
          setError('无效的 JSON 文件，请检查文件格式');
        } else if (err.name === 'StorageValidationError') {
          setError('验证错误：' + err.message);
        } else {
          setError(err.message);
        }
      } else {
        setError('导入持仓失败');
      }
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-lg font-semibold">Export & Import · 导入导出</h2>

      <div className="space-y-4">
        {/* Export Section */}
        <div className="flex items-start gap-4 rounded-lg border p-4">
          <FileJson className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="font-medium">Export {entityName}</h3>
              <p className="text-sm text-muted-foreground">
                Download your {entityName.toLowerCase()} as JSON for safekeeping · 导出 JSON 备份
              </p>
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? '导出中...' : '导出 JSON'}
            </Button>
          </div>
        </div>

        {/* Import Section */}
        <div className="flex items-start gap-4 rounded-lg border p-4">
          <Upload className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="font-medium">Import {entityName}</h3>
              <p className="text-sm text-muted-foreground">
                Upload JSON to restore or merge · 上传 JSON 合并数据
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id="import-file"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isImporting ? '导入中...' : '导入 JSON'}
              </Button>
            </div>
          </div>
        </div>

        {/* Import Result */}
        {importResult && (
          <div className="rounded-lg bg-green-500/10 p-4 text-sm">
            <p className="font-medium text-green-700 dark:text-green-300">导入成功</p>
            <ul className="mt-2 space-y-1 text-green-600 dark:text-green-400">
              <li>✓ 已添加：{importResult.added} 项</li>
              <li>✓ 已更新：{importResult.updated} 项</li>
              <li>✓ 已跳过：{importResult.skipped} 项（较旧或重复）</li>
            </ul>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
            <p className="font-medium">错误</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="rounded-lg bg-blue-500/10 p-4 text-xs text-blue-800 dark:text-blue-200">
          <p className="font-medium">💡 Import Behavior · 导入说明</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {dedupeHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
