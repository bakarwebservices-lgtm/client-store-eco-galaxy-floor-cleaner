'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Upload, Search, Check, AlertCircle, Loader2, ImagePlus, Film, CheckSquare, Plus } from 'lucide-react';

export interface SelectedMediaItem {
  url: string;
  altText: string;
  id?: string;
  mimeType?: string;
}

export interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selected: SelectedMediaItem) => void;
  onSelectMultiple?: (selected: SelectedMediaItem[]) => void;
  title?: string;
  allowMultiple?: boolean;
}

interface QueuedFile {
  file: File;
  previewUrl: string;
  altText: string;
  isVideo: boolean;
}

export function MediaUploadModal({
  isOpen,
  onClose,
  onSelect,
  onSelectMultiple,
  title = 'Select or Upload Media Assets',
  allowMultiple = true,
}: MediaUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);

  // Multi-file upload queue & progress
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key listener
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
        limit: '50',
        ...(search ? { q: search } : {}),
      });
      const res = await fetch(`/api/media?${params.toString()}`);
      if (res.ok) {
        const text = await res.text().catch(() => '');
        try {
          const data = JSON.parse(text);
          setAssets(data.assets || []);
        } catch {
          console.warn('Failed to parse media assets JSON response');
        }
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
      setSelectedAssets([]);
      setQueuedFiles([]);
      setUploadError(null);
      setUploadProgressText('');
    }
  }, [isOpen, search]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validQueued: QueuedFile[] = [];

    for (const f of files) {
      if (f.size > 50 * 1024 * 1024) {
        setUploadError(`File "${f.name}" exceeds the 50MB maximum supported limit (${(f.size / 1024 / 1024).toFixed(1)}MB).`);
        return;
      }

      const isVideo = f.type.startsWith('video/') || f.name.match(/\.(mp4|webm|mov|ogg|m4v)$/i) !== null;
      const cleanName = f.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();

      validQueued.push({
        file: f,
        previewUrl: URL.createObjectURL(f),
        altText: cleanName,
        isVideo,
      });
    }

    if (!allowMultiple) {
      setQueuedFiles(validQueued.slice(0, 1));
    } else {
      setQueuedFiles((prev) => [...prev, ...validQueued]);
    }
  };

  const handleRemoveQueuedFile = (index: number) => {
    setQueuedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateQueuedAlt = (index: number, newAlt: string) => {
    setQueuedFiles((prev) => {
      const copy = [...prev];
      copy[index].altText = newAlt;
      return copy;
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (queuedFiles.length === 0) {
      setUploadError('Please select at least one image or video to upload.');
      return;
    }

    setUploading(true);
    const successfullyUploaded: SelectedMediaItem[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < queuedFiles.length; i++) {
        const item = queuedFiles[i];
        const file = item.file;
        const fileIndexLabel = `(${i + 1}/${queuedFiles.length})`;
        setUploadProgressText(`Uploading ${fileIndexLabel} "${file.name}"...`);

        try {
          // 1. Request Signed Upload URL for direct client-to-storage upload (bypasses Vercel 4.5MB serverless limit)
          const signRes = await fetch('/api/upload/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              mimeType: file.type || 'image/jpeg',
            }),
          });

          const signText = await signRes.text().catch(() => '');
          let signData: any = null;
          try {
            signData = JSON.parse(signText);
          } catch {
            // Non-JSON response
          }

          if (!signRes.ok) {
            if (signRes.status === 413) {
              throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max direct payload limit is 50MB.`);
            }
            throw new Error(signData?.error || `Authorization error (${signRes.status}): ${signText.slice(0, 100)}`);
          }

          let uploadedPublicUrl = '';

          if (signData.direct && signData.uploadUrl) {
            // Direct client-to-Supabase Storage upload via signed URL (PUT)
            setUploadProgressText(`Streaming ${fileIndexLabel} "${file.name}" directly to Supabase Storage...`);

            const directRes = await fetch(signData.uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': file.type || 'application/octet-stream',
              },
              body: file,
            });

            if (!directRes.ok) {
              const directErrText = await directRes.text().catch(() => '');
              throw new Error(`Supabase direct upload failed (${directRes.status}): ${directErrText.slice(0, 120)}`);
            }

            uploadedPublicUrl = signData.publicUrl;

            // Record the uploaded asset in the database
            const recordRes = await fetch('/api/upload/record', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: uploadedPublicUrl,
                altText: item.altText || file.name,
                filename: file.name,
                mimeType: file.type || 'image/jpeg',
                sizeBytes: file.size,
              }),
            });

            const recordText = await recordRes.text().catch(() => '');
            let recordData: any = null;
            try {
              recordData = JSON.parse(recordText);
            } catch {
              // fallback
            }

            if (!recordRes.ok) {
              console.warn('MediaAsset database logging warning:', recordText);
            }

            successfullyUploaded.push({
              url: uploadedPublicUrl,
              altText: item.altText || file.name,
              id: recordData?.asset?.id,
              mimeType: file.type,
            });
          } else {
            // Fallback proxy upload via /api/upload (for local disk development adapter)
            setUploadProgressText(`Uploading ${fileIndexLabel} "${file.name}" via local adapter...`);
            const formData = new FormData();
            formData.append('file', file);
            if (item.altText) formData.append('altText', item.altText);

            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            const uploadText = await uploadRes.text().catch(() => '');
            let uploadData: any = null;
            try {
              uploadData = JSON.parse(uploadText);
            } catch {
              // Non-JSON
            }

            if (!uploadRes.ok) {
              if (uploadRes.status === 413) {
                throw new Error(`File "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds serverless limit of 4.5MB.`);
              }
              throw new Error(uploadData?.error || `Upload failed (${uploadRes.status}): ${uploadText.slice(0, 120)}`);
            }

            const rawAsset = uploadData.asset || (uploadData.assets && uploadData.assets[0]);
            if (!rawAsset?.url) {
              throw new Error('Upload succeeded but no public URL was returned from server.');
            }

            successfullyUploaded.push({
              url: rawAsset.url,
              altText: item.altText || rawAsset.altText || file.name,
              id: rawAsset.id,
              mimeType: rawAsset.mimeType || file.type,
            });
          }
        } catch (fileErr: any) {
          console.error(`Error uploading "${file.name}":`, fileErr);
          errors.push(`"${file.name}": ${fileErr?.message || 'Upload failed'}`);
        }
      }

      // Pass successfully uploaded assets to caller
      if (successfullyUploaded.length > 0) {
        if (onSelectMultiple && allowMultiple) {
          onSelectMultiple(successfullyUploaded);
        } else {
          onSelect(successfullyUploaded[0]);
        }

        if (errors.length === 0) {
          onClose();
        } else {
          setUploadError(`Uploaded ${successfullyUploaded.length} item(s) successfully. However, ${errors.length} failed:\n${errors.join('\n')}`);
        }
      } else {
        setUploadError(errors.join('\n') || 'All file uploads failed.');
      }
    } catch (err: any) {
      console.error('Batch upload error:', err);
      setUploadError(err?.message || 'Network error during upload.');
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };

  const toggleLibrarySelection = (asset: any) => {
    if (!allowMultiple) {
      setSelectedAssets([asset]);
      return;
    }

    const exists = selectedAssets.some((a) => a.id === asset.id);
    if (exists) {
      setSelectedAssets(selectedAssets.filter((a) => a.id !== asset.id));
    } else {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };

  const handleConfirmLibrarySelection = () => {
    if (selectedAssets.length === 0) return;

    const formatted: SelectedMediaItem[] = selectedAssets.map((a) => ({
      url: a.url,
      altText: a.altText || a.filename,
      id: a.id,
      mimeType: a.mimeType,
    }));

    if (onSelectMultiple && allowMultiple) {
      onSelectMultiple(formatted);
    } else {
      onSelect(formatted[0]);
    }

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
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div>
            <h2 id="media-modal-title" className="text-base font-bold text-foreground">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct-to-Cloud Upload supports high-resolution images & videos up to 50MB each.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-border bg-muted/10 px-6 pt-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === 'library'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Media Library {assets.length > 0 && `(${assets.length})`}
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
            Upload Media {queuedFiles.length > 0 && `(${queuedFiles.length} ready)`}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'library' ? (
            <div className="space-y-4">
              {/* Search & Selection Counter */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search media by filename or alt text..."
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {selectedAssets.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary">
                    <CheckSquare className="h-4 w-4" />
                    {selectedAssets.length} selected
                  </span>
                )}
              </div>

              {/* Grid of existing assets */}
              {loading ? (
                <div className="py-16 text-center text-xs text-muted-foreground animate-pulse">
                  Loading media library...
                </div>
              ) : assets.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {assets.map((asset) => {
                    const isSelected = selectedAssets.some((a) => a.id === asset.id);
                    const isVideo = asset.mimeType?.startsWith('video/') || asset.url.match(/\.(mp4|webm|mov|ogg|m4v)$/i);

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggleLibrarySelection(asset)}
                        className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/40 shadow-md bg-primary/5'
                            : 'border-border hover:border-foreground/40 bg-muted/20'
                        }`}
                      >
                        {isVideo ? (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900 text-white p-2">
                            <Film className="h-7 w-7 text-primary mb-1" />
                            <span className="text-[10px] text-slate-300 font-mono text-center truncate w-full px-1">
                              {asset.filename}
                            </span>
                            <div className="absolute top-1.5 left-1.5 rounded bg-primary/90 px-1 py-0.5 text-[9px] font-bold text-white uppercase">
                              Video
                            </div>
                          </div>
                        ) : (
                          <Image
                            src={asset.url}
                            alt={asset.altText || asset.filename}
                            fill
                            sizes="(max-width: 640px) 50vw, 20vw"
                            className="object-cover object-center"
                          />
                        )}

                        {isSelected ? (
                          <div className="absolute right-1.5 top-1.5 rounded-full bg-primary p-1 text-primary-foreground shadow">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="absolute right-1.5 top-1.5 rounded-full bg-black/40 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="h-3.5 w-3.5" />
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 bg-black/75 p-1 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {asset.altText || asset.filename}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center space-y-2">
                  <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground">No media assets found in library.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Upload photos or videos now
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Upload Tab (Multi-file batch) */
            <form onSubmit={handleUploadSubmit} className="space-y-6">
              {uploadError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive whitespace-pre-line">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{uploadError}</p>
                </div>
              )}

              {/* Multi-file Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/10 p-8 text-center cursor-pointer hover:bg-muted/20 hover:border-primary/50 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={allowMultiple}
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <Upload className="h-10 w-10 text-primary/80 mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  Click or drag {allowMultiple ? 'multiple images & videos' : 'an image or video'} here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Direct upload supports JPEG, PNG, WebP, GIF, SVG, AVIF, MP4, WebM, MOV (Up to 50MB each)
                </p>
              </div>

              {/* Queue List */}
              {queuedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Selected Files ({queuedFiles.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setQueuedFiles([])}
                      className="text-xs text-destructive hover:underline"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                    {queuedFiles.map((q, idx) => (
                      <div
                        key={idx}
                        className="flex gap-3 items-center rounded-xl border border-border p-3 bg-muted/20"
                      >
                        {/* Thumbnail / Video */}
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                          {q.isVideo ? (
                            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-white">
                              <Film className="h-6 w-6 text-primary" />
                            </div>
                          ) : (
                            <Image
                              src={q.previewUrl}
                              alt="Preview"
                              fill
                              className="object-cover object-center"
                            />
                          )}
                        </div>

                        {/* Alt text field & remove */}
                        <div className="flex flex-1 flex-col justify-between space-y-1">
                          <input
                            type="text"
                            value={q.altText}
                            onChange={(e) => handleUpdateQueuedAlt(idx, e.target.value)}
                            placeholder="Alt text / description"
                            className="w-full rounded border border-input bg-background p-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="truncate max-w-[140px]">{q.file.name}</span>
                            <span>{(q.file.size / 1024 / 1024).toFixed(1)}MB</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedFile(idx)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || queuedFiles.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{uploadProgressText || `Uploading ${queuedFiles.length} file(s)...`}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Upload {queuedFiles.length} Item{queuedFiles.length > 1 ? 's' : ''} & Insert</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'library' && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3.5 bg-muted/20">
            <span className="text-xs text-muted-foreground truncate max-w-[320px]">
              {selectedAssets.length > 0
                ? `${selectedAssets.length} asset${selectedAssets.length > 1 ? 's' : ''} selected`
                : 'Select one or more items to insert'}
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedAssets.length === 0}
                onClick={handleConfirmLibrarySelection}
                className="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                Insert Selected ({selectedAssets.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
