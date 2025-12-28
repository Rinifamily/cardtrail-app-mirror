import { describe, it, expect } from 'vitest';
import {
  extractGradingCompany,
  extractGrade,
  detectLanguage,
  extractQuantity,
  parseEbayItem,
  validateTransaction,
} from '../parsers';
import type { EbayItem, NormalizedTransaction } from '../types';

describe('eBay Parsers', () => {
  describe('extractGradingCompany', () => {
    it('should detect PSA', () => {
      expect(extractGradingCompany('Pikachu PSA 10')).toBe('PSA');
      expect(extractGradingCompany('PSA 9 Charizard')).toBe('PSA');
      expect(extractGradingCompany('Pokemon psa 8')).toBe('PSA');
    });

    it('should detect BGS/Beckett', () => {
      expect(extractGradingCompany('Mewtwo BGS 9.5')).toBe('BGS');
      expect(extractGradingCompany('BECKETT 9 Lugia')).toBe('BGS');
      expect(extractGradingCompany('bgs 10')).toBe('BGS');
    });

    it('should detect CGC', () => {
      expect(extractGradingCompany('Lugia CGC 10')).toBe('CGC');
      expect(extractGradingCompany('CGC 9.5 Mew')).toBe('CGC');
    });

    it('should detect SGC', () => {
      expect(extractGradingCompany('Charizard SGC 10')).toBe('SGC');
      expect(extractGradingCompany('SGC 9')).toBe('SGC');
    });

    it('should return null for ungraded cards', () => {
      expect(extractGradingCompany('Raw Pikachu')).toBeNull();
      expect(extractGradingCompany('Pokemon Card Charizard')).toBeNull();
      expect(extractGradingCompany('Ungraded Mew')).toBeNull();
    });
  });

  describe('extractGrade', () => {
    it('should extract PSA grades', () => {
      expect(extractGrade('Pikachu PSA 10')).toBe(10);
      expect(extractGrade('PSA 9 Charizard')).toBe(9);
      expect(extractGrade('PSA 8 Mew')).toBe(8);
    });

    it('should extract BGS grades with decimals', () => {
      expect(extractGrade('Mewtwo BGS 9.5')).toBe(9.5);
      expect(extractGrade('BGS 8.5 Mew')).toBe(8.5);
      expect(extractGrade('BGS 10 Pikachu')).toBe(10);
    });

    it('should extract CGC grades', () => {
      expect(extractGrade('Lugia CGC 10')).toBe(10);
      expect(extractGrade('CGC 9.5 Charizard')).toBe(9.5);
    });

    it('should handle GRADE keyword', () => {
      expect(extractGrade('Pokemon Card GRADE 10')).toBeNull(); // No company detected
      expect(extractGrade('PSA GRADE 10')).toBe(10);
    });

    it('should handle grade before company name', () => {
      expect(extractGrade('10 PSA Pikachu')).toBe(10);
      expect(extractGrade('9.5 BGS Charizard')).toBe(9.5);
    });

    it('should return null if no grade found', () => {
      expect(extractGrade('Raw Pikachu')).toBeNull();
      expect(extractGrade('Ungraded Card')).toBeNull();
    });

    it('should return null for invalid grades', () => {
      expect(extractGrade('PSA 15 Pikachu')).toBeNull(); // >10
      expect(extractGrade('PSA 0 Mew')).toBeNull();  // <1
      expect(extractGrade('PSA 11 Card')).toBeNull(); // >10
    });

    it('should handle edge cases', () => {
      expect(extractGrade('PSA 1 Poor Card')).toBe(1);
      expect(extractGrade('PSA 10 Gem Mint')).toBe(10);
      expect(extractGrade('BGS 9.5 Near Mint')).toBe(9.5);
    });
  });

  describe('detectLanguage', () => {
    it('should detect Japanese by keyword', () => {
      expect(detectLanguage('Pokemon Japanese Pikachu')).toBe('jp');
      expect(detectLanguage('Charizard Japan PSA 10')).toBe('jp');
      expect(detectLanguage('JPN Mew Card')).toBe('jp');
    });

    it('should detect Japanese by characters', () => {
      expect(detectLanguage('ピカチュウ PSA 10')).toBe('jp');
      expect(detectLanguage('ポケモン カード')).toBe('jp');
    });

    it('should detect Chinese by keyword', () => {
      expect(detectLanguage('Pokemon Chinese Pikachu')).toBe('cn');
      expect(detectLanguage('China Charizard')).toBe('cn');
    });

    it('should detect Chinese by characters', () => {
      expect(detectLanguage('皮卡丘 PSA 10')).toBe('cn');
      expect(detectLanguage('宝可梦 卡片')).toBe('cn');
    });

    it('should default to English', () => {
      expect(detectLanguage('Pikachu PSA 10')).toBe('en');
      expect(detectLanguage('Charizard BGS 9.5')).toBe('en');
      expect(detectLanguage('Pokemon Card')).toBe('en');
    });

    it('should handle mixed content', () => {
      // Japanese takes precedence
      expect(detectLanguage('Pikachu ピカチュウ Japanese')).toBe('jp');
    });
  });

  describe('extractQuantity', () => {
    it('should extract quantity from "Nx" format', () => {
      expect(extractQuantity('3x Pikachu PSA 10')).toBe(3);
      expect(extractQuantity('5x Pokemon Cards')).toBe(5);
      expect(extractQuantity('10x Lot')).toBe(10);
    });

    it('should extract from "Lot of N" format', () => {
      expect(extractQuantity('Lot of 5 Pokemon Cards')).toBe(5);
      expect(extractQuantity('Lot of 10 Pikachu')).toBe(10);
      expect(extractQuantity('lot of 3 cards')).toBe(3);
    });

    it('should extract from "N cards" format', () => {
      expect(extractQuantity('10 cards Pokemon')).toBe(10);
      expect(extractQuantity('5 card lot')).toBe(5);
    });

    it('should extract from "N pc" format', () => {
      expect(extractQuantity('5 pc Pokemon Lot')).toBe(5);
      expect(extractQuantity('10 pc Pikachu')).toBe(10);
    });

    it('should default to 1 for single cards', () => {
      expect(extractQuantity('Pikachu PSA 10')).toBe(1);
      expect(extractQuantity('Charizard BGS 9.5')).toBe(1);
      expect(extractQuantity('Single Card')).toBe(1);
    });

    it('should reject unrealistic quantities', () => {
      expect(extractQuantity('1000x Pikachu')).toBe(1); // Too high
      expect(extractQuantity('9999x Cards')).toBe(1); // Too high
    });

    it('should handle edge cases', () => {
      expect(extractQuantity('2x Rare Pikachu')).toBe(2);
      expect(extractQuantity('999 cards maximum')).toBe(999); // Valid at boundary
      expect(extractQuantity('1000 cards')).toBe(1); // Above boundary
    });
  });

  describe('parseEbayItem', () => {
    it('should parse a valid eBay item', () => {
      const mockItem: EbayItem = {
        itemId: ['123456789'],
        title: ['Pikachu PSA 10 Pokemon Card'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '150.00',
            '@currencyId': 'USD'
          }],
          sellingState: ['EndedWithSales']
        }],
        listingInfo: [{
          endTime: ['2024-12-01T12:00:00.000Z']
        }],
        galleryURL: ['https://example.com/image.jpg']
      };

      const result = parseEbayItem(mockItem, true);

      expect(result.ebay_item_id).toBe('123456789');
      expect(result.title).toBe('Pikachu PSA 10 Pokemon Card');
      expect(result.price_usd).toBe(150);
      expect(result.original_price).toBe(150);
      expect(result.original_currency).toBe('USD');
      expect(result.grading_company).toBe('PSA');
      expect(result.grade).toBe(10);
      expect(result.language).toBe('en');
      expect(result.quantity).toBe(1);
      expect(result.is_verified_sale).toBe(true);
      expect(result.image_url).toBe('https://example.com/image.jpg');
    });

    it('should parse Japanese card', () => {
      const mockItem: EbayItem = {
        itemId: ['987654321'],
        title: ['ピカチュウ Japanese PSA 9'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '100.00',
            '@currencyId': 'USD'
          }],
          sellingState: ['EndedWithSales']
        }],
        listingInfo: [{
          endTime: ['2024-12-01T12:00:00.000Z']
        }]
      };

      const result = parseEbayItem(mockItem, true);

      expect(result.language).toBe('jp');
      expect(result.grading_company).toBe('PSA');
      expect(result.grade).toBe(9);
    });

    it('should parse multiple quantity', () => {
      const mockItem: EbayItem = {
        itemId: ['555555555'],
        title: ['3x Pikachu Pokemon Cards Lot'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '50.00',
            '@currencyId': 'USD'
          }],
          sellingState: ['EndedWithSales']
        }],
        listingInfo: [{
          endTime: ['2024-12-01T12:00:00.000Z']
        }]
      };

      const result = parseEbayItem(mockItem, true);

      expect(result.quantity).toBe(3);
    });

    it('should handle missing image URL', () => {
      const mockItem: EbayItem = {
        itemId: ['111111111'],
        title: ['Pikachu Card'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '25.00',
            '@currencyId': 'USD'
          }],
          sellingState: ['EndedWithSales']
        }],
        listingInfo: [{
          endTime: ['2024-12-01T12:00:00.000Z']
        }]
      };

      const result = parseEbayItem(mockItem, true);

      expect(result.image_url).toBeNull();
    });

    it('should mark active listings as not verified', () => {
      const mockItem: EbayItem = {
        itemId: ['222222222'],
        title: ['Pikachu PSA 10'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '200.00',
            '@currencyId': 'USD'
          }],
          sellingState: ['Active']
        }],
        listingInfo: [{
          endTime: ['2024-12-31T12:00:00.000Z']
        }]
      };

      const result = parseEbayItem(mockItem, false);

      expect(result.is_verified_sale).toBe(false);
    });
  });

  describe('validateTransaction', () => {
    it('should validate correct transaction', () => {
      const transaction: NormalizedTransaction = {
        ebay_item_id: '123456789',
        card_id: null,
        title: 'Pikachu PSA 10',
        price_usd: 150,
        original_price: 150,
        original_currency: 'USD',
        sold_date: new Date('2024-12-01'),
        grading_company: 'PSA',
        grade: 10,
        language: 'en',
        quantity: 1,
        image_url: 'https://example.com/image.jpg',
        is_verified_sale: true,
        metadata: {},
      };

      expect(validateTransaction(transaction)).toBe(true);
    });

    it('should reject missing required fields', () => {
      const transaction: NormalizedTransaction = {
        ebay_item_id: '',
        card_id: null,
        title: 'Pikachu',
        price_usd: 150,
        original_price: 150,
        original_currency: 'USD',
        sold_date: new Date(),
        grading_company: null,
        grade: null,
        language: 'en',
        quantity: 1,
        image_url: null,
        is_verified_sale: true,
        metadata: {},
      };

      expect(validateTransaction(transaction)).toBe(false);
    });

    it('should reject negative prices', () => {
      const transaction: NormalizedTransaction = {
        ebay_item_id: '123',
        card_id: null,
        title: 'Pikachu',
        price_usd: -10,
        original_price: 150,
        original_currency: 'USD',
        sold_date: new Date(),
        grading_company: null,
        grade: null,
        language: 'en',
        quantity: 1,
        image_url: null,
        is_verified_sale: true,
        metadata: {},
      };

      expect(validateTransaction(transaction)).toBe(false);
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const transaction: NormalizedTransaction = {
        ebay_item_id: '123',
        card_id: null,
        title: 'Pikachu',
        price_usd: 150,
        original_price: 150,
        original_currency: 'USD',
        sold_date: futureDate,
        grading_company: null,
        grade: null,
        language: 'en',
        quantity: 1,
        image_url: null,
        is_verified_sale: true,
        metadata: {},
      };

      expect(validateTransaction(transaction)).toBe(false);
    });

    it('should reject invalid grades', () => {
      const transaction: NormalizedTransaction = {
        ebay_item_id: '123',
        card_id: null,
        title: 'Pikachu PSA 15',
        price_usd: 150,
        original_price: 150,
        original_currency: 'USD',
        sold_date: new Date(),
        grading_company: 'PSA',
        grade: 15, // Invalid: >10
        language: 'en',
        quantity: 1,
        image_url: null,
        is_verified_sale: true,
        metadata: {},
      };

      expect(validateTransaction(transaction)).toBe(false);
    });

    it('should reject invalid quantity', () => {
      const transaction: NormalizedTransaction = {
        ebay_item_id: '123',
        card_id: null,
        title: 'Pikachu',
        price_usd: 150,
        original_price: 150,
        original_currency: 'USD',
        sold_date: new Date(),
        grading_company: null,
        grade: null,
        language: 'en',
        quantity: 0, // Invalid: must be >=1
        image_url: null,
        is_verified_sale: true,
        metadata: {},
      };

      expect(validateTransaction(transaction)).toBe(false);
    });
  });
});
