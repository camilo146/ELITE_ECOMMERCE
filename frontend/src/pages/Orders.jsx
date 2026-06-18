import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../services';
import { formatPrice } from '../utils/formatPrice';
import { FiPackage, FiTruck, FiCheck, FiClock, FiX } from 'react-icons/fi';

const STATUS_STEPS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderService.getMyOrders()
      .then(data => setOrders(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getStatusInfo = (status) => {
    if (!status) return { label: 'Desconocido', icon: FiClock, badge: 'bg-surface2 text-muted border border-border' };

    const statusMap = {
      PENDING: { label: 'Pendiente', icon: FiClock, badge: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
      PROCESSING: { label: 'Procesando', icon: FiPackage, badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
      SHIPPED: { label: 'Enviado', icon: FiTruck, badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
      DELIVERED: { label: 'Entregado', icon: FiCheck, badge: 'bg-green-500/10 text-green-400 border border-green-500/20' },
      CANCELLED: { label: 'Cancelado', icon: FiX, badge: 'bg-sale/10 text-sale border border-sale/20' },
    };
    return statusMap[status.toUpperCase()] || statusMap.PENDING;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-8 pb-20">
        <div className="container-xl max-w-4xl">
          <div className="skeleton h-10 w-48 mb-8" />
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="card space-y-4">
                <div className="skeleton h-6 w-40" />
                <div className="skeleton h-4 w-56" />
                <div className="skeleton h-20 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="container-xl max-w-4xl">
        <h1 className="page-header mb-8">Mis Pedidos</h1>

        {orders.length === 0 ? (
          <div className="empty-state">
            <FiPackage size={52} strokeWidth={1} className="text-dim mb-4" />
            <h2 className="font-heading text-xl font-semibold mb-2">No tienes pedidos aún</h2>
            <p className="text-muted text-sm mb-6 max-w-xs">Explora la colección y realiza tu primera compra.</p>
            <Link to="/products" className="btn-primary">Ver Colección</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const orderIdDisplay = order.id || order._id;
              const statusInfo = getStatusInfo(order.orderStatus);
              const StatusIcon = statusInfo.icon;
              const currentIndex = STATUS_STEPS.indexOf(order.orderStatus?.toUpperCase());
              const isCancelled = order.orderStatus?.toUpperCase() === 'CANCELLED';

              return (
                <div key={orderIdDisplay} className="card">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-6 pb-6 border-b border-border">
                    <div>
                      <p className="font-heading text-lg font-semibold mb-1">
                        Pedido #{String(orderIdDisplay).slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(order.createdAt).toLocaleDateString('es-CO', {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${statusInfo.badge}`}>
                      <StatusIcon size={14} />
                      {statusInfo.label}
                    </div>
                  </div>

                  {!isCancelled && (
                    <div className="mb-6 pb-6 border-b border-border">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-dim mb-4">Seguimiento</p>
                      <div className="flex justify-between items-center">
                        {STATUS_STEPS.map((statusKey, index, array) => {
                          const info = getStatusInfo(statusKey);
                          const Icon = info.icon;
                          const stepIndex = STATUS_STEPS.indexOf(statusKey);
                          const isCompleted = stepIndex <= currentIndex;

                          return (
                            <div key={statusKey} className="flex items-center flex-1">
                              <div className="flex flex-col items-center">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors duration-200 ${
                                  isCompleted ? 'bg-white border-white text-black' : 'border-border text-dim bg-surface'
                                }`}>
                                  <Icon size={15} />
                                </div>
                                <span className={`text-[10px] mt-2 text-center ${isCompleted ? 'text-white' : 'text-dim'}`}>
                                  {info.label}
                                </span>
                              </div>
                              {index < array.length - 1 && (
                                <div className={`flex-1 h-px mx-2 mb-5 transition-colors duration-200 ${isCompleted && stepIndex < currentIndex ? 'bg-white' : 'bg-border'}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="mb-6 p-3 bg-sale/10 border border-sale/20 rounded-[var(--radius-md)] text-sale text-sm">
                      Este pedido fue cancelado
                    </div>
                  )}

                  <div className="mb-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-dim mb-3">Productos</p>
                    <div className="space-y-3">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex gap-4 p-3 bg-surface2/50 rounded-[var(--radius-md)] border border-border/50">
                          <div className="w-14 h-14 bg-surface rounded-[var(--radius)] overflow-hidden flex-shrink-0">
                            {item.product?.images?.[0] ? (
                              <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-dim"><FiPackage size={20} strokeWidth={1} /></div>
                            )}
                          </div>
                          <div className="flex-grow min-w-0">
                            <h4 className="text-sm font-medium capitalize truncate">{item.product?.name || 'Producto'}</h4>
                            <p className="text-xs text-muted mt-0.5">
                              {[item.size && `Talla ${item.size}`, item.color, `×${item.quantity}`].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <p className="text-sm font-semibold flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.shippingAddress && (
                    <div className="mb-6 p-4 bg-surface2/50 rounded-[var(--radius-md)] border border-border/50">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-dim mb-2">Envío</p>
                      <p className="text-sm">{order.shippingAddress.fullName}</p>
                      <p className="text-sm text-muted">{order.shippingAddress.address}</p>
                      <p className="text-sm text-muted">
                        {order.shippingAddress.city}{order.shippingAddress.state && `, ${order.shippingAddress.state}`} {order.shippingAddress.zipCode}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.totalAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Envío</span>
                      <span className="text-green-400">Gratis</span>
                    </div>
                    <div className="divider pt-3 mt-3 flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span>{formatPrice(order.totalAmount)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      order.paymentStatus === 'COMPLETED'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {order.paymentStatus === 'COMPLETED' ? <><FiCheck size={12} /> Pagado</> : 'Pendiente de pago'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
