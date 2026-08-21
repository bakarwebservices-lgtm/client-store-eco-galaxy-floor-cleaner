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
  ArrowLeft,
} from 'lucide-react';

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

  const openMessageModal = (msg: ContactMessage) => {
    setActiveMessage(msg);
    if (!msg.isRead) {
      handleToggleRead(msg, true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Admin Hub</span>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold leading-tight">Customer Messages</h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {notification && (
          <div
            className={`rounded-xl border p-4 text-xs font-medium flex items-center justify-between ${
              notification.type === 'success'
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            <span>{notification.text}</span>
            <button onClick={() => setNotification(null)} className="text-xs font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sender, email, subject, message..."
              className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded px-3 py-1 font-semibold transition-colors ${
                filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded px-3 py-1 font-semibold transition-colors ${
                filter === 'unread' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setFilter('read')}
              className={`rounded px-3 py-1 font-semibold transition-colors ${
                filter === 'read' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Read
            </button>
          </div>
        </div>

        {/* Messages List */}
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center space-y-3">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto" />
            <h2 className="text-sm font-bold text-foreground">Inbox is empty</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Inbound inquiries from your storefront contact form will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm divide-y divide-border">
            {messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => openMessageModal(msg)}
                className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-muted/40 transition-colors ${
                  !msg.isRead ? 'bg-primary/5 font-semibold' : ''
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    {!msg.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                    <span className="text-xs font-bold text-foreground">{msg.name}</span>
                    <span className="text-xs text-muted-foreground">({msg.email})</span>
                  </div>

                  <div className="text-xs text-foreground">
                    <span className="font-bold">{msg.subject || 'General Inquiry'}</span>
                    <span className="text-muted-foreground"> — {msg.message.substring(0, 100)}...</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                  <span>
                    {new Date(msg.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={togglingId === msg.id}
                      onClick={() => handleToggleRead(msg)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title={msg.isRead ? 'Mark as unread' : 'Mark as read'}
                    >
                      <CheckCircle className={`h-4 w-4 ${msg.isRead ? 'text-muted-foreground' : 'text-primary'}`} />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === msg.id}
                      onClick={() => handleDelete(msg.id, msg.name)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Message Modal */}
      {activeMessage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="message-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h2 id="message-modal-title" className="text-base font-bold text-foreground">
                  {activeMessage.subject || 'Customer Inquiry'}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>From: <strong className="text-foreground">{activeMessage.name}</strong></span>
                  <span>•</span>
                  <span>{new Date(activeMessage.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveMessage(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sender Meta Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-muted/30 p-4 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <a href={`mailto:${activeMessage.email}`} className="text-foreground hover:underline truncate">
                  {activeMessage.email}
                </a>
              </div>
              {activeMessage.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground">{activeMessage.phone}</span>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div className="rounded-2xl border border-border bg-background p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {activeMessage.message}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={() => handleDelete(activeMessage.id, activeMessage.name)}
                className="inline-flex items-center gap-1.5 text-xs text-destructive hover:underline font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleRead(activeMessage, false)}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Mark Unread
                </button>
                <a
                  href={`mailto:${activeMessage.email}?subject=Re: ${encodeURIComponent(activeMessage.subject || 'Your Store Inquiry')}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Reply via Email</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
