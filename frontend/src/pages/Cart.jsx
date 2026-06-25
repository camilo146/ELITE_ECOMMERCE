import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { FiTrash2, FiMinus, FiPlus, FiArrowRight, FiArrowLeft, FiShoppingBag, FiPackage, FiShield, FiRefreshCw, FiTag, FiX } from 'react-icons/fi';
import { formatPrice } from '../utils/formatPrice';

const Cart = () => {
  const { cart, appliedPromotion, removeFromCart, updateQuantity, getCartSubtotal, getCartTotal, getCartCount, removeAppliedPromotion } = useCart();
  const count = getCartCount();
  const subtotal = getCartSubtotal();
  const total = getCartTotal();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <FiShoppingBag size={56} strokeWidth={1} className="text-dim mb-5" />
        <h1 className="font-heading text-3xl font-bold mb-3">Tu carrito está vacío</h1>
        <p className="text-muted text-sm mb-8 max-w-xs">
          Explora nuestra colección y encuentra tu próxima prenda favorita.
        </p>
        <Link to="/products" className="btn-primary">
          Ver Colección
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 pb-24 bg-bg">
      <div className="container-xl">
        <h1 className="text-2xl md:text-3xl font-light uppercase tracking-[0.08em] text-white mb-10 pb-4 border-b border-border/40">
          Carrito <span className="text-neutral-500 font-light text-sm tracking-widest lowercase">({count} {count === 1 ? 'prenda' : 'prendas'})</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items */}
          <div className="lg:col-span-2 space-y-0 divide-y divide-border/50">
            {cart.map(item => {
              const itemId = item.id || item._id;
              return (
                <div key={`${itemId}-${item.size}-${item.color}`} className="flex gap-5 py-6">
                  {/* Image */}
                  <Link to={`/product/${itemId}`} className="w-24 h-32 bg-[#141414] rounded-none overflow-hidden flex-shrink-0 border border-border/40">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-dim"><FiPackage size={28} strokeWidth={1} /></div>
                    )}
                  </Link>

                  {/* Details */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link to={`/product/${itemId}`} className="font-medium text-xs hover:text-neutral-400 tracking-wide transition-colors duration-300 leading-snug capitalize">
                        {item.name}
                      </Link>
                      <button
                        onClick={() => removeFromCart(itemId, item.size, item.color)}
                        className="text-dim hover:text-rose-700 transition-colors duration-300 flex-shrink-0"
                        aria-label="Eliminar"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>

                    {/* Variants */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.size && (
                        <span className="text-[9px] uppercase tracking-wider border border-border/80 text-neutral-400 px-2 py-0.5 rounded-none">
                          Talla {item.size}
                        </span>
                      )}
                      {item.color && (
                        <span className="text-[9px] uppercase tracking-wider border border-border/80 text-neutral-400 px-2 py-0.5 rounded-none">
                          {item.color}
                        </span>
                      )}
                    </div>

                    {/* Price + Qty */}
                    <div className="flex items-center justify-between pt-1">
                      <p className="font-medium text-sm text-white">{formatPrice(item.price * item.quantity)}</p>

                      <div className="flex items-center border border-border/80 rounded-none bg-neutral-950/20">
                        <button
                          onClick={() => updateQuantity(itemId, item.quantity - 1, item.size, item.color)}
                          className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white transition-colors duration-300"
                        >
                          <FiMinus size={11} />
                        </button>
                        <span className="w-8 text-center text-xs font-medium text-neutral-200">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(itemId, item.quantity + 1, item.size, item.color)}
                          disabled={item.stock && item.quantity >= item.stock}
                          className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white transition-colors duration-300 disabled:opacity-40"
                        >
                          <FiPlus size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-surface/30 border border-border rounded-none p-6 sticky top-24">
              <h2 className="font-heading font-light text-sm uppercase tracking-[0.15em] text-white mb-6 pb-3 border-b border-border/40">Resumen</h2>

              <div className="space-y-3 mb-6 text-xs font-light text-neutral-400">
                <div className="flex justify-between">
                  <span>Subtotal ({count} prendas)</span>
                  <span className={`font-normal ${appliedPromotion ? 'line-through text-neutral-500' : 'text-white'}`}>
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {/* Applied promotion */}
                {appliedPromotion && (
                  <div className="bg-green-400/5 border border-green-400/20 rounded-[var(--radius-md)] px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="flex items-center gap-1.5 text-green-400 font-medium">
                        <FiTag size={11} />
                        Promoción aplicada
                      </span>
                      <button onClick={removeAppliedPromotion} className="text-dim hover:text-white transition-colors flex-shrink-0" title="Quitar promoción">
                        <FiX size={12} />
                      </button>
                    </div>
                    <p className="text-green-300 text-[11px] mb-1 leading-snug">{appliedPromotion.title}</p>
                    <p className="text-green-400 font-medium">Ahorro: -{formatPrice(appliedPromotion.discount)}</p>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Envío</span>
                  <span className="text-green-500 font-normal">Gratis</span>
                </div>
                <div className="border-t border-border pt-3 mt-1" />
                <div className="flex justify-between text-sm font-medium text-white pt-1">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Link to="/checkout" className="btn-primary w-full flex items-center justify-center gap-2 py-4">
                Finalizar Compra <FiArrowRight size={14} />
              </Link>

              <Link to="/products" className="flex items-center justify-center gap-1.5 mt-5 text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-colors duration-300">
                <FiArrowLeft size={11} /> Seguir comprando
              </Link>

              {/* Trust badges */}
              <div className="mt-8 pt-5 border-t border-border/50 space-y-2.5 text-[10px] text-neutral-500 leading-relaxed font-light">
                <p className="flex items-center gap-2.5"><FiShield size={12} className="text-neutral-400" /> Pago seguro protegido con SSL</p>
                <p className="flex items-center gap-2.5"><FiRefreshCw size={12} className="text-neutral-400" /> Devoluciones sin costo hasta 30 días</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
