'use client';

import React from 'react';
import { CheckSquare, Square, X, Loader2 } from 'lucide-react';

export interface BulkActionOption {
  label: string;
  actionKey: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline' | 'success';
  confirmMessage?: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  isLoading?: boolean;
  actions: BulkActionOption[];
  onExecuteAction: (actionKey: string) => void;
  extraControls?: React.ReactNode;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  isAllSelected = false,
  isLoading = false,
  actions,
  onExecuteAction,
  extraControls,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <aside
      aria-label="Bulk selection actions"
      className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-md text-card-foreground animate-in slide-in-from-bottom-5 duration-200 max-w-4xl w-full justify-between">
        {/* Left: Selection Counter & Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 px-2 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {selectedCount}
            </span>
            <span className="text-xs font-semibold text-foreground">
              selected of {totalCount}
            </span>
          </div>

          {onSelectAll && selectedCount < totalCount && (
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs text-primary hover:underline font-medium ml-1"
            >
              Select all {totalCount}
            </button>
          )}
        </div>

        {/* Middle/Right: Action Buttons & Extra Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {extraControls}

          {actions.map((act) => {
            const Icon = act.icon;
            const isDestructive = act.variant === 'destructive';
            const isSuccess = act.variant === 'success';

            let btnClass = 'bg-muted hover:bg-muted/80 text-foreground border-border';
            if (isDestructive) {
              btnClass = 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground';
            } else if (isSuccess) {
              btnClass = 'bg-success/15 text-success border-success/30 hover:bg-success hover:text-success-foreground';
            } else if (act.variant === 'default') {
              btnClass = 'bg-primary text-primary-foreground hover:bg-primary-hover border-primary';
            }

            return (
              <button
                key={act.actionKey}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  if (act.confirmMessage) {
                    if (window.confirm(act.confirmMessage)) {
                      onExecuteAction(act.actionKey);
                    }
                  } else {
                    onExecuteAction(act.actionKey);
                  }
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 ${btnClass}`}
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  Icon && <Icon className="h-3.5 w-3.5" />
                )}
                <span>{act.label}</span>
              </button>
            );
          })}

          {/* Deselect / Close button */}
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1"
            title="Deselect all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
