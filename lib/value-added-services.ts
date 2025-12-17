import { supabase } from './supabase';
import { ValueAddedService, CustomServiceOption } from '../types/database';

export class ValueAddedServicesManager {
  static async getVASForListing(listingId: string): Promise<ValueAddedService[]> {
    try {
      const { data, error } = await supabase
        .from('value_added_services')
        .select('*')
        .eq('listing_id', listingId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching VAS:', error);
      return [];
    }
  }

  static async createVAS(
    vas: Omit<ValueAddedService, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ValueAddedService | null> {
    try {
      const { data, error } = await supabase
        .from('value_added_services')
        .insert(vas)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating VAS:', error);
      return null;
    }
  }

  static async updateVAS(
    vasId: string,
    updates: Partial<ValueAddedService>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('value_added_services')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', vasId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating VAS:', error);
      return false;
    }
  }

  static async deleteVAS(vasId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('value_added_services')
        .delete()
        .eq('id', vasId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting VAS:', error);
      return false;
    }
  }

  static calculateVASTotal(selectedVAS: Array<{ id: string; price: number }>): number {
    return selectedVAS.reduce((total, vas) => total + vas.price, 0);
  }

  static async getCustomServiceOptions(
    listingId: string
  ): Promise<CustomServiceOption[]> {
    try {
      const { data, error } = await supabase
        .from('custom_service_options')
        .select('*')
        .eq('listing_id', listingId)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching custom service options:', error);
      return [];
    }
  }

  static async createCustomOption(
    option: Omit<CustomServiceOption, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CustomServiceOption | null> {
    try {
      const { data, error } = await supabase
        .from('custom_service_options')
        .insert(option)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating custom option:', error);
      return null;
    }
  }

  static async updateCustomOption(
    optionId: string,
    updates: Partial<CustomServiceOption>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('custom_service_options')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', optionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating custom option:', error);
      return false;
    }
  }

  static async deleteCustomOption(optionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('custom_service_options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting custom option:', error);
      return false;
    }
  }

  static calculateCustomOptionsPrice(
    basePrice: number,
    selectedOptions: Record<string, string>,
    availableOptions: CustomServiceOption[]
  ): number {
    let totalModifier = 0;

    availableOptions.forEach((option) => {
      const selectedValue = selectedOptions[option.id];
      if (selectedValue) {
        const optionValue = option.option_values.find(
          (v: any) => v.value === selectedValue
        );
        if (optionValue) {
          totalModifier += optionValue.price_modifier || 0;
        }
      }
    });

    return basePrice + totalModifier;
  }

  static validateCustomOptions(
    selectedOptions: Record<string, string>,
    availableOptions: CustomServiceOption[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    availableOptions.forEach((option) => {
      if (option.is_required && !selectedOptions[option.id]) {
        errors.push(`${option.option_name} is required`);
      }

      const selectedValue = selectedOptions[option.id];
      if (selectedValue) {
        const validValues = option.option_values.map((v: any) => v.value);
        if (!validValues.includes(selectedValue)) {
          errors.push(`Invalid value for ${option.option_name}`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static async bulkCreateVAS(
    listingId: string,
    services: Array<
      Omit<ValueAddedService, 'id' | 'listing_id' | 'created_at' | 'updated_at'>
    >
  ): Promise<boolean> {
    try {
      const vasToInsert = services.map((service, index) => ({
        ...service,
        listing_id: listingId,
        sort_order: service.sort_order ?? index,
      }));

      const { error } = await supabase
        .from('value_added_services')
        .insert(vasToInsert);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error bulk creating VAS:', error);
      return false;
    }
  }

  static async bulkCreateCustomOptions(
    listingId: string,
    options: Array<
      Omit<CustomServiceOption, 'id' | 'listing_id' | 'created_at' | 'updated_at'>
    >
  ): Promise<boolean> {
    try {
      const optionsToInsert = options.map((option, index) => ({
        ...option,
        listing_id: listingId,
        sort_order: option.sort_order ?? index,
      }));

      const { error } = await supabase
        .from('custom_service_options')
        .insert(optionsToInsert);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error bulk creating custom options:', error);
      return false;
    }
  }

  static getVASByCategory(): Record<
    string,
    Array<{ name: string; description: string; typical_price: number }>
  > {
    return {
      'Gift Services': [
        {
          name: 'Gift Wrapping',
          description: 'Professional gift wrapping with ribbon',
          typical_price: 5.0,
        },
        {
          name: 'Gift Card',
          description: 'Include a personalized gift card',
          typical_price: 2.0,
        },
        {
          name: 'Premium Gift Box',
          description: 'Elegant presentation box',
          typical_price: 10.0,
        },
      ],
      Installation: [
        {
          name: 'Basic Installation',
          description: 'Standard installation service',
          typical_price: 50.0,
        },
        {
          name: 'Premium Installation',
          description: 'Expert installation with setup',
          typical_price: 100.0,
        },
        {
          name: 'Assembly Required',
          description: 'Product assembly service',
          typical_price: 30.0,
        },
      ],
      'Priority Service': [
        {
          name: 'Rush Processing',
          description: 'Process order within 24 hours',
          typical_price: 20.0,
        },
        {
          name: 'Priority Support',
          description: 'Dedicated customer support',
          typical_price: 15.0,
        },
        {
          name: 'Express Delivery',
          description: 'Expedited shipping option',
          typical_price: 25.0,
        },
      ],
      Customization: [
        {
          name: 'Personalization',
          description: 'Add custom text or monogram',
          typical_price: 15.0,
        },
        {
          name: 'Custom Color',
          description: 'Special color customization',
          typical_price: 10.0,
        },
        {
          name: 'Custom Size',
          description: 'Made to measure',
          typical_price: 20.0,
        },
      ],
      Warranty: [
        {
          name: 'Extended Warranty',
          description: '1-year extended warranty',
          typical_price: 30.0,
        },
        {
          name: 'Damage Protection',
          description: 'Accidental damage coverage',
          typical_price: 25.0,
        },
      ],
    };
  }
}

export default ValueAddedServicesManager;
