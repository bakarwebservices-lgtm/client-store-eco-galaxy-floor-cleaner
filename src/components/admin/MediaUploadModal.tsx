'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Upload, Search, Check, AlertCircle, Loader2, ImagePlus } from 'lucide-react';

export interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selected: { url: string; altText: string; id?: string }) => void;
  title?: string;
}

export function MediaUploadModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Select or Upload Media Asset',
}: MediaUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  // Upload Tab state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key listener (BUILD_STANDARDS 4.6)
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '30',
        ...(search ? { q: search } : {}),
      });
      const res = await fetch(`/api/media?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (err) {
      console.error('Failed to fetch media assets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, search]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit.');
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));

    // Autofill suggested alt text from filename if empty
    if (!altText) {
      const cleanName = selectedFile.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      setAltText(cleanName);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!file) {
      setUploadError('Please select a file to upload.');
      return;
    }

    if (!altText.trim()) {
      setUploadError('Alt text is required for accessibility & SEO.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('altText', altText.trim());

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || 'Upload failed.');
        setUploading(false);
        return;
      }

      // Success: pass to onSelect callback and close
      onSelect({
        url: data.asset.url,
        altText: data.asset.altText,
        id: data.asset.id,
      });
      onClose();
    } catch (err) {
      console.error('Upload failed', err);
      setUploadError('Network error during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmLibrarySelection = () => {
    if (!selectedAsset) return;
    onSelect({
      url: selectedAsset.url,
      altText: selectedAsset.altText || selectedAsset.filename,
      id: selectedAsset.id,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-modal-title"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/20">
          <div>
            <h2 id="media-modal-title" className="text-base font-bold text-foreground">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage media assets with required accessibility alt text
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-border bg-muted/10 px-5 pt-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === 'library'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Media Library
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === 'upload'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Upload New Image
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'library' ? (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by filename or alt text..."
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Grid of existing assets */}
              {loading ? (
                <div className="py-16 text-center text-xs text-muted-foreground animate-pulse">
                  Loading media library...
                </div>
              ) : assets.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {assets.map((asset) => {
                    const isSelected = selectedAsset?.id === asset.id;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setSelectedAsset(asset)}
                        className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/30 shadow-md'
                            : 'border-border hover:border-foreground/40 bg-muted/20'
                        }`}
                      >
                        <Image
                          src={asset.url}
                          alt={asset.altText || asset.filename}
                          fill
                          sizes="(max-width: 640px) 33vw, 20vw"
                          className="object-cover object-center"
                        />
                        {isSelected && (
                          <div className="absolute right-1.5 top-1.5 rounded-full bg-primary p-1 text-primary-foreground shadow">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {asset.altText || asset.filename}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center space-y-2">
                  <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground">No media assets found.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Upload your first asset
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Upload Tab */
            <form onSubmit={handleUploadSubmit} className="space-y-4 max-w-lg mx-auto">
              {uploadError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{uploadError}</p>
                </div>
              )}

              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/10 p-6 text-center cursor-pointer hover:bg-muted/20 hover:border-primary/50 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-xl border border-border shadow-sm">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      sizes="320px"
                      className="object-contain bg-background"
                    />
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/80 mb-2" />
                    <p className="text-xs font-semibold text-foreground">Click to choose an image</p>
                    <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG, WebP, GIF, SVG up to 5MB</p>
                  </>
                )}
              </div>

              {/* Mandatory Alt Text Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Accessibility Alt Text *
                </label>
                <input
                  type="text"
                  required
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="e.g. Vintage Leather Jacket front view in Cognac Brown"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[10px] text-muted-foreground">
                  Describes the image for screen readers and search engines (mandatory).
                </p>
              </div>

              <button
                type="submit"
                disabled={uploading || !file || !altText.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>{uploading ? 'Uploading & Processing...' : 'Upload & Insert Asset'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'library' && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/20">
            <span className="text-xs text-muted-foreground truncate max-w-[280px]">
              {selectedAsset ? `Selected: ${selectedAsset.filename}` : 'Select an image to insert'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedAsset}
                onClick={handleConfirmLibrarySelection}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                Insert Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
