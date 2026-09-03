export interface MerchantInfo {
  id?: string | number;
  name?: string;
  username?: string;
  email?: string;
  balance: number;
  currency?: string;
  status?: string;
  role?: string;
  storeName?: string;
  lastUpdated?: string;
  emailVerified?: boolean;
  identityVerified?: boolean;
}

export interface DynamicFieldConfig {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: string[];
  helperText?: string;
}

export interface Product {
  id: string | number;
  productId: string | number;
  name: string;
  category: string;
  gameName?: string;
  sectionKey?: string;
  price: number;
  supplierPrice?: number;
  originalPrice?: number;
  pricePerUnit?: number;
  currency?: string;
  image?: string;
  description?: string;
  dynamicFields?: string[] | DynamicFieldConfig[];
  inStock?: boolean;
  stockCount?: number;
  badge?: string;
  popular?: boolean;
  minQty?: number;
  maxQty?: number;
  isAmount?: boolean;
  feeRate?: number;
  note?: string;
  isCash?: boolean;
  cashType?: string;
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  apiKey?: string;
  balance?: number;
  currency?: string;
  role?: 'customer' | 'merchant' | 'admin';
  savedPlayerIds?: Record<string, string>;
  createdAt: string;
}

export interface OrderOptions {
  playerId?: string;
  qty?: number;
  dynamicFields?: Record<string, string>;
}

export interface CreateOrderPayload {
  productId: string | number;
  qty: number;
  dynamicFields: Record<string, any>;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | number;
  productName: string;
  category?: string;
  qty: number;
  price: number;
  total: number;
  currency: string;
  dynamicFields: Record<string, any>;
  status: 'completed' | 'processing' | 'pending' | 'failed' | 'refunded' | string;
  createdAt: string;
  customerName?: string;
  customerEmail?: string;
  notes?: string;
  rawResponse?: any;
}

export interface OrderTrackingQuery {
  orderIds: string;
}

export interface StoreBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  actionType?: 'url' | 'category' | 'none';
  targetCategory?: string;
  badgeText?: string;
  isActive?: boolean;
  order?: number;
}

export interface DepositMethod {
  id: string;
  name: string; // اسم طريقة الإيداع
  currency: string; // عملة الإيداع (مثال: SYP, USDT, USD, TRY)
  exchangeRateToSyp: number; // سعر صرف عملة الإيداع مقابل الليرة السورية
  depositAddress: string; // عنوان الإيداع (رقم هاتف، محفظة، حساب بنكي)
  minDeposit: number; // أقل مبلغ يمكن إيداعه
  maxDeposit: number; // أقصى مبلغ يمكن إيداعه
  details: string; // تفاصيل الإيداع (نص مع دعم الفراغات والأسطر)
  icon: string; // ايقونة طريقة الإيداع (رابط صورة أو اسم أيقونة)
  feeEnabled: boolean; // الرسوم مفعلة للطريقة أم لا
  feePercentage: number; // قيمة نسبة الرسوم مثال 2%
  isActive?: boolean; // حالة تفعيل الطريقة
  order?: number; // ترتيب العرض
  createdAt?: string;
  updatedAt?: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  methodId: string;
  methodName: string;
  currency: string;
  exchangeRateToSyp: number;
  amount: number; // المبلغ المدخل
  feeAmount: number; // قيمة الرسوم
  feePercentage: number; // نسبة الرسوم
  netAmount: number; // المبلغ الصافي
  sypAmount: number; // المبلغ بالليرة السورية المضاف للرصيد
  txNumber: string; // رقم العملية
  depositAddress: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

