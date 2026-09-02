export interface NewOrderSummary {
  id: number;
  First_name: string;
  Last_name: string;
  order_date: string | null;
  cust_email: string;
  phone: string | null;
  phone_extension: string | null;
  grand_total: string | number | null;
  admin: string | null;
  admin_id: number | null;
  salesperson: string | null;
  non_sale: boolean | number;
  shipped: boolean | number;
  ship_date: string | null;
}
export interface ShippingAddress {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
}

export interface OrderItem {
  description: string;
  price: string | number | null;
}

export interface NewOrderDetail extends NewOrderSummary {
  company: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  sku: string | null;
  classification?: string | null;
  item_description: string | null;
  subtotal: string | number | null;
  sales_tax: string | number | null;
  shipping_type: string | null;
  shipping_price: string | number | null;
  orderinstructions: string | null;
  shipping: ShippingAddress;
  items: OrderItem[];
}

export interface SalespersonOption {
  id: number;
  name: string;
  active: boolean;
}

export interface NewOrderPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface NewOrderInput extends ShippingAddress {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_extension: string;
  company: string;
  non_sale: boolean;
  admin_id: number | null;
}
