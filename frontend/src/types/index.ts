export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  fullName?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  status: string;
  banUntil?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  product_count?: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  image_url?: string;
  category_id?: number;
  category_name?: string;
  featured: boolean;
  discount_percent: number;
  brand?: string;
  average_rating: number;
  review_count: number;
  sale_price: number;
  images?: { id: number; imageUrl: string }[];
}

export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string;
  discountPercent: number;
  salePrice: number;
  lineTotal: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
}

export interface Coupon {
  id: number;
  code: string;
  discount_percent: number;
  active: boolean;
  start_date?: string;
  end_date?: string;
  max_uses?: number;
  used_count: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  productDescription?: string;
}

export interface Order {
  id: number;
  user_id: number;
  username: string;
  email: string;
  coupon_id?: number;
  total_amount: number;
  discount_amount: number;
  status: string;
  shipping_name: string;
  shipping_address: string;
  shipping_phone: string;
  note?: string;
  created_at: string;
  items: OrderItem[];
}

export interface Review {
  id: number;
  user_id: number;
  username: string;
  product_id: number;
  rating: number;
  comment?: string;
  created_at: string;
}



export interface PriceHistory {
  id: number;
  product_id: number;
  old_price: number;
  new_price: number;
  old_discount: number;
  new_discount: number;
  changed_at: string;
}
