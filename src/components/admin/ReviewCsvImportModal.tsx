'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Star,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { safeFetch } from '@/lib/apiClient';
import { ValidatedReviewRow } from '@/lib/csv/reviewImport';

interface ReviewCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ValidationReport {
  totalRows: number;
  validCount: number;
  failedCount: number;
  errors: { row: number; error: string }[];
  previewRows: ValidatedReviewRow[];
}

interface ImportSummary {
  importedCount: number;
  failedCount: number;
  errors: { row: number; error: string }[];
  message: string;
}

export function ReviewCsvImportModal({
  isOpen,
  onClose,
  onSuccess,
}: ReviewCsvImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'summary'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    setFile(selected);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      await validateCsv(text);
    };
    reader.readAsText(selected);
  };

  const validateCsv = async (rawCsv: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/reviews/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: rawCsv,
          mode: 'validate',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to validate CSV file');
      }

      setValidation(data);
      setStep('preview');
    } catch (err: any) {
      setError(err?.message || 'Error processing CSV');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!csvContent) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/reviews/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          mode: 'commit',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import reviews');
      }

      setSummary(data);
      setStep('summary');
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Error committing import');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setCsvContent('');
    setValidation(null);
    setSummary(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 id="import-modal-title" className="text-base font-bold text-foreground">
              Import Customer Reviews (CSV)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Supports standard Shopify, Judge.me, and Loox product review exports.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Upload Dropzone */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-10 text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Click to upload CSV file</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Must include rating (1-5) and product identifier (handle/slug or SKU).
                </p>
                <span className="mt-3 inline-block rounded-lg bg-card border border-border px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm">
                  .CSV files only
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs space-y-2">
                <h4 className="font-bold text-foreground">Supported CSV Columns:</h4>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <strong className="text-foreground">Product:</strong> handle, slug, or sku
                  </div>
                  <div>
                    <strong className="text-foreground">Rating:</strong> 1 to 5 stars
                  </div>
                  <div>
                    <strong className="text-foreground">Reviewer:</strong> name, author, email
                  </div>
                  <div>
                    <strong className="text-foreground">Content:</strong> title, body / review_text
                  </div>
                  <div>
                    <strong className="text-foreground">Verified:</strong> verified_buyer, yes/true/1
                  </div>
                  <div>
                    <strong className="text-foreground">Photos:</strong> picture_urls, images
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Validation Table */}
          {step === 'preview' && validation && (
            <div className="space-y-5">
              {/* Validation Summary Stat Pills */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                  <div className="text-lg font-extrabold text-foreground mt-0.5">
                    {validation.totalRows}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 shadow-sm">
                  <div className="text-xs text-emerald-700 font-semibold">Ready to Import</div>
                  <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                    {validation.validCount}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 shadow-sm">
                  <div className="text-xs text-amber-700 font-semibold">Errors / Unmapped</div>
                  <div className="text-lg font-extrabold text-amber-700 mt-0.5">
                    {validation.failedCount}
                  </div>
                </div>
              </div>

              {/* Error Warnings List if any */}
              {validation.errors.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5 max-h-32 overflow-y-auto">
                  <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Unmatched Rows ({validation.errors.length}):</span>
                  </div>
                  <ul className="text-[11px] text-amber-900 list-disc pl-4 space-y-0.5">
                    {validation.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                    {validation.errors.length > 10 && (
                      <li>...and {validation.errors.length - 10} more rows with errors</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Sample Review Preview Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground">
                  Preview Sample ({validation.previewRows.length} rows):
                </h4>
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase">
                      <tr>
                        <th className="p-2.5">Product Match</th>
                        <th className="p-2.5">Reviewer</th>
                        <th className="p-2.5">Rating</th>
                        <th className="p-2.5">Title & Body</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {validation.previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/10">
                          <td className="p-2.5">
                            {row.matchedProductName ? (
                              <div>
                                <span className="font-bold text-foreground block truncate max-w-[150px]">
                                  {row.matchedProductName}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {row.productHandle || row.productSku}
                                </span>
                              </div>
                            ) : (
                              <span className="text-destructive font-semibold text-[11px]">
                                Unmatched Product
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <div className="font-semibold text-foreground">{row.reviewerName}</div>
                            {row.isVerified && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                <span>Verified</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                              <span>{row.rating}</span>
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            </div>
                          </td>
                          <td className="p-2.5 max-w-[220px]">
                            {row.title && (
                              <div className="font-bold text-foreground truncate">{row.title}</div>
                            )}
                            <div className="text-[11px] text-muted-foreground truncate font-normal">
                              {row.body || 'No text content'}
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            {row.matchedProductId ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-bold text-destructive">
                                Skipped
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Summary Completion */}
          {step === 'summary' && summary && (
            <div className="py-8 text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mx-auto">
                <CheckCircle className="h-8 w-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Import Complete!</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {summary.message}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 max-w-sm mx-auto text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Imported Reviews:</span>
                  <strong className="text-emerald-700 font-bold">{summary.importedCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skipped / Failed:</span>
                  <strong className="text-foreground">{summary.failedCount}</strong>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold text-amber-700">Pending Moderation</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
          {step === 'upload' && (
            <div className="flex w-full items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Choose Another File
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={loading || !validation || validation.validCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <span>Import {validation?.validCount || 0} Reviews</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'summary' && (
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Import Another CSV</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover"
              >
                View Moderation Queue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
