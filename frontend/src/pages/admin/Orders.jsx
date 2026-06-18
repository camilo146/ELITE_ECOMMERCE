import { useState, useEffect } from 'react';
import { orderService } from '../../services';
import { toast } from 'react-toastify';
import { formatPrice } from '../../utils/formatPrice';
import { FiPackage } from 'react-icons/fi';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getAllOrders({ limit: 100 });
      // El backend devuelve un array directamente, no un objeto con propiedad orders
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      toast.success('Estado actualizado');
      fetchOrders();
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT': return 'border-l-4 border-orange-500 bg-orange-900/5 opacity-75';
      case 'PROCESSING': return 'border-l-4 border-blue-500';
      case 'SHIPPED': return 'border-l-4 border-purple-500';
      case 'DELIVERED': return 'border-l-4 border-green-500 bg-green-900/10';
      case 'CANCELLED': return 'border-l-4 border-red-500 bg-red-900/10';
      default: return 'border-l-4 border-gray-500';
    }
  };

  const getPaymentBadge = (paymentStatus) => {
    switch (paymentStatus) {
      case 'APPROVED': return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'PENDING': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'FAILED':
      case 'CANCELLED': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20';
    }
  };

  const paymentStatusLabel = (s) => ({
    APPROVED: 'Pagado', PENDING: 'Pendiente pago', FAILED: 'Fallido', CANCELLED: 'Cancelado', COMPLETED: 'Pagado'
  }[s] || s);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="container-xl">
        <h1 className="page-header mb-8">Pedidos</h1>

        {!orders || orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted text-lg">No hay pedidos registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
            <div key={order.id || order._id} className={`card transition-colors duration-300 ${getStatusColor(order.orderStatus)}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-bold">Pedido #{String(order.id || order._id).padStart(8, '0')}</p>
                    <span className={`text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-none ${getPaymentBadge(order.paymentStatus)}`}>
                      {paymentStatusLabel(order.paymentStatus)}
                    </span>
                    {order.orderStatus === 'PENDING_PAYMENT' && (
                      <span className="text-[9px] uppercase tracking-widest text-orange-400 font-semibold">⚠ No procesar</span>
                    )}
                  </div>
                  <p className="text-sm text-muted">Cliente: {order.user?.username || order.user?.email || 'N/A'}</p>
                  <p className="text-sm text-muted">{new Date(order.createdAt).toLocaleDateString('es-ES')}</p>
                </div>
                <select
                  value={order.orderStatus || 'PENDING_PAYMENT'}
                  onChange={(e) => handleStatusChange(order.id || order._id, e.target.value)}
                  className="input-field w-auto"
                  disabled={order.orderStatus === 'PENDING_PAYMENT' && order.paymentMethod === 'mercadopago'}
                  title={order.orderStatus === 'PENDING_PAYMENT' ? 'Esperando confirmación de pago' : ''}
                >
                  <option value="PENDING_PAYMENT">Esperando pago</option>
                  <option value="PROCESSING">Procesando</option>
                  <option value="SHIPPED">Enviado</option>
                  <option value="DELIVERED">Entregado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>
              <div className="border-t border-border pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Detalles de Envío */}
                  <div className="bg-surface2/50 p-4 rounded-lg">
                    <h4 className="font-bold text-blue-400 mb-2">Dirección de Envío</h4>
                    {order.shippingAddress ? (
                      <div className="text-sm text-muted space-y-1">
                        <p><span className="font-semibold">Nombre:</span> {order.shippingAddress.fullName || 'N/A'}</p>
                        <p><span className="font-semibold">Teléfono:</span> {order.shippingAddress.phone || 'N/A'}</p>
                        <p><span className="font-semibold">Dirección:</span> {order.shippingAddress.address}</p>
                        <p><span className="font-semibold">Ciudad:</span> {order.shippingAddress.city}, {order.shippingAddress.state}</p>
                        <p><span className="font-semibold">País:</span> {order.shippingAddress.country}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-dim">Sin información de envío</p>
                    )}
                  </div>

                  {/* Lista de Productos */}
                  <div className="bg-surface2/50 p-4 rounded-lg">
                    <h4 className="font-bold text-green-400 mb-2 flex items-center gap-2"><FiPackage size={14} /> Productos ({order.items?.length || 0})</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {order.items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                          <div>
                            <p className="font-semibold text-white">{item.product?.name || 'Producto desconocido'}</p>
                            <p className="text-xs text-muted">
                              {item.size && `Talla: ${item.size}`}
                              {item.size && item.color && ' • '}
                              {item.color && `Color: ${item.color}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white">x{item.quantity}</p>
                            <p className="text-xs text-muted">{formatPrice(item.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                  <div className="text-sm text-muted space-y-0.5">
                    <p>Método: <span className="text-white font-medium uppercase">{order.paymentMethod?.replace(/_/g, ' ')}</span></p>
                    <p>Estado pago: <span className={`font-medium ${order.paymentStatus === 'APPROVED' ? 'text-green-400' : order.paymentStatus === 'FAILED' ? 'text-red-400' : 'text-orange-400'}`}>{paymentStatusLabel(order.paymentStatus)}</span></p>
                  </div>
                  <p className="font-bold text-xl text-white">Total: {formatPrice(order.totalAmount)}</p>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
