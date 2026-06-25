import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services';
import { formatPrice } from '../utils/formatPrice';
import { toast } from 'react-toastify';
import { FiTruck, FiCreditCard, FiCheck, FiShield, FiPackage, FiTag } from 'react-icons/fi';

const STEPS = [
  { id: 1, label: 'Envío', icon: FiTruck },
  { id: 2, label: 'Pago', icon: FiCreditCard },
  { id: 3, label: 'Confirmar', icon: FiCheck },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, clearCart, getCartSubtotal, getCartTotal, appliedPromotion } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [shippingData, setShippingData] = useState({
    fullName: '', phone: '', address: '', city: '', state: '', zipCode: '', country: 'Colombia',
  });

  const [paymentData, setPaymentData] = useState({ paymentMethod: 'mercadopago' });

  useEffect(() => {
    if (cart.length === 0) navigate('/cart');
    if (user) {
      setShippingData(prev => ({
        ...prev,
        fullName: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || 'Colombia',
      }));
    }
  }, [cart, navigate, user]);

  const handleShippingChange = e => {
    const { name, value } = e.target;
    setShippingData(prev => ({ ...prev, [name]: value }));
  };

  const validateShipping = () => {
    const { fullName, phone, address, city } = shippingData;
    if (!fullName || !phone || !address || !city) {
      toast.error('Completa todos los campos obligatorios');
      return false;
    }
    if (fullName.length < 3) { toast.error('Nombre demasiado corto'); return false; }
    if (!/^[0-9]{7,15}$/.test(phone.replace(/\s/g, ''))) {
      toast.error('Número de teléfono inválido');
      return false;
    }
    if (address.length < 10) { toast.error('Dirección demasiado corta (mínimo 10 caracteres)'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Send only productId, quantity, size, color — the server computes the price.
      // Never send price or totalAmount — those are computed server-side from the DB.
      const orderItems = cart.map(item => ({
        productId: item.id || item._id,
        quantity: item.quantity,
        size: item.size || null,
        color: item.color || null,
      }));

      const orderData = {
        items: orderItems,
        shippingAddress: shippingData,
        paymentMethod: paymentData.paymentMethod,
        ...(appliedPromotion?.id ? { promotionId: appliedPromotion.id } : {}),
      };

      const response = await orderService.createOrder(orderData);

      if (paymentData.paymentMethod === 'mercadopago') {
        const preference = await orderService.createPaymentPreference(response.id);
        if (preference?.initPoint) {
          window.location.href = preference.initPoint;
          return;
        }
        toast.error('No se pudo iniciar Mercado Pago. Intenta de nuevo.');
        return;
      }

      toast.success('¡Pedido confirmado!');
      clearCart();
      setTimeout(() => navigate('/orders'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al procesar el pedido');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = getCartSubtotal();
  const total = getCartTotal();
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (cart.length === 0) return null;

  return (
    <div className="min-h-screen pt-4 pb-24 bg-bg">
      <div className="container-xl max-w-5xl">
        {/* Logo centered */}
        <div className="text-center mb-10">
          <span className="font-heading text-lg font-light tracking-[0.38em] text-white uppercase pl-[0.38em]">ELITE</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-12 select-none">
          {STEPS.map((s, i) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-[0.18em] transition-colors duration-300 ${
                    isActive ? 'text-white font-medium' : isDone ? 'text-neutral-400 font-light' : 'text-dim'
                  }`}>
                    {s.id}. {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-10 sm:w-16 h-px mx-4 ${step > s.id ? 'bg-white' : 'bg-border/60'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Form */}
          <div className="lg:col-span-3">

            {/* Step 1: Shipping */}
            {step === 1 && (
              <div className="bg-surface/30 border border-border rounded-none p-6 md:p-8 animate-fadeIn">
                <h2 className="font-heading text-sm uppercase tracking-[0.15em] font-light text-white mb-8 border-b border-border/40 pb-3">Dirección de Envío</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">Nombre Completo *</label>
                      <input type="text" name="fullName" value={shippingData.fullName} onChange={handleShippingChange} className="input-underlined" required />
                    </div>
                    <div>
                      <label className="form-label">Teléfono *</label>
                      <input type="tel" name="phone" value={shippingData.phone} onChange={handleShippingChange} className="input-underlined" placeholder="+57 300 000 0000" required />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Dirección *</label>
                    <input type="text" name="address" value={shippingData.address} onChange={handleShippingChange} className="input-underlined" placeholder="Calle 123 #45-67, Apto 101" required />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="form-label">Ciudad *</label>
                      <input type="text" name="city" value={shippingData.city} onChange={handleShippingChange} className="input-underlined" required />
                    </div>
                    <div>
                      <label className="form-label">Departamento</label>
                      <input type="text" name="state" value={shippingData.state} onChange={handleShippingChange} className="input-underlined" />
                    </div>
                    <div>
                      <label className="form-label">Código Postal</label>
                      <input type="text" name="zipCode" value={shippingData.zipCode} onChange={handleShippingChange} className="input-underlined" />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">País</label>
                    <input type="text" name="country" value={shippingData.country} onChange={handleShippingChange} className="input-underlined" />
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4">
                  <button onClick={() => { if (validateShipping()) setStep(2); }} className="btn-primary">
                    Continuar al Pago
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="bg-surface/30 border border-border rounded-none p-6 md:p-8 animate-fadeIn">
                <h2 className="font-heading text-sm uppercase tracking-[0.15em] font-light text-white mb-8 border-b border-border/40 pb-3">Método de Pago</h2>

                <div className="space-y-4 mb-8">
                  {[
                    { value: 'mercadopago', label: 'Mercado Pago', sub: 'PSE, Nequi, tarjetas de crédito y débito' },
                    { value: 'cash_on_delivery', label: 'Pago Contra Entrega', sub: 'Paga al recibir en tu domicilio' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-4 p-4 border rounded-none cursor-pointer transition-all duration-300 ${
                        paymentData.paymentMethod === opt.value ? 'border-white bg-white/5' : 'border-border bg-transparent hover:border-border-light'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 transition-all duration-300 flex items-center justify-center ${
                        paymentData.paymentMethod === opt.value ? 'border-white bg-white' : 'border-dim'
                      }`}>
                        {paymentData.paymentMethod === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={opt.value}
                        checked={paymentData.paymentMethod === opt.value}
                        onChange={e => setPaymentData({ paymentMethod: e.target.value })}
                        className="sr-only"
                      />
                      <div>
                        <p className="text-xs uppercase tracking-wider font-medium text-white">{opt.label}</p>
                        <p className="text-[11px] text-neutral-400 mt-1 font-light">{opt.sub}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button onClick={() => setStep(1)} className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">← Volver</button>
                  <button onClick={() => setStep(3)} className="btn-primary">Revisar Pedido</button>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <div className="bg-surface/30 border border-border rounded-none p-6 md:p-8 animate-fadeIn">
                <h2 className="font-heading text-sm uppercase tracking-[0.15em] font-light text-white mb-8 border-b border-border/40 pb-3">Confirmar Pedido</h2>

                {/* Shipping summary */}
                <div className="bg-neutral-950/35 border border-border/80 rounded-none p-4.5 mb-5 space-y-1">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/40">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Dirección de Envío</p>
                    <button onClick={() => setStep(1)} className="text-[9px] uppercase tracking-wider text-neutral-400 hover:text-white underline underline-offset-2 transition-colors">Editar</button>
                  </div>
                  <p className="text-xs text-white font-medium">{shippingData.fullName}</p>
                  <p className="text-xs text-neutral-400 font-light">{shippingData.address}</p>
                  <p className="text-xs text-neutral-400 font-light">{shippingData.city}{shippingData.state && `, ${shippingData.state}`} {shippingData.zipCode}</p>
                  <p className="text-xs text-neutral-400 font-light">Tel: {shippingData.phone}</p>
                </div>

                {/* Payment summary */}
                <div className="bg-neutral-950/35 border border-border/80 rounded-none p-4.5 mb-6 space-y-1">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/40">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Método de Pago</p>
                    <button onClick={() => setStep(2)} className="text-[9px] uppercase tracking-wider text-neutral-400 hover:text-white underline underline-offset-2 transition-colors">Editar</button>
                  </div>
                  <p className="text-xs text-white font-medium">
                    {paymentData.paymentMethod === 'mercadopago' ? 'Mercado Pago' : 'Pago Contra Entrega'}
                  </p>
                </div>

                {/* Products */}
                <div className="space-y-4 mb-8">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-3 border-b border-border/30 pb-2">Productos en tu Pedido</p>
                  {cart.map(item => {
                    const itemId = item.id || item._id;
                    return (
                      <div key={`${itemId}-${item.size}-${item.color}`} className="flex gap-4 items-center">
                        <div className="w-14 h-18 bg-neutral-900 border border-border/50 rounded-none overflow-hidden flex-shrink-0">
                          {item.images?.[0]
                            ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-dim"><FiPackage size={20} strokeWidth={1} /></div>
                          }
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-xs font-medium text-white truncate capitalize">{item.name}</p>
                          <p className="text-[10px] text-neutral-400 font-light mt-1 uppercase tracking-wide">
                            {[item.size && `Talla ${item.size}`, item.color].filter(Boolean).join(' · ')}
                            {' · '}Cant {item.quantity}
                          </p>
                        </div>
                        <p className="text-xs font-medium text-white flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button onClick={() => setStep(2)} className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">← Volver</button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Procesando...' : paymentData.paymentMethod === 'mercadopago' ? 'Pagar con Mercado Pago' : 'Confirmar Pedido'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-surface/30 border border-border rounded-none p-6 sticky top-24">
              <h2 className="font-heading font-light text-xs uppercase tracking-[0.15em] text-white mb-6 pb-3 border-b border-border/40">
                Resumen del Pedido
              </h2>

              {/* Items preview */}
              <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-1">
                {cart.map(item => {
                  const itemId = item.id || item._id;
                  return (
                    <div key={`${itemId}-${item.size}-${item.color}`} className="flex gap-3 items-center">
                      <div className="relative w-12 h-16 bg-neutral-900 border border-border/50 rounded-none overflow-hidden flex-shrink-0">
                        {item.images?.[0]
                          ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-dim"><FiPackage size={16} strokeWidth={1} /></div>
                        }
                        <span className="absolute -top-1.5 -right-1.5 bg-neutral-700 text-white text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold border border-bg select-none">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-light text-neutral-300 truncate capitalize">{item.name}</p>
                        {(item.size || item.color) && (
                          <p className="text-[9px] text-neutral-500 font-light mt-0.5 uppercase tracking-wider">
                            {[item.size, item.color].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <p className="text-xs font-medium text-white flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-4 mb-4" />

              <div className="space-y-2.5 text-xs font-light text-neutral-400 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal ({itemCount} prendas)</span>
                  <span className={appliedPromotion ? 'line-through text-neutral-500' : ''}>{formatPrice(subtotal)}</span>
                </div>
                {appliedPromotion && (
                  <div className="flex justify-between text-green-400">
                    <span className="flex items-center gap-1"><FiTag size={10} /> {appliedPromotion.title}</span>
                    <span>-{formatPrice(appliedPromotion.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span className="text-green-500 font-normal">Gratis</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 mb-4" />

              <div className="flex justify-between text-sm font-medium text-white">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              <div className="mt-6 pt-4 border-t border-border/50 text-[10px] text-neutral-500 flex items-center gap-2.5 font-light">
                <FiShield size={12} className="text-neutral-400" /> Tus datos están seguros y encriptados
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
