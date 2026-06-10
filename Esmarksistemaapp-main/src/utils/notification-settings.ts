import { safeParse } from './safe-parse';

export const DEFAULT_NOTIFICATION_SETTINGS = {
  order_movements: true,
  new_orders: true,
  payment_updates: true,
  overdue_orders: true,
  expiring_orders: true,
  stock_low: true,
  close_day: true,
  trello_sync: false,
};

export type NotificationSettings = typeof DEFAULT_NOTIFICATION_SETTINGS;
export type NotificationSettingKey = keyof NotificationSettings;

export const NOTIFICATION_SETTINGS_EVENT = 'esmarkNotificationSettingsChanged';

export const getNotificationSettings = (): NotificationSettings => {
  const settings = safeParse(localStorage.getItem('esmark_settings'), {});
  if (!settings || typeof settings !== 'object') {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(settings.notification_settings || {}),
  };
};

export const isNotificationEnabled = (key: NotificationSettingKey): boolean => {
  return !!getNotificationSettings()[key];
};

export const notifyNotificationSettingsChanged = (settings: NotificationSettings) => {
  window.dispatchEvent(new CustomEvent(NOTIFICATION_SETTINGS_EVENT, { detail: settings }));
};

export const shouldShowFloatingNotification = (message: unknown, options?: any): boolean => {
  if (options?.mandatory === true) return true;

  const text = [
    message,
    options?.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!text.trim()) return true;

  const settings = getNotificationSettings();

  if (/(trello|sincroniz|tarjeta|importaci[oó]n|recargad)/i.test(text)) {
    return settings.trello_sync;
  }

  if (/(pedido guardado|nuevo pedido|pedido creado)/i.test(text)) {
    return settings.new_orders;
  }

  if (/(pedido archivado|estado actualizado|pedido entregado|listo para entrega|pedido movido|nuevo comentario)/i.test(text)) {
    return settings.order_movements;
  }

  if (/(pago registrado|abono|recibo vinculado|pagos? recibido)/i.test(text)) {
    return settings.payment_updates;
  }

  if (/(stock bajo|stock cr[ií]tico|inventario bajo|agotado)/i.test(text)) {
    return settings.stock_low;
  }

  if (/(vencido|fuera de fecha)/i.test(text)) {
    return settings.overdue_orders;
  }

  if (/(por vencer|pr[oó]xim[oa].*vencer|entrega.*hoy|entregas programadas)/i.test(text)) {
    return settings.expiring_orders;
  }

  if (/(d[ií]a cerrado|d[ií]a de trabajo|cierre de d[ií]a|conteo de efectivo|reporte exportado)/i.test(text)) {
    return settings.close_day;
  }

  return true;
};
