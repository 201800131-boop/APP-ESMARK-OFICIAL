import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Clock3 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from './ui/button';
import './AnimatedOrderList.css';

type AnimatedOrderTone = 'danger' | 'warning' | 'success';

interface AnimatedOrder {
  id?: string | number;
  number?: string | number;
  order_number?: string | number;
  code?: string;
  customer_name?: string;
  client_name?: string;
  name?: string;
  due_date?: string;
}

interface AnimatedOrderListProps {
  orders: AnimatedOrder[];
  tone: AnimatedOrderTone;
  emptyMessage: string;
  onSelect: (order: AnimatedOrder) => void;
  onViewAll: () => void;
}

const VISIBLE_ORDERS = 2;
const ROTATION_INTERVAL_MS = 3200;

const toneIcons = {
  danger: Clock3,
  warning: AlertTriangle,
  success: CheckCircle2,
};

function getOrderName(order: AnimatedOrder) {
  return order.customer_name || order.client_name || order.name || 'Pedido sin nombre';
}

function getOrderNumber(order: AnimatedOrder) {
  return order.number || order.order_number || order.code || 'N/A';
}

function getValidDueDate(order: AnimatedOrder) {
  if (!order.due_date) return null;
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(order.due_date);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(order.due_date);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getOrderTime(order: AnimatedOrder, tone: AnimatedOrderTone) {
  const dueDate = getValidDueDate(order);

  if (tone === 'success') {
    return dueDate
      ? `Entrega ${dueDate.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })}`
      : 'Listo para entregar';
  }

  if (!dueDate) return tone === 'danger' ? 'Fecha vencida' : 'Próximo a vencer';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  const daysDifference = Math.round((dueDate.getTime() - today.getTime()) / 86400000);

  if (tone === 'danger') {
    const daysOverdue = Math.abs(daysDifference);
    return `Vencido hace ${daysOverdue} día${daysOverdue === 1 ? '' : 's'}`;
  }

  if (daysDifference === 0) return 'Vence hoy';
  if (daysDifference === 1) return 'Vence mañana';
  return `Vence ${dueDate.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })}`;
}

export default function AnimatedOrderList({
  orders,
  tone,
  emptyMessage,
  onSelect,
  onViewAll,
}: AnimatedOrderListProps) {
  const [cursor, setCursor] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const Icon = toneIcons[tone];

  const orderSignature = orders
    .map((order, index) => order.id ?? order.number ?? order.order_number ?? `${order.name}-${index}`)
    .join('|');

  useEffect(() => {
    setCursor(0);
  }, [orderSignature]);

  useEffect(() => {
    if (reduceMotion || isPaused || orders.length <= VISIBLE_ORDERS) return;

    const interval = window.setInterval(() => {
      setCursor((current) => (current + 1) % orders.length);
    }, ROTATION_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isPaused, orders.length, reduceMotion]);

  const visibleOrders = useMemo(() => {
    if (orders.length <= VISIBLE_ORDERS) {
      return orders.map((order, sourceIndex) => ({ order, sourceIndex }));
    }

    return Array.from({ length: VISIBLE_ORDERS }, (_, offset) => {
      const sourceIndex = (cursor + offset) % orders.length;
      return { order: orders[sourceIndex], sourceIndex };
    });
  }, [cursor, orders]);

  if (orders.length === 0) {
    return (
      <div className={`animated-order-list animated-order-list--${tone}`}>
        <div className="animated-order-list__empty">
          <span className="animated-order-list__empty-icon">
            <Icon aria-hidden="true" />
          </span>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`animated-order-list animated-order-list--${tone}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="animated-order-list__viewport">
        <div className="animated-order-list__items" role="list">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleOrders.map(({ order, sourceIndex }, visibleIndex) => (
              <motion.button
                layout
                type="button"
                role="listitem"
                key={`${order.id ?? order.number ?? order.order_number ?? order.name ?? 'order'}-${sourceIndex}`}
                className="animated-order-list__item"
                initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -22, scale: 0.97 }}
                transition={{
                  duration: reduceMotion ? 0.1 : 0.34,
                  delay: reduceMotion ? 0 : visibleIndex * 0.05,
                  ease: 'easeOut',
                }}
                whileHover={reduceMotion ? undefined : { scale: 1.025, x: 2 }}
                onClick={() => onSelect(order)}
                aria-label={`Ver pedido ${getOrderNumber(order)} de ${getOrderName(order)}`}
              >
                <span className="animated-order-list__icon">
                  <Icon aria-hidden="true" />
                </span>

                <span className="animated-order-list__copy">
                  <strong>{getOrderName(order)}</strong>
                  <span>Pedido #{getOrderNumber(order)}</span>
                </span>

                <span className="animated-order-list__time">{getOrderTime(order, tone)}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
        <div className="animated-order-list__fade" aria-hidden="true" />
      </div>

      <div className="animated-order-list__footer">
        <span>
          Mostrando {Math.min(VISIBLE_ORDERS, orders.length)} de {orders.length}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onViewAll}>
          Ver todos
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
