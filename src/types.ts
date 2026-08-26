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

