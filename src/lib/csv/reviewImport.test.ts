import { describe, it, expect } from 'vitest';
import { parseCsvText, parseReviewCsv } from './reviewImport';

describe('Review CSV Parser', () => {
  it('parses basic and quoted RFC 4180 CSV rows correctly', () => {
    const csv = `product_handle,rating,reviewer_name,review_title,review_body,verified_buyer\n"luxury-silk-scarf",5,"Jane Doe","Great Quality!","This scarf is soft, elegant, and versatile.",true\n"leather-wallet",4,"John Smith","Solid wallet","Holds everything well, slightly stiff at first.",yes`;
    const res = parseReviewCsv(csv);

    expect(res.totalRows).toBe(2);
    expect(res.parseErrors).toHaveLength(0);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].productHandle).toBe('luxury-silk-scarf');
    expect(res.rows[0].rating).toBe(5);
    expect(res.rows[0].isVerified).toBe(true);
    expect(res.rows[0].title).toBe('Great Quality!');
    expect(res.rows[0].body).toBe('This scarf is soft, elegant, and versatile.');
    expect(res.rows[1].productHandle).toBe('leather-wallet');
    expect(res.rows[1].rating).toBe(4);
    expect(res.rows[1].isVerified).toBe(true);
  });

  it('handles Judge.me and Loox column aliases and SKU mapping', () => {
    const judgeMeCsv = `sku,score,author,headline,content,buyer_verified,picture_urls\n"SKU-100",5,"Alice","Stunning","Looks amazing in person",1,"https://cdn.example.com/p1.jpg https://cdn.example.com/p2.jpg"`;
    const res = parseReviewCsv(judgeMeCsv);

    expect(res.parseErrors).toHaveLength(0);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].productSku).toBe('SKU-100');
    expect(res.rows[0].rating).toBe(5);
    expect(res.rows[0].reviewerName).toBe('Alice');
    expect(res.rows[0].isVerified).toBe(true);
    expect(res.rows[0].images).toEqual([
      'https://cdn.example.com/p1.jpg',
      'https://cdn.example.com/p2.jpg',
    ]);
  });

  it('captures invalid star ratings and reports row-level errors', () => {
    const invalidCsv = `product_handle,rating,reviewer_name,review_body\n"product-1",invalid_rating,"Bob","Nice item"\n"product-2",6,"Charlie","Too many stars"\n"product-3",3,"David","Valid row"`;
    const res = parseReviewCsv(invalidCsv);

    expect(res.totalRows).toBe(3);
    expect(res.parseErrors).toHaveLength(2);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].productHandle).toBe('product-3');
    expect(res.rows[0].rating).toBe(3);
  });

  it('reports missing required rating or product identifier headers', () => {
    const noRatingCsv = `product_handle,reviewer_name,review_body\n"product-1","Bob","Nice"`;
    const res = parseReviewCsv(noRatingCsv);
    expect(res.parseErrors[0].error).toContain('Missing required "rating" column');

    const noProdCsv = `rating,reviewer_name,review_body\n5,"Bob","Nice"`;
    const res2 = parseReviewCsv(noProdCsv);
    expect(res2.parseErrors[0].error).toContain('Missing product identifier column');
  });
});
