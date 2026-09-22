import { CustomerUser, OrderItem, DepositMethod, DepositRequest, SupportTicket } from '../types';

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
  requiresVerification?: boolean;
  email?: string;
  message?: string;
  cooldownSeconds?: number;
  expiresInMinutes?: number;
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
 * Register user in Neon Database (requires instant OTP verification)
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
      return { 
        success: false, 
        error: data.error || 'فشل إنشاء الحساب',
        requiresVerification: data.requiresVerification,
        email: data.email,
      };
    }
    return { 
      success: true, 
      user: data.user, 
      orders: data.orders || [],
      requiresVerification: data.requiresVerification,
      email: data.email,
      message: data.message,
      expiresInMinutes: data.expiresInMinutes,
    };
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
      return { 
        success: false, 
        error: data.error || 'بيانات الدخول غير صحيحة',
        requiresVerification: data.requiresVerification,
        email: data.email,
      };
    }
    return { 
      success: true, 
      user: data.user, 
      orders: data.orders || [],
      requiresVerification: data.requiresVerification,
      email: data.email,
      message: data.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال بقاعدة البيانات' };
  }
}

/**
 * Verify 6-digit email OTP
 */
export async function verifyEmailOtp(email: string, code: string): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل التحقق من الرمز' };
    }
    return {
      success: true,
      user: data.user,
      orders: data.orders || [],
      message: data.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال بخادم التحقق' };
  }
}

/**
 * Resend 6-digit email OTP
 */
export async function resendEmailOtp(email: string): Promise<{ success: boolean; message?: string; error?: string; cooldownSeconds?: number }> {
  try {
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { 
        success: false, 
        error: data.error || 'تعذر إعادة إرسال الرمز',
        cooldownSeconds: data.cooldownSeconds,
      };
    }
    return { 
      success: true, 
      message: data.message || 'تم إرسال رمز جديد بنجاح',
      cooldownSeconds: data.cooldownSeconds,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال بخادم التحقق' };
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
 * Clear all orders for a user from Neon DB
 */
export async function clearUserOrdersInDb(userId?: string, email?: string): Promise<boolean> {
  try {
    const res = await fetch('/api/orders/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email }),
    });
    return res.ok;
  } catch {
    return false;
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
 * Helper to execute fetch with retry for transient network / cold-start errors
 */
async function fetchWithRetry(url: string, options?: RequestInit, retries = 2, delayMs = 350): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

const fallbackAdminStats: AdminStatsData = {
  totalUsers: 0,
  totalOrders: 0,
  completedOrders: 0,
  pendingOrders: 0,
  failedOrders: 0,
  refundedOrders: 0,
  totalRevenueUsd: 0,
  totalUsersBalance: 0,
  recentOrders: [],
};

const fallbackAdminUsers: AdminUserData[] = [];

/**
 * Fetch overview statistics for the admin dashboard
 */
export async function fetchAdminStats(): Promise<AdminStatsData | null> {
  try {
    const res = await fetchWithRetry('/api/admin/stats');
    if (!res.ok) return fallbackAdminStats;
    const data = await res.json();
    return data || fallbackAdminStats;
  } catch (err) {
    console.warn('Could not fetch live admin stats, using fallback stats:', err);
    return fallbackAdminStats;
  }
}

/**
 * Fetch all registered users from DB for admin management
 */
export async function fetchAdminUsers(): Promise<AdminUserData[]> {
  try {
    const res = await fetchWithRetry('/api/admin/users');
    if (!res.ok) return fallbackAdminUsers;
    const data = await res.json();
    return Array.isArray(data?.users) ? data.users : fallbackAdminUsers;
  } catch (err) {
    console.warn('Could not fetch live admin users, using fallback users:', err);
    return fallbackAdminUsers;
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
  } catch {
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
 * Default fallback methods if network is temporarily unreachable
 */
const DEFAULT_FALLBACK_DEPOSIT_METHODS: DepositMethod[] = [
  {
    id: 'method_sham_cash',
    name: 'Sham Cash SYP شام كاش سوري',
    currency: 'SYP',
    exchangeRateToSyp: 1,
    depositAddress: '31494aa660809ce08459d1639019ba2d',
    minDeposit: 1000,
    maxDeposit: 5000000,
    details: '1. افتح تطبيق شام كاش على هاتفك.\n2. قم بتحويل المبلغ المطلوب الى الحساب المذكور\n3. بعد نجاح التحويل، أدخل رقم إشعار العملية لتأكيد وشحن رصيدك فوراً.\n\nإسم الحساب: أحمد دياب جعفر',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRLf-AWLcNAj29nDaqZA2ROkwv4JHOXwNQi-3bGylRKcg&s=10',
    feeEnabled: false,
    feePercentage: 0,
    isActive: true,
    order: 1,
  }
];

/**
 * Fetch all available deposit methods with silent retry and localStorage cache fallback
 */
export async function fetchDepositMethods(): Promise<DepositMethod[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('/api/deposit-methods');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.methods) && data.methods.length > 0) {
          try {
            localStorage.setItem('nx_cached_deposit_methods', JSON.stringify(data.methods));
          } catch {
            // ignore storage quota
          }
          return data.methods;
        }
      }
    } catch {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }
    }
  }

  try {
    const cached = localStorage.getItem('nx_cached_deposit_methods');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  return DEFAULT_FALLBACK_DEPOSIT_METHODS;
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
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (status) params.append('status', status);

  const url = `/api/deposit-requests${params.toString() ? `?${params.toString()}` : ''}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.requests) ? data.requests : [];
      }
    } catch {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }
    }
  }

  return [];
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

/**
 * Submit a new Support Ticket / Issue Report
 */
export async function createSupportTicket(payload: {
  userId?: string | null;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  subject: string;
  category?: string;
  message: string;
  priority?: string;
}): Promise<{ success: boolean; ticket?: SupportTicket; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل إرسال البلاغ' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال بالخادم' };
  }
}

/**
 * Fetch Support Tickets (for customer or admin)
 */
export async function fetchSupportTickets(params?: {
  userId?: string;
  userEmail?: string;
  isAdmin?: boolean;
}): Promise<{ success: boolean; tickets: SupportTicket[]; error?: string }> {
  try {
    const query = new URLSearchParams();
    if (params?.userId) query.set('userId', params.userId);
    if (params?.userEmail) query.set('userEmail', params.userEmail);
    if (params?.isAdmin) query.set('isAdmin', 'true');

    const res = await fetch(`/api/support/tickets?${query.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      return { success: false, tickets: [], error: data.error || 'فشل جلب البلاغات' };
    }
    return { success: true, tickets: data.tickets || [] };
  } catch (err: any) {
    return { success: false, tickets: [], error: err.message || 'فشل الاتصال بالخادم' };
  }
}

/**
 * Admin: Reply to a Support Ticket
 */
export async function replySupportTicket(
  id: string,
  adminReply: string,
  status: string = 'resolved',
  adminEmail?: string
): Promise<{ success: boolean; ticket?: SupportTicket; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/support/tickets/${encodeURIComponent(id)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminReply, status, adminEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل إرسال الرد' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال بالخادم' };
  }
}

/**
 * Admin: Update Support Ticket Status
 */
export async function updateSupportTicketStatus(
  id: string,
  status: string
): Promise<{ success: boolean; ticket?: SupportTicket; error?: string }> {
  try {
    const res = await fetch(`/api/support/tickets/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل تحديث الحالة' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال بالخادم' };
  }
}

/**
 * Admin: Delete a Support Ticket
 */
export async function deleteSupportTicket(
  id: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/support/tickets/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل حذف البلاغ' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال بالخادم' };
  }
}


