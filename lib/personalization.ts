import { supabase } from './supabase';
import {
  PersonalizationConfig,
  PersonalizationFont,
  PersonalizationColorPalette,
  PersonalizationTemplate,
  PersonalizationImagePreset,
  PersonalizationSubmission,
  PersonalizationSnapshot,
  PersonalizationReusableSetup,
  PersonalizationType,
  LivePreviewMode,
} from '../types/database';

export class PersonalizationService {
  static async getListingPersonalizationConfig(listingId: string): Promise<PersonalizationConfig[]> {
    const { data, error } = await supabase
      .rpc('get_listing_personalization_config', { p_listing_id: listingId });

    if (error) throw error;
    return data || [];
  }

  static async hasPersonalizationEnabled(listingId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('personalization_configs')
      .select('id')
      .eq('listing_id', listingId)
      .eq('is_enabled', true)
      .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  }

  static async createPersonalizationConfig(
    listingId: string,
    config: Partial<PersonalizationConfig>
  ): Promise<PersonalizationConfig> {
    const { data, error } = await supabase
      .from('personalization_configs')
      .insert({
        listing_id: listingId,
        ...config,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updatePersonalizationConfig(
    configId: string,
    updates: Partial<PersonalizationConfig>
  ): Promise<PersonalizationConfig> {
    const { data, error } = await supabase
      .from('personalization_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', configId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deletePersonalizationConfig(configId: string): Promise<void> {
    const { error } = await supabase
      .from('personalization_configs')
      .delete()
      .eq('id', configId);

    if (error) throw error;
  }

  static async getAvailableFonts(providerId?: string): Promise<PersonalizationFont[]> {
    let query = supabase
      .from('personalization_fonts')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (providerId) {
      query = query.or(`is_system_font.eq.true,provider_id.eq.${providerId}`);
    } else {
      query = query.eq('is_system_font', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async createProviderFont(
    providerId: string,
    font: Partial<PersonalizationFont>
  ): Promise<PersonalizationFont> {
    const { data, error } = await supabase
      .from('personalization_fonts')
      .insert({
        provider_id: providerId,
        is_system_font: false,
        ...font,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getProviderColorPalettes(providerId: string): Promise<PersonalizationColorPalette[]> {
    const { data, error } = await supabase
      .from('personalization_color_palettes')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createColorPalette(
    providerId: string,
    palette: Partial<PersonalizationColorPalette>
  ): Promise<PersonalizationColorPalette> {
    const { data, error } = await supabase
      .from('personalization_color_palettes')
      .insert({
        provider_id: providerId,
        ...palette,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateColorPalette(
    paletteId: string,
    updates: Partial<PersonalizationColorPalette>
  ): Promise<PersonalizationColorPalette> {
    const { data, error } = await supabase
      .from('personalization_color_palettes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paletteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getListingTemplates(listingId: string): Promise<PersonalizationTemplate[]> {
    const { data, error } = await supabase
      .from('personalization_templates')
      .select('*')
      .eq('listing_id', listingId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createTemplate(
    listingId: string,
    providerId: string,
    template: Partial<PersonalizationTemplate>
  ): Promise<PersonalizationTemplate> {
    const { data, error } = await supabase
      .from('personalization_templates')
      .insert({
        listing_id: listingId,
        provider_id: providerId,
        ...template,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateTemplate(
    templateId: string,
    updates: Partial<PersonalizationTemplate>
  ): Promise<PersonalizationTemplate> {
    const { data, error } = await supabase
      .from('personalization_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getImagePresets(
    listingId: string,
    configId?: string,
    category?: string
  ): Promise<PersonalizationImagePreset[]> {
    let query = supabase
      .from('personalization_image_presets')
      .select('*')
      .eq('listing_id', listingId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (configId) {
      query = query.eq('config_id', configId);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async createImagePreset(
    listingId: string,
    providerId: string,
    preset: Partial<PersonalizationImagePreset>
  ): Promise<PersonalizationImagePreset> {
    const { data, error } = await supabase
      .from('personalization_image_presets')
      .insert({
        listing_id: listingId,
        provider_id: providerId,
        ...preset,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createSubmission(
    customerId: string,
    listingId: string,
    submission: Partial<PersonalizationSubmission>
  ): Promise<PersonalizationSubmission> {
    const { data, error } = await supabase
      .from('personalization_submissions')
      .insert({
        customer_id: customerId,
        listing_id: listingId,
        ...submission,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSubmission(
    submissionId: string,
    updates: Partial<PersonalizationSubmission>
  ): Promise<PersonalizationSubmission> {
    const { data: existing } = await supabase
      .from('personalization_submissions')
      .select('is_locked')
      .eq('id', submissionId)
      .single();

    if (existing?.is_locked) {
      throw new Error('Cannot update locked personalization submission');
    }

    const { data, error } = await supabase
      .from('personalization_submissions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getCartItemSubmissions(cartItemId: string): Promise<PersonalizationSubmission[]> {
    const { data, error } = await supabase
      .from('personalization_submissions')
      .select('*')
      .eq('cart_item_id', cartItemId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async linkSubmissionsToCartItem(
    submissionIds: string[],
    cartItemId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('personalization_submissions')
      .update({ cart_item_id: cartItemId })
      .in('id', submissionIds);

    if (error) throw error;
  }

  static async createSnapshot(
    cartItemId: string,
    customerId: string,
    listingId: string,
    providerId: string
  ): Promise<string> {
    const { data, error } = await supabase
      .rpc('create_personalization_snapshot', {
        p_cart_item_id: cartItemId,
        p_customer_id: customerId,
        p_listing_id: listingId,
        p_provider_id: providerId,
      });

    if (error) throw error;
    return data;
  }

  static async transferToOrder(
    cartItemId: string,
    bookingId: string,
    productionOrderId?: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('transfer_personalization_to_order', {
        p_cart_item_id: cartItemId,
        p_booking_id: bookingId,
        p_production_order_id: productionOrderId || null,
      });

    if (error) throw error;
    return data;
  }

  static async getOrderPersonalization(productionOrderId: string): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_personalization_for_proof', { p_production_order_id: productionOrderId });

    if (error) throw error;
    return data;
  }

  static async calculatePriceImpact(
    configId: string,
    textValue?: string,
    imageCount: number = 0
  ): Promise<number> {
    const { data, error } = await supabase
      .rpc('calculate_personalization_price_impact', {
        p_config_id: configId,
        p_text_value: textValue || null,
        p_image_count: imageCount,
      });

    if (error) throw error;
    return data || 0;
  }

  static async saveReusableSetup(
    customerId: string,
    listingId: string,
    name: string,
    sourceSnapshotId?: string,
    sourceBookingId?: string
  ): Promise<string> {
    const { data, error } = await supabase
      .rpc('save_reusable_personalization_setup', {
        p_customer_id: customerId,
        p_listing_id: listingId,
        p_name: name,
        p_source_snapshot_id: sourceSnapshotId || null,
        p_source_booking_id: sourceBookingId || null,
      });

    if (error) throw error;
    return data;
  }

  static async getReusableSetups(customerId: string, listingId?: string): Promise<PersonalizationReusableSetup[]> {
    let query = supabase
      .from('personalization_reusable_setups')
      .select('*')
      .eq('customer_id', customerId)
      .order('last_used_at', { ascending: false, nullsFirst: false });

    if (listingId) {
      query = query.or(`listing_id.eq.${listingId},listing_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async applyReusableSetup(
    setupId: string,
    cartItemId: string,
    customerId: string,
    listingId: string
  ): Promise<PersonalizationSubmission[]> {
    const { data: setup, error: setupError } = await supabase
      .from('personalization_reusable_setups')
      .select('setup_data')
      .eq('id', setupId)
      .eq('customer_id', customerId)
      .single();

    if (setupError) throw setupError;
    if (!setup?.setup_data) throw new Error('Setup data not found');

    const submissions: PersonalizationSubmission[] = [];
    const setupData = setup.setup_data as PersonalizationSubmission[];

    for (const item of setupData) {
      const { data, error } = await supabase
        .from('personalization_submissions')
        .insert({
          customer_id: customerId,
          listing_id: listingId,
          cart_item_id: cartItemId,
          config_id: item.config_id,
          submission_type: item.submission_type,
          text_value: item.text_value,
          image_data: item.image_data,
          font_data: item.font_data,
          color_data: item.color_data,
          placement_data: item.placement_data,
          template_data: item.template_data,
          calculated_price_impact: item.calculated_price_impact,
        })
        .select()
        .single();

      if (error) throw error;
      submissions.push(data);
    }

    await supabase
      .from('personalization_reusable_setups')
      .update({
        use_count: setup.setup_data.length + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', setupId);

    return submissions;
  }

  static async validateSubmission(
    submission: Partial<PersonalizationSubmission>,
    config: PersonalizationConfig
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (config.personalization_type === 'text' || config.text_config?.enabled) {
      const textConfig = config.text_config;
      const textValue = submission.text_value || '';

      if (config.is_required && !textValue) {
        errors.push('Text is required');
      }
      if (textValue && textConfig.min_length > 0 && textValue.length < textConfig.min_length) {
        errors.push(`Text must be at least ${textConfig.min_length} characters`);
      }
      if (textValue && textConfig.max_length > 0 && textValue.length > textConfig.max_length) {
        errors.push(`Text must be no more than ${textConfig.max_length} characters`);
      }
      if (textValue && textConfig.validation_regex) {
        const regex = new RegExp(textConfig.validation_regex);
        if (!regex.test(textValue)) {
          errors.push('Text contains invalid characters');
        }
      }
    }

    if (config.personalization_type === 'image_upload' || config.image_upload_config?.enabled) {
      const imageConfig = config.image_upload_config;
      const imageData = submission.image_data;

      if (config.is_required && !imageData?.uploaded_url && !imageData?.preset_id) {
        errors.push('Image is required');
      }
      if (imageData?.file_size && imageConfig.max_file_size_mb > 0) {
        const maxBytes = imageConfig.max_file_size_mb * 1024 * 1024;
        if (imageData.file_size > maxBytes) {
          errors.push(`Image must be smaller than ${imageConfig.max_file_size_mb}MB`);
        }
      }
      if (imageData?.dimensions && imageConfig.min_resolution) {
        if (
          imageData.dimensions.width < imageConfig.min_resolution.width ||
          imageData.dimensions.height < imageConfig.min_resolution.height
        ) {
          errors.push(
            `Image must be at least ${imageConfig.min_resolution.width}x${imageConfig.min_resolution.height} pixels`
          );
        }
      }
    }

    if (config.personalization_type === 'font_selection' || config.font_config?.enabled) {
      const fontConfig = config.font_config;
      const fontData = submission.font_data;

      if (config.is_required && !fontData?.font_id) {
        errors.push('Font selection is required');
      }
      if (fontData?.font_size) {
        if (fontConfig.min_size > 0 && fontData.font_size < fontConfig.min_size) {
          errors.push(`Font size must be at least ${fontConfig.min_size}`);
        }
        if (fontConfig.max_size > 0 && fontData.font_size > fontConfig.max_size) {
          errors.push(`Font size must be no more than ${fontConfig.max_size}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static async getSnapshotByBooking(bookingId: string): Promise<PersonalizationSnapshot | null> {
    const { data, error } = await supabase
      .from('personalization_snapshots')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getSnapshotByProductionOrder(productionOrderId: string): Promise<PersonalizationSnapshot | null> {
    const { data, error } = await supabase
      .from('personalization_snapshots')
      .select('*')
      .eq('production_order_id', productionOrderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
