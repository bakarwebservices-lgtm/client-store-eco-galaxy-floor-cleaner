'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Search,
  CheckCircle,
  Eye,
  Trash2,
  Mail,
  Phone,
  Calendar,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { BulkActionBar, BulkActionOption } from '@/components/admin/BulkActionBar';
import { safeFetch } from '@/lib/apiClient';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const dynamic = 'force-dynamic';

export default function AdminContactPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [activeMessage, setActiveMessage] = useState<ContactMessage | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/contact?search=${encodeURIComponent(search)}&filter=${filter}`
      );
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages(data.messages || []);
      setUnreadCount(data.unreadCount || 0);
      setSelectedIds([]);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error loading messages' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMessages();
  };

  const handleToggleRead = async (msg: ContactMessage, newStatus?: boolean) => {
    setTogglingId(msg.id);
    const targetStatus = typeof newStatus === 'boolean' ? newStatus : !msg.isRead;
    try {
      const res = await fetch(`/api/contact/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: targetStatus }),
      });
      if (!res.ok) throw new Error('Failed to update message status');

      fetchMessages();
      if (activeMessage?.id === msg.id) {
        setActiveMessage({ ...activeMessage, isRead: targetStatus });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete message from "${name}"?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/contact/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete message');

      setNotification({ type: 'success', text: 'Message deleted successfully.' });
      if (activeMessage?.id === id) setActiveMessage(null);
      fetchMessages();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (selectedIds.length === messages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(messages.map((m) => m.id));
    }
  };

  const handleExecuteBulkAction = async (actionKey: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);

    try {
      const { ok, error } = await safeFetch('/api/admin/contact/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          action: actionKey,
        }),
      });

      if (!ok) {
        setNotification({ type: 'error', text: error || 'Bulk action failed' });
      } else {
        setNotification({ type: 'success', text: 'Bulk message action completed successfully.' });
        await fetchMessages();
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'Bulk action failed' });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkActions: BulkActionOption[] = [
    { label: 'Mark Read', actionKey: 'MARK_READ', variant: 'success' },
    { label: 'Mark Unread', actionKey: 'MARK_UNREAD', variant: 'outline' },
    {
      label: 'Delete Selected',
      actionKey: 'DELETE',
      variant: 'destructive',
      icon: Trash2,
      confirmMessage: `Permanently delete ${selectedIds.length} selected inquiries?`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inbound Inquiries</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Read, filter, and reply to customer messages submitted through the storefront contact form.
          </p>
        </div>

        {unreadCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary w-fit">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {notification && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-medium ${
            notification.type === 'success'
              ? 'border border-success/30 bg-success/10 text-success'
              : 'border border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sender name, email, or content..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>

        <div className="flex rounded-lg border border-border bg-muted/40 p-1 text-xs">
          {(['all', 'unread', 'read'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                filter === tab
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading inquiries...</span>
          </div>
        ) : messages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={messages.length > 0 && selectedIds.length === messages.length}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all messages"
                      className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                    />
                  </th>
                  <th className="py-3 px-4">Sender</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {messages.map((msg) => {
                  const isSelected = selectedIds.includes(msg.id);
                  return (
                    <tr
                      key={msg.id}
                      className={`hover:bg-muted/20 transition-colors ${!msg.isRead ? 'font-semibold bg-muted/10' : ''} ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(msg.id)}
                          aria-label={`Select message from ${msg.name}`}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-foreground">{msg.name}</div>
                        <div className="text-[11px] text-muted-foreground font-normal">{msg.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-foreground line-clamp-1">{msg.subject || 'No Subject'}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1 font-normal mt-0.5">
                          {msg.message}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            !msg.isRead
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground font-normal'
                          }`}
                        >
                          {!msg.isRead ? 'Unread' : 'Read'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMessage(msg);
                              if (!msg.isRead) handleToggleRead(msg, true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleDelete(msg.id, msg.name)}
                            disabled={deletingId === msg.id}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
                            aria-label={`Delete message from ${msg.name}`}
                          >
                            {deletingId === msg.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">No customer inquiries found.</p>
          </div>
        )}
      </div>

      {/* Message Reader Modal */}
      {activeMessage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {activeMessage.subject || 'Store Inquiry'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    From: {activeMessage.name} &lt;{activeMessage.email}&gt;
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveMessage(null)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/30 p-3 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase">Phone</span>
                  <span className="font-medium text-foreground">{activeMessage.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase">Received</span>
                  <span className="font-medium text-foreground">{new Date(activeMessage.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Message Content</span>
                <div className="rounded-xl border border-border bg-background p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {activeMessage.message}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={() => handleToggleRead(activeMessage)}
                disabled={togglingId === activeMessage.id}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                {activeMessage.isRead ? 'Mark as Unread' : 'Mark as Read'}
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`mailto:${activeMessage.email}?subject=Re: ${encodeURIComponent(activeMessage.subject || 'Store Inquiry')}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Reply via Email</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={messages.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={() => setSelectedIds(messages.map((m) => m.id))}
        isAllSelected={selectedIds.length === messages.length}
        isLoading={isBulkLoading}
        actions={bulkActions}
        onExecuteAction={handleExecuteBulkAction}
      />
    </div>
  );
}
