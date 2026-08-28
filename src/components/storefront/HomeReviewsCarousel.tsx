'use client';

import React from 'react';
import { Star, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface HomeReviewItem {
  id: string;
  author: string;
  city: string;
  rating: number;
  date: string;
  title: string;
  content: string;
  verified: boolean;
}

const DEFAULT_REVIEWS: HomeReviewItem[] = [
  {
    id: '1',
    author: 'Ayesha Malik',
    city: 'Lahore (DHA)',
    rating: 5,
    date: '3 days ago',
    title: 'Fragrance lasts all day long!',
    content: 'The lavender smell is very refreshing and not overwhelming like cheap chemicals. My marble floors look shiny without any sticky residue. Delivered in 2 days via COD.',
    verified: true,
  },
  {
    id: '2',
    author: 'Mohammad Farooq',
    city: 'Karachi (Clifton)',
    rating: 5,
    date: '1 week ago',
    title: 'Value pack is 100% worth it',
    content: 'Ordered the 3-bottle pack. One bottle easily lasts over a month because you only need 1-2 capfuls in a bucket. Highly recommended for daily floor cleaning.',
    verified: true,
  },
  {
    id: '3',
    author: 'Dr. Saima Rehman',
    city: 'Islamabad (F-8)',
    rating: 5,
    date: '2 weeks ago',
    title: 'Excellent on wooden & tile floors',
    content: 'We have both ceramic tiles and wooden flooring. It cleans stubborn spots without damaging the polish or dulling the shine. WhatsApp customer support was very helpful.',
    verified: true,
  },
  {
    id: '4',
    author: 'Zubair Khan',
    city: 'Rawalpindi (Bahria Town)',
    rating: 5,
    date: '2 weeks ago',
    title: 'Best floor cleaner I have tried in Pakistan',
    content: 'Much better than supermarket brands. The bottle quality and cap measurement are very convenient. Free delivery and paid cash on delivery smoothly.',
    verified: true,
  },
  {
    id: '5',
    author: 'Fatima Tariq',
    city: 'Faisalabad',
    rating: 5,
    date: '3 weeks ago',
    title: 'Great fragrance and spotless clean',
    content: 'My kids spill juice and grease in the kitchen regularly. A quick mop with Eco Galaxy removes stains in one swipe. Will definitely reorder the 5-bottle pack next.',
    verified: true,
  },
];

export function HomeReviewsCarousel({ reviews = [] }: { reviews?: HomeReviewItem[] }) {
  const displayReviews = reviews && reviews.length > 0 ? reviews : DEFAULT_REVIEWS;

  return (
    <section className="bg-[#f4f6f0] py-16 lg:py-20" id="reviews">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verified Customer Reviews</span>
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              Loved by Homes Across Pakistan
            </h2>
          </div>

          {/* Rating Summary Pill */}
          <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 border border-border/80 shadow-sm w-fit">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <div className="text-xs font-bold text-foreground">
              <span>4.9 / 5.0 Rating</span>
              <span className="text-muted-foreground font-normal ml-1">({displayReviews.length * 150}+ Reviews)</span>
            </div>
          </div>
        </div>

        {/* Reviews Container: Vertically scrollable on mobile (compact height), 3-col grid on desktop */}
        <div className="max-h-[460px] overflow-y-auto space-y-4 pr-1 md:max-h-none md:overflow-visible md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
          {displayReviews.map((review) => (
            <div
              key={review.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex text-amber-500">
                    {[...Array(review.rating || 5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{review.date}</span>
                </div>

                <h3 className="text-sm font-bold text-foreground mb-2">
                  &ldquo;{review.title}&rdquo;
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {review.content}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">{review.author}</p>
                  <p className="text-[11px] text-muted-foreground">{review.city}</p>
                </div>
                {review.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    <CheckCircle2 className="h-3 w-3" /> Verified Buyer
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
