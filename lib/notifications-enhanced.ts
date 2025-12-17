import { supabase } from './supabase';

interface NotificationTemplate {
  key: string;
  name: string;
  description?: string;
  channels: ('sms' | 'email' | 'push' | 'in-app')[];
  titleTemplate: string;
  bodyTemplate: string;
  variables?: Record<string, string>;
}

interface NotificationPreferences {
  userId: string;
  templateKey: string;
  enabledChannels: ('sms' | 'email' | 'push' | 'in-app')[];
  frequency: 'immediate' | 'daily_digest' | 'weekly_digest';
}

interface NotificationDelivery {
  notificationId: string;
  channel: 'sms' | 'email' | 'push' | 'in-app';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  provider?: string;
  externalId?: string;
  errorMessage?: string;
}

export class NotificationsEnhancedService {
  static async createTemplate(template: NotificationTemplate) {
    const { data, error } = await supabase
      .from('notification_templates')
      .insert({
        key: template.key,
        name: template.name,
        description: template.description,
        channels: template.channels,
        title_template: template.titleTemplate,
        body_template: template.bodyTemplate,
        variables: template.variables || {},
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>) {
    const updateData: any = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.channels) updateData.channels = updates.channels;
    if (updates.titleTemplate) updateData.title_template = updates.titleTemplate;
    if (updates.bodyTemplate) updateData.body_template = updates.bodyTemplate;
    if (updates.variables) updateData.variables = updates.variables;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('notification_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getTemplate(templateKey: string) {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('key', templateKey)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getAllTemplates() {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async deactivateTemplate(templateId: string) {
    const { error } = await supabase
      .from('notification_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId);

    if (error) throw error;
  }

  static async getUserPreferences(userId: string, templateKey?: string) {
    let query = supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId);

    if (templateKey) {
      query = query.eq('template_key', templateKey);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  static async setUserPreferences(preferences: NotificationPreferences) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: preferences.userId,
        template_key: preferences.templateKey,
        enabled_channels: preferences.enabledChannels,
        frequency: preferences.frequency,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createNotificationFromTemplate(
    templateKey: string,
    userId: string,
    variables: Record<string, any> = {}
  ) {
    const { data, error } = await supabase.rpc('create_notification_from_template', {
      template_key_param: templateKey,
      user_id_param: userId,
      variables_param: variables,
    });

    if (error) throw error;
    return data;
  }

  static async sendNotification(
    userId: string,
    title: string,
    body: string,
    options: {
      templateKey?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      metadata?: Record<string, any>;
      actionUrl?: string;
    } = {}
  ) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body,
        message: body,
        template_key: options.templateKey,
        priority: options.priority || 'normal',
        metadata: options.metadata || {},
        action_url: options.actionUrl,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async recordDelivery(delivery: NotificationDelivery) {
    const { data, error } = await supabase
      .from('notification_deliveries')
      .insert({
        notification_id: delivery.notificationId,
        channel: delivery.channel,
        status: delivery.status,
        provider: delivery.provider,
        external_id: delivery.externalId,
        error_message: delivery.errorMessage,
        attempts: 1,
        sent_at: delivery.status === 'sent' ? new Date().toISOString() : null,
        delivered_at: delivery.status === 'delivered' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateDeliveryStatus(
    deliveryId: string,
    status: 'sent' | 'delivered' | 'failed' | 'bounced',
    errorMessage?: string
  ) {
    const updateData: any = { status };

    if (status === 'sent' && !errorMessage) {
      updateData.sent_at = new Date().toISOString();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    } else if (status === 'failed' || status === 'bounced') {
      updateData.error_message = errorMessage;
    }

    const { data, error } = await supabase
      .from('notification_deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getDeliveryStatus(notificationId: string) {
    const { data, error } = await supabase
      .from('notification_deliveries')
      .select('*')
      .eq('notification_id', notificationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async retryFailedDelivery(deliveryId: string) {
    const { data: delivery, error: fetchError } = await supabase
      .from('notification_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (fetchError || !delivery) throw fetchError || new Error('Delivery not found');

    if (delivery.attempts >= 3) {
      throw new Error('Maximum retry attempts reached');
    }

    const { data, error } = await supabase
      .from('notification_deliveries')
      .update({
        status: 'pending',
        attempts: delivery.attempts + 1,
        error_message: null,
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getNotificationStats(userId: string, days: number = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const { data, error } = await supabase
      .from('notifications')
      .select('id, is_read, created_at, template_key')
      .eq('user_id', userId)
      .gte('created_at', dateFrom.toISOString());

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      read: data?.filter((n) => n.is_read).length || 0,
      unread: data?.filter((n) => !n.is_read).length || 0,
      byTemplate: {} as Record<string, number>,
    };

    data?.forEach((n) => {
      if (n.template_key) {
        stats.byTemplate[n.template_key] = (stats.byTemplate[n.template_key] || 0) + 1;
      }
    });

    return stats;
  }

  static async getDeliveryStats(days: number = 7) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const { data, error } = await supabase
      .from('notification_deliveries')
      .select('channel, status, created_at')
      .gte('created_at', dateFrom.toISOString());

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      byChannel: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      successRate: 0,
    };

    data?.forEach((d) => {
      stats.byChannel[d.channel] = (stats.byChannel[d.channel] || 0) + 1;
      stats.byStatus[d.status] = (stats.byStatus[d.status] || 0) + 1;
    });

    const successful = (stats.byStatus['sent'] || 0) + (stats.byStatus['delivered'] || 0);
    stats.successRate = stats.total > 0 ? (successful / stats.total) * 100 : 0;

    return stats;
  }

  static interpolateTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  static async bulkSendNotification(
    userIds: string[],
    templateKey: string,
    variables: Record<string, any> = {}
  ) {
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        this.createNotificationFromTemplate(templateKey, userId, variables)
      )
    );

    const summary = {
      total: userIds.length,
      successful: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    };

    return summary;
  }
}

export default NotificationsEnhancedService;
