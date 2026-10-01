import { COURIER_STATUS_LABEL, ORDER_STATUS_LABEL } from '../lib/format';
import type { CourierStatus, OrderStatus } from '../lib/types';

const ORDER_TONE: Record<OrderStatus, string> = {
  EN_ATTENTE: 'badge-orange',
  ASSIGNEE: 'badge-blue',
  EN_LIVRAISON: 'badge-blue',
  LIVREE: 'badge-green',
};

const COURIER_TONE: Record<CourierStatus, string> = {
  LIBRE: 'badge-green',
  EN_LIVRAISON: 'badge-blue',
  INDISPONIBLE: 'badge-grey',
};

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <span className={`badge ${ORDER_TONE[status]}`}>{ORDER_STATUS_LABEL[status]}</span>
);

export const CourierStatusBadge = ({ status }: { status: CourierStatus }) => (
  <span className={`badge ${COURIER_TONE[status]}`}>{COURIER_STATUS_LABEL[status]}</span>
);
