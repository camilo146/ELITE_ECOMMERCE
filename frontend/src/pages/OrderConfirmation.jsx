import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { orderService } from '../services';
import { formatPrice } from '../utils/formatPrice';
import { FiCheckCircle, FiClock, FiXCircle, FiPackage, FiArrowRight } from 'react-icons/fi';

const STATUS_CONFIG = {
  approved: {
    icon: FiCheckCircle,
    iconColor: 'text-green-400',
    title: '¡Pago Aprobado!',
    subtitle: 'Tu pedido ha sido confirmado y está siendo procesado.',
    badgeText: 'Aprobado',
    badgeClass: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  pending: {
    icon: FiClock,
    iconColor: 'text-yellow-400',
    title: 'Pago Pendiente',
    subtitle: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
    badgeText: 'Pendiente',
    badgeClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  failure: {
    icon: FiXCircle,
    iconColor: 'text-red-400',
    title: 'Pago Fallido',
    subtitle: 'No pudimos procesar tu pago. Por favor intenta de nuevo.',
    badgeText: 'Fallido',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
};

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
  const orderId = searchParams.get('external_reference');

  // URL params from MP are only used as a hint while we fetch the real status.
  // The authoritative status always comes from the server — never trusted from the URL.
  const urlHint = searchParams.get('collection_status') || searchParams.get('status') || 'pending';

  // Server-authoritative status derived from the fetched order
  const [serverStatus, setServerStatus] = useState(null);

  // Display whichever is available: server status preferred over URL hint
  const rawStatus = serverStatus || urlHint;
  const status = rawStatus === 'rejected' || rawStatus === 'FAILED' ? 'failure'
    : rawStatus === 'APPROVED' || rawStatus === 'approved' ? 'approved'
    : 'pending';

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.failure;
  const Icon = config.icon;
  const isSuccess = status === 'approved';
  const isPending = status === 'pending';

  useEffect(() => {
    if (!orderId) return;
    setLoadingOrder(true);
    orderService.getOrderById(orderId)
      .then(data => {
        setOrder(data);
        // Use server-provided paymentStatus as the single source of truth
        if (data?.paymentStatus) {
          setServerStatus(data.paymentStatus.toLowerCase());
        }
      })
      .catch(() => { /* server fetch failed — fall back to URL hint */ })
      .finally(() => setLoadingOrder(false));
  }, [orderId]);

  useEffect(() => {
    // Only clear cart once the server confirms the payment
    if (serverStatus === 'approved' || serverStatus === 'APPROVED') {
      clearCart();
    }
  }, [serverStatus, clearCart]);

  return (
    <div className="min-h-screen pt-4 pb-24 bg-bg flex items-start justify-center">
      <div className="container-xl max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-12">
          <span className="font-heading text-lg font-light tracking-[0.38em] text-white uppercase pl-[0.38em]">ELITE</span>
        </div>

        {/* Status card */}
        <div className="bg-surface/30 border border-border rounded-none p-8 md:p-12 text-center mb-6">
          <div className="flex justify-center mb-6">
            <Icon size={52} className={config.iconColor} strokeWidth={1.25} />
          </div>

          <span className={`inline-block text-[9px] uppercase tracking-[0.2em] font-semibold px-3 py-1 border rounded-none mb-5 ${config.badgeClass}`}>
            {config.badgeText}
          </span>

          <h1 className="font-heading text-xl font-light tracking-[0.12em] text-white uppercase mb-3">
            {config.title}
          </h1>
          <p className="text-xs text-neutral-400 font-light max-w-md mx-auto leading-relaxed">
            {config.subtitle}
          </p>

          {(orderId || paymentId) && (
            <div className="mt-6 pt-6 border-t border-border/40 flex justify-center gap-8 text-[10px] text-neutral-500 font-light">
              {orderId && (
                <div>
                  <span className="uppercase tracking-wider block mb-1">Pedido #</span>
                  <span className="text-white font-medium">{orderId}</span>
                </div>
              )}
              {paymentId && (
                <div>
                  <span className="uppercase tracking-wider block mb-1">Pago #</span>
                  <span className="text-white font-medium">{paymentId}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order summary (best-effort) */}
        {!loadingOrder && order && (isSuccess || isPending) && (
          <div className="bg-surface/20 border border-border/60 rounded-none p-6 mb-6">
            <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-400 mb-4">Resumen del Pedido</p>
            <div className="space-y-3 mb-4">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-10 h-13 bg-neutral-900 border border-border/40 flex-shrink-0 flex items-center justify-center">
                    {item.product?.images?.[0]
                      ? <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                      : <FiPackage size={14} className="text-dim" strokeWidth={1} />
                    }
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-xs text-white font-light capitalize truncate">{item.product?.name}</p>
                    <p className="text-[10px] text-neutral-500 font-light uppercase tracking-wide mt-0.5">
                      {[item.size && `Talla ${item.size}`, item.color].filter(Boolean).join(' · ')} · ×{item.quantity}
                    </p>
                  </div>
                  <p className="text-xs text-white font-medium flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-border/40 pt-3 flex justify-between text-xs">
              <span className="text-neutral-400 font-light">Total</span>
              <span className="text-white font-medium">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {(isSuccess || isPending) ? (
            <>
              <Link
                to="/orders"
                className="flex-1 flex items-center justify-center gap-2 btn-primary text-center"
              >
                Ver Mis Pedidos <FiArrowRight size={13} />
              </Link>
              <Link
                to="/products"
                className="flex-1 flex items-center justify-center gap-2 btn-ghost text-center"
              >
                Seguir Comprando
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate(-2)}
                className="flex-1 btn-primary"
              >
                Intentar de Nuevo
              </button>
              <Link to="/products" className="flex-1 btn-ghost text-center">
                Volver a Productos
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
