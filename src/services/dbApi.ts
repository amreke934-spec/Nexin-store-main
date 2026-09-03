import { CustomerUser, OrderItem, DepositMethod, DepositRequest } from '../types';

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
 * Fetch fresh user profile (including current balance) from DB
 */
export async function fetchUserProfile(idOrEmail: string): Promise<CustomerUser | null> {
  try {
    const res = await fetch(`/api/users/profile/${encodeURIComponent(idOrEmail)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
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

export interface SyncProcessingOrdersResponse {
  success: boolean;
  totalChecked: number;
  updatedCount: number;
  completedCount: number;
  stillProcessingCount: number;
  rejectedCount: number;
  orders: any[];
  message: string;
  error?: string;
}

/**
 * Trigger backend check exclusively for orders in processing/pending status
 */
export async function syncProcessingOrdersInDb(options?: {
  orderIds?: string[];
  userId?: string;
}): Promise<SyncProcessingOrdersResponse> {
  try {
    const res = await fetch('/api/sc/orders/check-processing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderIds: options?.orderIds,
        userId: options?.userId,
      }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      totalChecked: 0,
      updatedCount: 0,
      completedCount: 0,
      stillProcessingCount: 0,
      rejectedCount: 0,
      orders: [],
      message: err.message || 'فشل الاتصال بخدمة التحقق من الطلبات',
      error: err.message,
    };
  }
}

// ==========================================
// DEPOSIT METHODS & REQUESTS API CLIENT
// ==========================================

/**
 * Fetch all available deposit methods
 */
export async function fetchDepositMethods(): Promise<DepositMethod[]> {
  try {
    const res = await fetch('/api/deposit-methods');
    if (!res.ok) return [];
    const data = await res.json();
    return data.methods || [];
  } catch (err) {
    console.error('Failed to fetch deposit methods:', err);
    return [];
  }
}

/**
 * Save all deposit methods (array)
 */
export async function saveDepositMethods(methods: DepositMethod[]): Promise<{ success: boolean; methods?: DepositMethod[]; error?: string }> {
  try {
    const res = await fetch('/api/deposit-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ methods }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل حفظ طرق الإيداع' };
  }
}

/**
 * Save or update single deposit method
 */
export async function saveDepositMethod(method: Partial<DepositMethod>): Promise<{ success: boolean; methods?: DepositMethod[]; error?: string }> {
  try {
    const res = await fetch('/api/deposit-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل حفظ طريقة الإيداع' };
  }
}

/**
 * Delete a deposit method by ID
 */
export async function deleteDepositMethod(id: string): Promise<{ success: boolean; methods?: DepositMethod[]; error?: string }> {
  try {
    const res = await fetch(`/api/deposit-methods/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل حذف طريقة الإيداع' };
  }
}

/**
 * Fetch deposit requests (all for admin, or for a specific user)
 */
export async function fetchDepositRequests(userId?: string, status?: string): Promise<DepositRequest[]> {
  try {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (status) params.append('status', status);

    const url = `/api/deposit-requests${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.requests || [];
  } catch (err) {
    console.error('Failed to fetch deposit requests:', err);
    return [];
  }
}

/**
 * Submit a new deposit request by a registered user
 */
export async function submitDepositRequest(payload: {
  userId: string;
  methodId: string;
  amount: number;
  txNumber: string;
  notes?: string;
}): Promise<{ success: boolean; request?: DepositRequest; error?: string }> {
  try {
    const res = await fetch('/api/deposit-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل إرسال طلب الإيداع' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال بالخادم' };
  }
}

/**
 * Admin: Update deposit request status (Approve & Credit Balance, or Reject)
 */
export async function updateDepositRequestStatus(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  rejectionReason?: string,
  adminEmail?: string
): Promise<{ success: boolean; request?: DepositRequest; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/deposit-requests/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason, adminEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل تحديث حالة الطلب' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال بالخادم' };
  }
}

