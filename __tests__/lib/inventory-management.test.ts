import { InventoryManagementService } from '@/lib/inventory-management';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('InventoryManagementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createItem', () => {
    it('should create inventory item successfully', async () => {
      const mockInsert = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'item-123', name: 'Test Item' },
          error: null,
        }),
      };
      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue(mockInsert),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const params = {
        providerId: 'provider-123',
        name: 'Test Item',
        quantity: 100,
        unitCost: 10,
      };

      const result = await InventoryManagementService.createItem(params);

      expect(result.id).toBe('item-123');
      expect(result.name).toBe('Test Item');
    });
  });

  describe('calculateInventoryHealth', () => {
    it('should return out status when quantity is 0', () => {
      const item = {
        quantity: 0,
        reorder_point: 10,
      } as any;

      const health = InventoryManagementService.calculateInventoryHealth(item);

      expect(health.status).toBe('out');
      expect(health.percentage).toBe(0);
      expect(health.color).toBe('#DC2626');
    });

    it('should return critical status when at 50% or below reorder point', () => {
      const item = {
        quantity: 5,
        reorder_point: 10,
      } as any;

      const health = InventoryManagementService.calculateInventoryHealth(item);

      expect(health.status).toBe('critical');
      expect(health.percentage).toBe(50);
      expect(health.color).toBe('#EF4444');
    });

    it('should return low status when between 50% and 100% of reorder point', () => {
      const item = {
        quantity: 7,
        reorder_point: 10,
      } as any;

      const health = InventoryManagementService.calculateInventoryHealth(item);

      expect(health.status).toBe('low');
      expect(health.percentage).toBe(70);
      expect(health.color).toBe('#F59E0B');
    });

    it('should return healthy status when above reorder point', () => {
      const item = {
        quantity: 15,
        reorder_point: 10,
      } as any;

      const health = InventoryManagementService.calculateInventoryHealth(item);

      expect(health.status).toBe('healthy');
      expect(health.percentage).toBe(150);
      expect(health.color).toBe('#10B981');
    });
  });

  describe('formatQuantity', () => {
    it('should format quantity with unit', () => {
      const result = InventoryManagementService.formatQuantity(10.5, 'kg');
      expect(result).toBe('10.50 kg');
    });

    it('should format quantity with default precision', () => {
      const result = InventoryManagementService.formatQuantity(100, 'units');
      expect(result).toBe('100.00 units');
    });
  });

  describe('calculateReorderQuantity', () => {
    it('should calculate correct reorder quantity', () => {
      const item = {
        quantity: 10,
        reorder_point: 20,
      } as any;
      const avgDailyUsage = 5;

      const reorderQty = InventoryManagementService.calculateReorderQuantity(
        item,
        avgDailyUsage
      );

      expect(reorderQty).toBe(45);
    });

    it('should return 0 if calculated quantity is negative', () => {
      const item = {
        quantity: 100,
        reorder_point: 20,
      } as any;
      const avgDailyUsage = 5;

      const reorderQty = InventoryManagementService.calculateReorderQuantity(
        item,
        avgDailyUsage
      );

      expect(reorderQty).toBe(0);
    });
  });

  describe('getTransactionTypeLabel', () => {
    it('should return correct labels for transaction types', () => {
      expect(InventoryManagementService.getTransactionTypeLabel('restock')).toBe('Restock');
      expect(InventoryManagementService.getTransactionTypeLabel('usage')).toBe('Usage');
      expect(InventoryManagementService.getTransactionTypeLabel('adjustment')).toBe('Adjustment');
      expect(InventoryManagementService.getTransactionTypeLabel('return')).toBe('Return');
      expect(InventoryManagementService.getTransactionTypeLabel('waste')).toBe('Waste');
    });
  });

  describe('getTransactionTypeColor', () => {
    it('should return correct colors for transaction types', () => {
      expect(InventoryManagementService.getTransactionTypeColor('restock')).toBe('#10B981');
      expect(InventoryManagementService.getTransactionTypeColor('usage')).toBe('#3B82F6');
      expect(InventoryManagementService.getTransactionTypeColor('adjustment')).toBe('#8B5CF6');
      expect(InventoryManagementService.getTransactionTypeColor('return')).toBe('#F59E0B');
      expect(InventoryManagementService.getTransactionTypeColor('waste')).toBe('#DC2626');
    });
  });
});
