import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { promotionService } from '../services';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatPrice';
import { FiShoppingCart, FiCheck, FiChevronLeft, FiPlus, FiMinus } from 'react-icons/fi';
import { toast } from 'react-toastify';

const PromoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addComboToCart } = useCart();

  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // selections: array of { product, size, color } — length up to minQuantity
  const [selections, setSelections] = useState([]);
  // track which slot is being configured
  const [activeSlot, setActiveSlot] = useState(null);

  useEffect(() => {
    promotionService.getPublicPromotion(id)
      .then(data => {
        setPromo(data);
        setSelections([]);
      })
      .catch(() => setError('Promoción no encontrada o no disponible'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-20">
        <div className="container-xl">
          <div className="skeleton h-10 w-64 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="card skeleton h-64" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !promo) {
    return (
      <div className="min-h-screen pt-20 pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted mb-4">{error || 'Promoción no encontrada'}</p>
          <button onClick={() => navigate('/')} className="btn-ghost">Volver al inicio</button>
        </div>
      </div>
    );
  }

  const required = promo.minQuantity || 1;
  const eligible = promo.products || [];

  const totalSelectedQty = selections.reduce((sum, s) => sum + (s.qty || 1), 0);
  const isComplete = totalSelectedQty >= required;
  const remaining = required - totalSelectedQty;

  const originalTotal = selections.reduce((sum, s) => sum + (s.product.price * (s.qty || 1)), 0);
  const promoPrice = promo.promotionType === 'FIXED_PRICE_BUNDLE'
    ? promo.promotionalPrice
    : originalTotal * (1 - (promo.discountPercentage || 0) / 100);
  const savings = originalTotal - promoPrice;

  const addSelection = (product) => {
    if (totalSelectedQty >= required) {
      toast.info(`Ya tienes los ${required} productos requeridos`);
      return;
    }
    setSelections(prev => {
      const existing = prev.find(s => s.product.id === product.id && s.size === null && s.color === null);
      if (existing) {
        return prev.map(s =>
          s.product.id === product.id && s.size === null && s.color === null
            ? { ...s, qty: (s.qty || 1) + 1 }
            : s
        );
      }
      return [...prev, { product, size: null, color: null, qty: 1, slotId: Date.now() }];
    });
  };

  const removeSelection = (slotId) => {
    setSelections(prev => {
      const target = prev.find(s => s.slotId === slotId);
      if (!target) return prev;
      if ((target.qty || 1) > 1) {
        return prev.map(s => s.slotId === slotId ? { ...s, qty: s.qty - 1 } : s);
      }
      return prev.filter(s => s.slotId !== slotId);
    });
  };

  const setSlotSize = (slotId, size) => {
    setSelections(prev => prev.map(s => s.slotId === slotId ? { ...s, size } : s));
  };

  const setSlotColor = (slotId, color) => {
    setSelections(prev => prev.map(s => s.slotId === slotId ? { ...s, color } : s));
  };

  const handleAddToCart = () => {
    const missingVariant = selections.find(s =>
      (s.product.sizes?.length > 0 && !s.size) ||
      (s.product.colors?.length > 0 && !s.color)
    );
    if (missingVariant) {
      toast.error(`Elige talla y color para: ${missingVariant.product.name}`);
      return;
    }
    // Expand qty-based selections into individual items
    const items = [];
    for (const s of selections) {
      for (let i = 0; i < (s.qty || 1); i++) {
        items.push({ product: s.product, size: s.size, color: s.color });
      }
    }
    addComboToCart(promo, items);
    navigate('/cart');
  };

  return (
    <div className="min-h-screen pt-6 pb-24">
      <div className="container-xl">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors mb-8"
        >
          <FiChevronLeft size={16} /> Volver
        </button>

        {/* Header */}
        <div className="mb-10">
          {promo.imageUrl && (
            <div className="relative h-48 md:h-64 rounded-[var(--radius-lg)] overflow-hidden mb-8">
              <img src={promo.imageUrl} alt={promo.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="font-heading text-3xl md:text-4xl font-bold">{promo.title}</h1>
                {promo.description && <p className="text-sm text-muted mt-1">{promo.description}</p>}
              </div>
            </div>
          )}
          {!promo.imageUrl && (
            <div className="mb-6">
              <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">{promo.title}</h1>
              {promo.description && <p className="text-muted">{promo.description}</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: product grid */}
          <div className="lg:col-span-2">

            {/* Progress bar */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">
                  {isComplete
                    ? <span className="text-green-400 flex items-center gap-1.5"><FiCheck size={15} /> Combo completo</span>
                    : `Has elegido ${totalSelectedQty} de ${required}`}
                </span>
                {!isComplete && (
                  <span className="text-xs text-muted">Te {remaining === 1 ? 'falta' : 'faltan'} {remaining}</span>
                )}
              </div>
              <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalSelectedQty / required) * 100)}%` }}
                />
              </div>
            </div>

            {/* Product grid */}
            {eligible.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-muted">No hay productos configurados para esta promoción todavía.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {eligible.map(product => {
                  const selInCombo = selections.filter(s => s.product.id === product.id);
                  const qtyInCombo = selInCombo.reduce((n, s) => n + (s.qty || 1), 0);
                  const isSelected = qtyInCombo > 0;

                  return (
                    <div
                      key={product.id}
                      className={`card overflow-hidden transition-all duration-200 ${isSelected ? 'border-white/40' : 'hover:border-border-light'}`}
                    >
                      {/* Image */}
                      <div className="relative aspect-square overflow-hidden bg-surface2 -mx-4 -mt-4 mb-4">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-dim text-xs">Sin imagen</div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold">
                            {qtyInCombo}
                          </div>
                        )}
                      </div>

                      <h3 className="font-medium text-sm mb-1 line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-muted mb-3">{formatPrice(product.price)}</p>

                      <button
                        onClick={() => addSelection(product)}
                        disabled={isComplete && !isSelected}
                        className={`btn-primary w-full text-xs py-2 ${isComplete && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        {isSelected ? `Agregar otra (${qtyInCombo})` : 'Seleccionar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: summary panel */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24 space-y-5">
              <h2 className="font-heading font-semibold text-base border-b border-border pb-4">
                Tu selección
              </h2>

              {selections.length === 0 ? (
                <p className="text-sm text-muted py-4 text-center">
                  Elige {required} productos de la grilla
                </p>
              ) : (
                <div className="space-y-3">
                  {selections.map(sel => (
                    <div key={sel.slotId} className="border border-border rounded-[var(--radius-md)] p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-sm font-medium line-clamp-1">{sel.product.name}</span>
                        <button onClick={() => removeSelection(sel.slotId)} className="text-dim hover:text-red-400 transition-colors flex-shrink-0">
                          <FiMinus size={14} />
                        </button>
                      </div>

                      {/* Size selector */}
                      {sel.product.sizes?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-dim mb-1">Talla</p>
                          <div className="flex flex-wrap gap-1">
                            {sel.product.sizes.map(sz => (
                              <button
                                key={sz}
                                onClick={() => setSlotSize(sel.slotId, sz)}
                                className={`text-xs px-2 py-1 border rounded transition-colors ${sel.size === sz ? 'border-white text-white' : 'border-border text-muted hover:border-border-light'}`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Color selector */}
                      {sel.product.colors?.length > 0 && (
                        <div>
                          <p className="text-xs text-dim mb-1">Color</p>
                          <div className="flex flex-wrap gap-1">
                            {sel.product.colors.map(col => (
                              <button
                                key={col}
                                onClick={() => setSlotColor(sel.slotId, col)}
                                className={`text-xs px-2 py-1 border rounded transition-colors ${sel.color === col ? 'border-white text-white bg-white/10' : 'border-border text-muted hover:border-border-light'}`}
                              >
                                {col}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted mt-2">
                        {formatPrice(sel.product.price)} × {sel.qty || 1} = {formatPrice(sel.product.price * (sel.qty || 1))}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Price summary */}
              {selections.length > 0 && (
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted">
                    <span>Precio original</span>
                    <span className={isComplete ? 'line-through' : ''}>{formatPrice(originalTotal)}</span>
                  </div>
                  {isComplete && (
                    <>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Precio promo</span>
                        <span>{formatPrice(promoPrice)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-green-400">
                        <span>Ahorro</span>
                        <span>-{formatPrice(savings)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={handleAddToCart}
                disabled={!isComplete}
                className={`btn-primary w-full flex items-center justify-center gap-2 ${!isComplete ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <FiShoppingCart size={16} />
                {isComplete ? 'Agregar combo al carrito' : `Elige ${remaining} más`}
              </button>

              {isComplete && savings > 0 && (
                <p className="text-xs text-green-400 text-center">
                  ¡Ahorras {formatPrice(savings)} con esta promoción!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromoDetail;
