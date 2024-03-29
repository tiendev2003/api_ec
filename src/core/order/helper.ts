import { OrderDB } from '@/database/model/order';
import { OrderResult } from './interfaces';

export function _formatOrder(order: OrderDB): OrderResult {
  return {
    id: order._id,
    address: order.address,
    paymentMethod: order.paymentMethod,
    price: order.price,
    tax: order.tax,
    totalPrice: order.totalPrice,
    totalQuantity: order.totalQuantity,
    status: order.status,
  };
}
