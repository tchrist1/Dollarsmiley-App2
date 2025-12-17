import { supabase } from './supabase';

interface InventoryItem {
  id: string;
  provider_id: string;
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  quantity: number;
  unit: string;
  reorder_point: number;
  unit_cost: number;
  supplier_name?: string;
  supplier_contact?: string;
  location?: string;
  status: 'active' | 'inactive' | 'discontinued';
  last_restock_date?: string;
  image_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: 'restock' | 'usage' | 'adjustment' | 'return' | 'waste';
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_type?: 'booking' | 'production_order' | 'manual' | 'purchase_order';
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

interface CreateInventoryItemParams {
  providerId: string;
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  quantity?: number;
  unit?: string;
  reorderPoint?: number;
  unitCost?: number;
  supplierName?: string;
  supplierContact?: string;
  location?: string;
  imageUrl?: string;
}

interface UpdateInventoryParams {
  itemId: string;
  transactionType: 'restock' | 'usage' | 'adjustment' | 'return' | 'waste';
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  userId?: string;
}

export class InventoryManagementService {
  static async createItem(params: CreateInventoryItemParams): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        provider_id: params.providerId,
        name: params.name,
        description: params.description,
        category: params.category,
        sku: params.sku,
        quantity: params.quantity || 0,
        unit: params.unit || 'units',
        reorder_point: params.reorderPoint || 0,
        unit_cost: params.unitCost || 0,
        supplier_name: params.supplierName,
        supplier_contact: params.supplierContact,
        location: params.location,
        image_url: params.imageUrl,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getProviderInventory(providerId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('provider_id', providerId)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async getItem(itemId: string): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateItem(
    itemId: string,
    updates: Partial<InventoryItem>
  ): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  }

  static async updateQuantity(params: UpdateInventoryParams): Promise<void> {
    const { error } = await supabase.rpc('update_inventory_quantity', {
      item_id_param: params.itemId,
      transaction_type_param: params.transactionType,
      quantity_param: params.quantity,
      unit_cost_param: params.unitCost || 0,
      reference_type_param: params.referenceType,
      reference_id_param: params.referenceId,
      notes_param: params.notes,
      user_id_param: params.userId,
    });

    if (error) throw error;
  }

  static async getTransactions(itemId: string): Promise<InventoryTransaction[]> {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('inventory_item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getLowStockItems(providerId: string) {
    const { data, error } = await supabase.rpc('get_low_stock_items', {
      provider_id_param: providerId,
    });

    if (error) throw error;
    return data || [];
  }

  static async getInventoryValue(providerId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_inventory_value', {
      provider_id_param: providerId,
    });

    if (error) throw error;
    return data || 0;
  }

  static async getUsageStats(providerId: string, days: number = 30) {
    const { data, error } = await supabase.rpc('get_inventory_usage_stats', {
      provider_id_param: providerId,
      days_param: days,
    });

    if (error) throw error;
    return data || [];
  }

  static async getActiveAlerts(providerId: string) {
    const { data, error } = await supabase
      .from('inventory_alerts')
      .select(`
        *,
        inventory_items (
          id,
          name,
          quantity,
          reorder_point,
          unit
        )
      `)
      .eq('is_active', true)
      .in(
        'inventory_item_id',
        supabase
          .from('inventory_items')
          .select('id')
          .eq('provider_id', providerId)
      );

    if (error) throw error;
    return data || [];
  }

  static async dismissAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_alerts')
      .update({ is_active: false })
      .eq('id', alertId);

    if (error) throw error;
  }

  static async getInventoryByCategory(providerId: string) {
    const items = await this.getProviderInventory(providerId);

    const grouped = items.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, InventoryItem[]>);

    return grouped;
  }

  static calculateInventoryHealth(item: InventoryItem): {
    status: 'healthy' | 'low' | 'critical' | 'out';
    percentage: number;
    color: string;
  } {
    const percentage = item.reorder_point > 0
      ? (item.quantity / item.reorder_point) * 100
      : 100;

    if (item.quantity === 0) {
      return { status: 'out', percentage: 0, color: '#DC2626' };
    } else if (percentage <= 50) {
      return { status: 'critical', percentage, color: '#EF4444' };
    } else if (percentage <= 100) {
      return { status: 'low', percentage, color: '#F59E0B' };
    } else {
      return { status: 'healthy', percentage, color: '#10B981' };
    }
  }

  static formatQuantity(quantity: number, unit: string): string {
    return `${quantity.toFixed(2)} ${unit}`;
  }

  static calculateReorderQuantity(item: InventoryItem, avgDailyUsage: number): number {
    const daysToRestock = 7;
    const safetyStock = item.reorder_point;
    const expectedUsage = avgDailyUsage * daysToRestock;

    return Math.max(0, expectedUsage + safetyStock - item.quantity);
  }

  static getTransactionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      restock: 'Restock',
      usage: 'Usage',
      adjustment: 'Adjustment',
      return: 'Return',
      waste: 'Waste',
    };
    return labels[type] || type;
  }

  static getTransactionTypeColor(type: string): string {
    const colors: Record<string, string> = {
      restock: '#10B981',
      usage: '#3B82F6',
      adjustment: '#8B5CF6',
      return: '#F59E0B',
      waste: '#DC2626',
    };
    return colors[type] || '#6B7280';
  }

  static async exportInventoryReport(providerId: string): Promise<string> {
    const items = await this.getProviderInventory(providerId);
    const value = await this.getInventoryValue(providerId);

    let csv = 'Name,Category,SKU,Quantity,Unit,Reorder Point,Unit Cost,Total Value,Status\n';

    items.forEach(item => {
      const totalValue = item.quantity * item.unit_cost;
      csv += `"${item.name}","${item.category || ''}","${item.sku || ''}",${item.quantity},"${item.unit}",${item.reorder_point},${item.unit_cost},${totalValue},"${item.status}"\n`;
    });

    csv += `\nTotal Inventory Value:,,,,,,,${value}\n`;

    return csv;
  }
}

export default InventoryManagementService;
