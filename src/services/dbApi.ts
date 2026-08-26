import { CustomerUser, OrderItem } from '../types';

export interface DbStatusResponse {
  connected: boolean;
  hasConfig: boolean;
  error: string | null;
  tables?: string[];
  tablesCount?: number;
}

export interface RegisterUserPayload {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  avatar?: string;
}

export interface LoginUserPayload {
  identifier: string; // email or phone
  password?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: CustomerUser;
  orders?: OrderItem[];
  error?: string;
}

/**
 * Check Neon PostgreSQL connection status and auto-migration info
 */
export async function checkDbStatus(): Promise<DbStatusResponse> {
  try {
    const res = await fetch('/api/db/status');
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      connected: false,
      hasConfig: false,
      error: err.message || 'Failed to check DB status',
    };
  }
}

/**
 * Force trigger database schema initialization / auto-push
 */
export async function triggerDbMigration(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/db/init', { method: 'POST' });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Migration trigger failed' };
  }
}

/**
 * Register user in Neon Database
 */
export async function registerUserInDb(payload: RegisterUserPayload): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل إنشاء الحساب' };
    }
    return { success: true, user: data.user, orders: data.orders || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال بقاعدة البيانات' };
  }
}

/**
 * Log in user from Neon Database (by email or phone)
 */
export async function loginUserInDb(payload: LoginUserPayload): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'بيانات الدخول غير صحيحة' };
    }
    return { success: true, user: data.user, orders: data.orders || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال بقاعدة البيانات' };
  }
}

/**
 * Save user Player IDs per game/category to Neon DB
 */
export async function savePlayerIdToDb(userId: string, category: string, playerId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/users/save-player-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, category, playerId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch all orders for a user from Neon DB
 */
export async function fetchUserOrdersFromDb(userId: string): Promise<OrderItem[]> {
  try {
    const res = await fetch(`/api/orders?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.orders || [];
  } catch {
    return [];
  }
}

/**
 * Save new order into Neon DB
 */
export async function saveOrderToDb(order: OrderItem, userId?: string): Promise<{ success: boolean; orderId?: string }> {
  try {
    const res = await fetch('/api/orders/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, userId }),
    });
    const data = await res.json();
    return { success: res.ok, orderId: data.orderId };
  } catch {
    return { success: false };
  }
}

/**
 * Fetch exchange rate or setting from Neon DB
 */
export async function fetchStoreSetting<T = any>(key: string, defaultValue?: T): Promise<T | null> {
  try {
    const res = await fetch(`/api/settings/${encodeURIComponent(key)}`);
    if (!res.ok) return defaultValue ?? null;
    const data = await res.json();
    return data.value ?? defaultValue ?? null;
  } catch {
    return defaultValue ?? null;
  }
}

/**
 * Save store setting to Neon DB
 */
export async function saveStoreSetting(key: string, value: any): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ==========================================
// ADMIN DASHBOARD & MANAGEMENT API CLIENT
// ==========================================

export interface AdminStatsData {
  totalUsers: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  failedOrders: number;
  refundedOrders?: number;
  totalRevenueUsd: number;
  totalUsersBalance: number;
  recentOrders: OrderItem[];
}

export interface AdminUserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  balance: number;
  currency: string;
  role: string;
  avatar?: string;
  savedPlayerIds?: Record<string, string>;
  createdAt: string;
  updatedAt?: string;
  ordersCount: number;
  totalSpent: number;
}

export interface AdminOrderCheckResult {
  orderId: string;
  foundInDb: boolean;
  dbOrder?: OrderItem | null;
  scData?: any;
  scError?: string | null;
}

/**
 * Fetch overview statistics for the admin dashboard
 */
export async function fetchAdminStats(): Promise<AdminStatsData | null> {
  try {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch admin stats:', err);
    return null;
  }
}

/**
 * Fetch all registered users from DB for admin management
 */
export async function fetchAdminUsers(): Promise<AdminUserData[]> {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) return [];
    const data = await res.json();
    return data.users || [];
  } catch (err) {
    console.error('Failed to fetch admin users:', err);
    return [];
  }
}

/**
 * Update user details from admin panel
 */
export async function updateAdminUser(
  userId: string,
  payload: {
    name?: string;
    email?: string;
    phone?: string;
    balance?: number;
    role?: string;
    password?: string;
  }
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل تحديث بيانات المستخدم' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'تعذر الاتصال بالخادم' };
  }
}

/**
 * Delete a user from admin panel
 */
export async function deleteAdminUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل حذف المستخدم' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'تعذر الاتصال بالخادم' };
  }
}

/**
 * Create a new user manually from admin panel
 */
export async function createAdminUser(payload: {
  name: string;
  email: string;
  phone?: string;
  balance?: number;
  role?: string;
  password?: string;
}): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const res = await fetch('/api/admin/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل إضافة المستخدم' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'تعذر الاتصال بالخادم' };
  }
}

/**
 * Comprehensive Order Lookup (Database + SC Store API Live)
 */
export async function checkAdminOrderDetails(orderId: string): Promise<AdminOrderCheckResult | null> {
  try {
    const res = await fetch(`/api/admin/order-check/${encodeURIComponent(orderId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to inspect order:', err);
    return null;
  }
}

