import { supabase } from './supabase';
import { EmailTemplate } from './email-service';

export interface EmailTemplateCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface EmailTemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: string[];
  created_by: string | null;
  created_at: string;
  notes: string | null;
}

export interface EmailTemplateVariable {
  id: string;
  variable_name: string;
  display_name: string;
  description: string | null;
  example_value: string | null;
  category: 'User' | 'Booking' | 'Payment' | 'Provider' | 'Platform' | 'System';
  data_type: 'String' | 'Number' | 'Date' | 'URL' | 'Boolean' | 'Currency';
  is_required: boolean;
  created_at: string;
}

export interface EmailTemplateTestSend {
  id: string;
  template_id: string;
  sent_to: string;
  test_data: Record<string, any>;
  sent_by: string | null;
  sent_at: string;
  status: 'Success' | 'Failed';
  error_message: string | null;
}

export interface RenderedTemplate {
  subject: string;
  html_body: string;
  text_body: string;
}

/**
 * Get all template categories
 */
export async function getTemplateCategories(): Promise<EmailTemplateCategory[]> {
  try {
    const { data, error } = await supabase
      .from('email_template_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching template categories:', error);
    return [];
  }
}

/**
 * Get all email templates
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return [];
  }
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(
  categoryId: string
): Promise<EmailTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('category_id', categoryId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    return [];
  }
}

/**
 * Get single template by ID
 */
export async function getTemplateById(
  templateId: string
): Promise<EmailTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
}

/**
 * Get template by slug
 */
export async function getTemplateBySlug(
  slug: string
): Promise<EmailTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching template by slug:', error);
    return null;
  }
}

/**
 * Create email template
 */
