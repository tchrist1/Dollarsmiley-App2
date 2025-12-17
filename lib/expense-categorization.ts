import { supabase } from './supabase';

// Expense Categorization Types
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  is_tax_deductible: boolean;
  icon?: string;
  color?: string;
  is_system: boolean;
  sort_order: number;
  created_at: string;
}

export interface ExpenseTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface BookingCategorization {
  id: string;
  booking_id: string;
  expense_category_id?: string;
  is_manual: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseBreakdown {
  category_name: string;
  category_color: string;
  total_amount: number;
  booking_count: number;
  is_tax_deductible: boolean;
}

export interface BookingWithTag {
  booking_id: string;
  total_price: number;
  booking_date: string;
  provider_name: string;
  service_name: string;
}

// Get all expense categories
export async function getExpenseCategories(
  includeSubcategories: boolean = true
): Promise<ExpenseCategory[]> {
  try {
    let query = supabase
      .from('expense_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!includeSubcategories) {
      query = query.is('parent_category_id', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as ExpenseCategory[];
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return [];
  }
}

// Get category by ID
export async function getExpenseCategory(categoryId: string): Promise<ExpenseCategory | null> {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('id', categoryId)
      .maybeSingle();

    if (error) throw error;
    return data as ExpenseCategory;
  } catch (error) {
    console.error('Error fetching expense category:', error);
    return null;
  }
}

// Get subcategories for a parent category
export async function getSubcategories(parentCategoryId: string): Promise<ExpenseCategory[]> {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('parent_category_id', parentCategoryId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as ExpenseCategory[];
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return [];
  }
}

// Get user's expense tags
export async function getUserExpenseTags(userId: string): Promise<ExpenseTag[]> {
  try {
    const { data, error } = await supabase
      .from('expense_tags')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as ExpenseTag[];
  } catch (error) {
    console.error('Error fetching expense tags:', error);
    return [];
  }
}

// Create expense tag
export async function createExpenseTag(
  userId: string,
  name: string,
  color: string = '#8E8E93'
): Promise<ExpenseTag | null> {
  try {
    const { data, error } = await supabase
      .from('expense_tags')
      .insert({
        user_id: userId,
        name,
        color,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ExpenseTag;
  } catch (error) {
    console.error('Error creating expense tag:', error);
    return null;
  }
}

// Update expense tag
export async function updateExpenseTag(
  tagId: string,
  updates: { name?: string; color?: string }
): Promise<boolean> {
  try {
    const { error } = await supabase.from('expense_tags').update(updates).eq('id', tagId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating expense tag:', error);
    return false;
  }
}

// Delete expense tag
export async function deleteExpenseTag(tagId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('expense_tags').delete().eq('id', tagId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting expense tag:', error);
    return false;
  }
}

// Auto-categorize booking
export async function autoCategorizeBooking(bookingId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('auto_categorize_booking', {
      p_booking_id: bookingId,
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error auto-categorizing booking:', error);
    return null;
  }
}

// Manually categorize booking
export async function categorizeBooking(
  bookingId: string,
  categoryId: string,
  notes?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('categorize_booking', {
      p_booking_id: bookingId,
      p_expense_category_id: categoryId,
      p_notes: notes || null,
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error categorizing booking:', error);
    return null;
  }
}

// Get booking categorization
export async function getBookingCategorization(
  bookingId: string
): Promise<BookingCategorization | null> {
  try {
    const { data, error } = await supabase
      .from('booking_expense_categorizations')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (error) throw error;
    return data as BookingCategorization;
  } catch (error) {
    console.error('Error fetching booking categorization:', error);
    return null;
  }
}

// Add tag to booking
export async function addBookingTag(bookingId: string, tagId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('add_booking_tag', {
      p_booking_id: bookingId,
      p_tag_id: tagId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding booking tag:', error);
    return false;
  }
}

// Remove tag from booking
export async function removeBookingTag(bookingId: string, tagId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('remove_booking_tag', {
      p_booking_id: bookingId,
      p_tag_id: tagId,
    });

    if (error) throw error;
    return data as boolean;
  } catch (error) {
    console.error('Error removing booking tag:', error);
    return false;
  }
}

// Get booking tags
export async function getBookingTags(bookingId: string): Promise<ExpenseTag[]> {
  try {
    const { data, error } = await supabase
      .from('booking_expense_tags')
      .select('tag_id, expense_tags(*)')
      .eq('booking_id', bookingId);

    if (error) throw error;
    return (data || []).map((item: any) => item.expense_tags).filter(Boolean) as ExpenseTag[];
  } catch (error) {
    console.error('Error fetching booking tags:', error);
    return [];
  }
}

// Get expense breakdown by category
export async function getExpenseBreakdownByCategory(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ExpenseBreakdown[]> {
  try {
    const { data, error } = await supabase.rpc('get_expense_breakdown_by_category', {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) throw error;
    return (data || []) as ExpenseBreakdown[];
  } catch (error) {
    console.error('Error fetching expense breakdown:', error);
    return [];
  }
}

// Get bookings by tag
export async function getBookingsByTag(
  userId: string,
  tagId: string
): Promise<BookingWithTag[]> {
  try {
    const { data, error } = await supabase.rpc('get_bookings_by_tag', {
      p_user_id: userId,
      p_tag_id: tagId,
    });

    if (error) throw error;
    return (data || []) as BookingWithTag[];
  } catch (error) {
    console.error('Error fetching bookings by tag:', error);
    return [];
  }
}

// Get tax-deductible expenses
export async function getTaxDeductibleExpenses(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ExpenseBreakdown[]> {
  try {
    const breakdown = await getExpenseBreakdownByCategory(userId, startDate, endDate);
    return breakdown.filter((item) => item.is_tax_deductible);
  } catch (error) {
    console.error('Error fetching tax-deductible expenses:', error);
    return [];
  }
}

// Calculate total tax-deductible amount
export async function calculateTaxDeductibleAmount(
  userId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  try {
    const breakdown = await getTaxDeductibleExpenses(userId, startDate, endDate);
    return breakdown.reduce((sum, item) => sum + Number(item.total_amount), 0);
  } catch (error) {
    console.error('Error calculating tax-deductible amount:', error);
    return 0;
  }
}

// Get category icon name
export function getCategoryIcon(iconName?: string): string {
  const iconMap: Record<string, string> = {
    briefcase: 'briefcase',
    user: 'user',
    home: 'home',
    'file-text': 'file-text',
    calendar: 'calendar',
    heart: 'heart',
    book: 'book',
    car: 'car',
    music: 'music',
    'more-horizontal': 'more-horizontal',
  };
  return iconMap[iconName || 'more-horizontal'] || 'more-horizontal';
}

// Predefined tag colors
export const TAG_COLORS = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#FF3B30', // Red
  '#5856D6', // Purple
  '#FF2D55', // Pink
  '#00C7BE', // Teal
  '#FFD60A', // Yellow
  '#BF5AF2', // Violet
  '#8E8E93', // Gray
];

// Get random tag color
export function getRandomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

// Format category name for display
export function formatCategoryName(category: ExpenseCategory): string {
  if (category.parent_category_id) {
    return `  ${category.name}`; // Indent subcategory
  }
  return category.name;
}

// Check if expense is tax deductible
export function isExpenseTaxDeductible(category?: ExpenseCategory): boolean {
  return category?.is_tax_deductible ?? false;
}

// Get category hierarchy
export async function getCategoryHierarchy(): Promise<
  Map<string, { category: ExpenseCategory; children: ExpenseCategory[] }>
> {
  try {
    const categories = await getExpenseCategories(true);
    const hierarchy = new Map<
      string,
      { category: ExpenseCategory; children: ExpenseCategory[] }
    >();

    // First pass: add all parent categories
    categories
      .filter((cat) => !cat.parent_category_id)
      .forEach((cat) => {
        hierarchy.set(cat.id, { category: cat, children: [] });
      });

    // Second pass: add children
    categories
      .filter((cat) => cat.parent_category_id)
      .forEach((cat) => {
        const parent = hierarchy.get(cat.parent_category_id!);
        if (parent) {
          parent.children.push(cat);
        }
      });

    return hierarchy;
  } catch (error) {
    console.error('Error building category hierarchy:', error);
    return new Map();
  }
}
