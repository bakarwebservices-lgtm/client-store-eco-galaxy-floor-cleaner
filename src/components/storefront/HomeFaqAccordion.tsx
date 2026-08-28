'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export interface HomeFaqItem {
  id?: string;
  question: string;
  answer: string;
}

const DEFAULT_FAQS: HomeFaqItem[] = [
  {
    question: 'What bottle sizes and pack options are available?',
    answer: 'Eco Galaxy is packaged in standard 1 Liter bottles. You can choose the 1 Liter Starter Pack (Rs. 649), the 3 Liters Value Pack (Rs. 1,499 — Save 35%), or the 5 Liters Best-Value Pack (Rs. 2,299) with Free Delivery across Pakistan.',
  },
  {
    question: 'How do I use and dilute Eco Galaxy Floor Cleaner?',
    answer: 'Add 1 to 2 capfuls of Eco Galaxy into a standard half-bucket (approx. 4–5 liters) of water. Mop your floor normally. No extra rinsing is required, and the floor will dry streak-free with a pleasant lavender aroma.',
  },
  {
    question: 'Is Cash on Delivery (COD) available for my city?',
    answer: 'Yes! We provide Cash on Delivery all across Pakistan, including Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, and all other major cities and towns. You only pay when your parcel arrives.',
  },
  {
    question: 'Is it safe for marble, tile, ceramic, and wooden floors?',
    answer: 'Yes. Eco Galaxy Floor Cleaner is specially balanced to be safe and gentle on polished marble, granite, ceramic tiles, terrazzo, and sealed hardwood flooring without leaving residue or dulling surface gloss.',
  },
  {
    question: 'How long does delivery take?',
    answer: 'Orders are dispatched within 24 hours. Delivery typically takes 2 to 4 business days depending on your city.',
  },
  {
    question: 'How can I contact customer support or order via WhatsApp?',
    answer: 'You can tap the WhatsApp button on our site or message us directly at 0346 4815775 for quick order booking, order status, or product guidance.',
  },
];

export function HomeFaqAccordion({ faqs = [] }: { faqs?: HomeFaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const displayFaqs = faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS;

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="bg-white py-20 border-t border-border" id="faq">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Help &amp; Questions</span>
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Everything you need to know about Eco Galaxy Floor Cleaner and delivery across Pakistan.
          </p>
        </div>

        <div className="space-y-3">
          {displayFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.id || idx}
                className="overflow-hidden rounded-2xl border border-border/80 bg-[#fafbf9] transition-all hover:border-primary/40"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-foreground transition-colors hover:text-primary"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-primary transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-primary' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
