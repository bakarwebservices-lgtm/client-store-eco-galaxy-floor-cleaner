'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';
import { safeFetch } from '@/lib/apiClient';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Check,
  AlertCircle,
  Loader2,
  MessageSquare,
} from 'lucide-react';

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
  hours: string;
  storeName: string;
}

export function ContactClient({ info }: { info: ContactInfo }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      const { ok, data, error } = await safeFetch<any>('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          subject: subject || undefined,
          message,
        }),
      });

      if (!ok) {
        setResult({
          type: 'error',
          text: error || 'Failed to send message. Please try again.',
        });
      } else {
        setResult({
          type: 'success',
          text: data?.message || 'Your message has been sent successfully!',
        });
        setName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
      }
    } catch (err: any) {
      setResult({
        type: 'error',
        text: err?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Contact Us' }]} />

      {/* Header Banner */}
      <div className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-sm space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Get in Touch</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          How Can We Help You?
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Have an inquiry regarding an order, bulk purchasing, product sizing, or partnerships? Reach out below and our support team will respond within 24 hours.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-foreground">Send Us a Message</h2>

          {result && (
            <div
              className={`flex items-start gap-2.5 rounded-2xl p-4 text-xs ${
                result.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-medium'
                  : 'bg-destructive/10 border border-destructive/20 text-destructive'
              }`}
            >
              {result.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{result.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="block text-xs font-semibold text-foreground">
                  Full Name *
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  aria-required="true"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="contact-email" className="block text-xs font-semibold text-foreground">
                  Email Address *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  aria-required="true"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="space-y-1.5">
                <label htmlFor="contact-phone" className="block text-xs font-semibold text-foreground">
                  Phone / WhatsApp (Optional)
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label htmlFor="contact-subject" className="block text-xs font-semibold text-foreground">
                  Subject (Optional)
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Order Tracking Inquiry"
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label htmlFor="contact-msg" className="block text-xs font-semibold text-foreground">
                Message Content *
              </label>
              <textarea
                id="contact-msg"
                rows={5}
                required
                aria-required="true"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your inquiry in detail (order number, questions, etc.)..."
                className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Send Message</span>
            </button>
          </form>
        </div>

        {/* Right 1 Col: Contact Info & Hours */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-foreground">Direct Contact</h2>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Email Us</span>
                  <a href={`mailto:${info.email}`} className="text-muted-foreground hover:text-primary transition-colors">
                    {info.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Call or WhatsApp</span>
                  <a href={`tel:${info.phone}`} className="text-muted-foreground hover:text-primary transition-colors">
                    {info.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Support Hours</span>
                  <span className="text-muted-foreground">{info.hours}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Location</span>
                  <span className="text-muted-foreground">{info.address}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-2 text-center">
            <h3 className="text-xs font-bold text-foreground">Need quick answers?</h3>
            <p className="text-[11px] text-muted-foreground">
              Check our Frequently Asked Questions for instant information on delivery times and tracking.
            </p>
            <Link
              href="/faq"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors mt-2"
            >
              Browse FAQ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
