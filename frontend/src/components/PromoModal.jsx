import { useNavigate } from 'react-router-dom';
import { FiX, FiArrowRight } from 'react-icons/fi';
import { formatPrice } from '../utils/formatPrice';

const PromoModal = ({ promo, onClose }) => {
  const navigate = useNavigate();

  const handleCta = () => {
    onClose();
    const dest = promo.ctaUrl || `/promo/${promo.id}`;
    if (dest.startsWith('/')) {
      navigate(dest);
    } else {
      window.location.href = dest;
    }
  };

  const promoLabel = promo.promotionType === 'FIXED_PRICE_BUNDLE'
    ? `${promo.minQuantity} prendas por ${formatPrice(promo.promotionalPrice)}`
    : promo.discountPercentage
      ? `${promo.discountPercentage}% de descuento`
      : null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-surface border border-border rounded-[var(--radius-lg)] w-full max-w-md overflow-hidden shadow-2xl">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <FiX size={16} />
        </button>

        {/* Image */}
        {promo.imageUrl && (
          <div className="relative h-52 overflow-hidden">
            <img
              src={promo.imageUrl}
              alt={promo.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className={`px-7 pb-7 ${promo.imageUrl ? '-mt-6 relative' : 'pt-10'}`}>
          {promoLabel && (
            <span className="inline-block text-xs font-medium tracking-widest uppercase text-dim border border-border px-3 py-1 rounded-full mb-4">
              Oferta especial
            </span>
          )}

          <h2 className="font-heading text-2xl font-bold leading-tight mb-2">
            {promo.title}
          </h2>

          {promo.description && (
            <p className="text-sm text-muted mb-5 leading-relaxed">{promo.description}</p>
          )}

          {promoLabel && (
            <div className="bg-surface2 border border-border rounded-[var(--radius-md)] px-4 py-3 mb-6">
              <p className="text-sm text-white font-medium">{promoLabel}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleCta}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {promo.ctaText || 'Ver promoción'}
              <FiArrowRight size={16} />
            </button>
            <button onClick={onClose} className="text-xs text-muted hover:text-white transition-colors text-center py-1">
              Seguir comprando
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromoModal;
