
export interface Product {
  id: string;
  name: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  deliveryDate: string;
  observations: string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export enum Tab {
  Orders = 'orders',
  Products = 'products'
}