export async function createEmailTemplate(
  template: Partial<EmailTemplate>
): Promise<EmailTemplate | null> {
  try {
    const variables = extractVariablesFromTemplate(
      template.subject + ' ' + template.html_body
    );

    const { data, error } = await supabase
      .from('email_templates')
      .insert([
        {
          ...template,
          variables,
          version: 1,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating template:', error);
    return null;
  }
}

/**
 * Update email template
 */
export async function updateEmailTemplate(
  templateId: string,
  updates: Partial<EmailTemplate>,
  editedBy?: string
): Promise<EmailTemplate | null> {
  try {
    let variables = updates.variables;
    if (updates.subject || updates.html_body) {
      const text = (updates.subject || '') + ' ' + (updates.html_body || '');
      variables = extractVariablesFromTemplate(text);
    }

    const { data, error } = await supabase
      .from('email_templates')
      .update({
        ...updates,
        variables,
        last_edited_by: editedBy,
        last_edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating template:', error);
    return null;
  }
}

/**
 * Delete email template
 */
export async function deleteEmailTemplate(
  templateId: string
): Promise<boolean> {
  try {
    const template = await getTemplateById(templateId);
    if (template?.is_system) {
      console.error('Cannot delete system template');
      return false;
    }

    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    return false;
  }
}

/**
 * Duplicate email template
 */
export async function duplicateTemplate(
  templateId: string,
  newName: string
): Promise<EmailTemplate | null> {
  try {
    const original = await getTemplateById(templateId);
    if (!original) return null;

    const slug = newName.toLowerCase().replace(/\s+/g, '-');

    const { data, error } = await supabase
      .from('email_templates')
      .insert([
        {
          name: newName,
          slug,
          subject: original.subject,
          html_body: original.html_body,
          text_body: original.text_body,
          variables: original.variables,
          category_id: original.category_id,
          preview_text: original.preview_text,
          tags: original.tags,
          description: `Copy of ${original.name}`,
          is_active: false,
          is_system: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error duplicating template:', error);
    return null;
  }
}

/**
 * Get template versions
 */
export async function getTemplateVersions(
  templateId: string
): Promise<EmailTemplateVersion[]> {
  try {
    const { data, error } = await supabase
      .from('email_template_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching template versions:', error);
    return [];
  }
}

/**
 * Rollback to previous version
 */
export async function rollbackToVersion(
  templateId: string,
  versionNumber: number,
  editedBy?: string
): Promise<EmailTemplate | null> {
  try {
    const { data: version, error: versionError } = await supabase
      .from('email_template_versions')
      .select('*')
      .eq('template_id', templateId)
      .eq('version_number', versionNumber)
      .maybeSingle();

    if (versionError || !version) throw versionError;

    return await updateEmailTemplate(
      templateId,
      {
        subject: version.subject,
        html_body: version.html_body,
        text_body: version.text_body,
        variables: version.variables,
      },
      editedBy
    );
  } catch (error) {
    console.error('Error rolling back template:', error);
    return null;
  }
}

/**
 * Get available template variables
 */
export async function getTemplateVariables(): Promise<EmailTemplateVariable[]> {
  try {
    const { data, error } = await supabase
      .from('email_template_variables')
      .select('*')
      .order('category', { ascending: true })
      .order('display_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching template variables:', error);
    return [];
  }
}

/**
 * Get variables by category
 */
export async function getVariablesByCategory(
  category: string
): Promise<EmailTemplateVariable[]> {
  try {
    const { data, error } = await supabase
      .from('email_template_variables')
      .select('*')
      .eq('category', category)
      .order('display_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching variables by category:', error);
    return [];
  }
}

/**
 * Extract variables from template text
 */
export function extractVariablesFromTemplate(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = regex.exec(text)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Render template with variables
 */
export async function renderTemplate(
  templateId: string,
  variables: Record<string, any>
): Promise<RenderedTemplate | null> {
  try {
    const { data, error } = await supabase.rpc('render_email_template', {
      template_id_param: templateId,
      variables_param: variables,
    });

    if (error) throw error;
    return data as RenderedTemplate;
  } catch (error) {
    console.error('Error rendering template:', error);
    return null;
  }
}

/**
 * Render template locally (client-side)
 */
export function renderTemplateLocal(
  template: EmailTemplate,
  variables: Record<string, any>
): RenderedTemplate {
  let subject = template.subject;
  let htmlBody = template.html_body;
  let textBody = template.text_body || '';

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const replacement = String(value);
    subject = subject.replace(new RegExp(placeholder, 'g'), replacement);
    htmlBody = htmlBody.replace(new RegExp(placeholder, 'g'), replacement);
    textBody = textBody.replace(new RegExp(placeholder, 'g'), replacement);
  });

  return {
    subject,
    html_body: htmlBody,
    text_body: textBody,
  };
}

/**
 * Send test email
 */
export async function sendTestEmail(
  templateId: string,
  recipientEmail: string,
  testData: Record<string, any>,
  sentBy?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('email_template_test_sends').insert([
      {
        template_id: templateId,
        sent_to: recipientEmail,
        test_data: testData,
        sent_by: sentBy,
        status: 'Success',
      },
    ]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error logging test send:', error);
    return false;
  }
}

/**
 * Get test send history
 */
export async function getTestSendHistory(
  templateId: string
): Promise<EmailTemplateTestSend[]> {
  try {
    const { data, error } = await supabase
      .from('email_template_test_sends')
      .select('*')
      .eq('template_id', templateId)
      .order('sent_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching test send history:', error);
    return [];
  }
}

/**
 * Search templates
 */
export async function searchTemplates(
  query: string
): Promise<EmailTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,slug.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching templates:', error);
    return [];
  }
}

/**
 * Get template usage statistics
 */
export async function getTemplateStats(templateId: string): Promise<{
  total_sent: number;
  success_rate: number;
  last_sent: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('status, sent_at')
      .eq('template_id', templateId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        total_sent: 0,
        success_rate: 0,
        last_sent: null,
      };
    }

    const totalSent = data.length;
    const successful = data.filter(
      (log) => log.status === 'sent' || log.status === 'delivered'
    ).length;
    const successRate = (successful / totalSent) * 100;
    const lastSent = data.sort(
      (a, b) =>
        new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    )[0]?.sent_at;

    return {
      total_sent: totalSent,
      success_rate: successRate,
      last_sent: lastSent,
    };
  } catch (error) {
    console.error('Error fetching template stats:', error);
    return null;
  }
}

/**
 * Validate template variables
 */
export function validateTemplateVariables(
  template: EmailTemplate,
  providedVariables: Record<string, any>
): { valid: boolean; missing: string[] } {
  const required = template.variables || [];
  const provided = Object.keys(providedVariables);
  const missing = required.filter((v) => !provided.includes(v));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get sample data for template testing
 */
export function getSampleTemplateData(): Record<string, any> {
  return {
    user_name: 'John Smith',
    user_email: 'john@example.com',
    user_phone: '(555) 123-4567',
    booking_id: 'BK-12345',
    service_name: 'House Cleaning',
    scheduled_date: 'March 15, 2025',
    scheduled_time: '2:00 PM',
    location: '123 Main St, City, ST 12345',
    amount: '$150.00',
    platform_fee: '$15.00',
    total_amount: '$165.00',
    receipt_url: 'https://dollarsmiley.com/receipt/123',
    provider_name: 'Jane Doe',
    provider_rating: '4.8',
    provider_phone: '(555) 987-6543',
    platform_name: 'Dollarsmiley',
    support_email: 'support@dollarsmiley.com',
    platform_url: 'https://dollarsmiley.com',
    action_url: 'https://dollarsmiley.com/booking/123',
    verification_code: '123456',
  };
}
