import { useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { formatPrice } from '../utils/formatPrice';

const PromoBanner = ({ promos }) => {
  const navigate = useNavigate();

  if (!promos || promos.length === 0) return null;

  const handleClick = (promo) => {
    const dest = promo.ctaUrl || `/promo/${promo.id}`;
    if (dest.startsWith('/')) navigate(dest);
    else window.location.href = dest;
  };

  const promoLabel = (promo) => {
    if (promo.promotionType === 'FIXED_PRICE_BUNDLE')
      return `${promo.minQuantity} prendas por ${formatPrice(promo.promotionalPrice)}`;
    if (promo.discountPercentage)
      return `${promo.discountPercentage}% de descuento`;
    return null;
  };

  return (
    <section className="py-12 border-t border-border">
      <div className="container-xl">
        <p className="text-xs text-dim uppercase tracking-widest mb-6">Promociones activas</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map(promo => (
            <div
              key={promo.id}
              className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border group cursor-pointer"
              onClick={() => handleClick(promo)}
            >
              {promo.imageUrl ? (
                <div className="relative h-48">
                  <img
                    src={promo.imageUrl}
                    alt={promo.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <BannerContent promo={promo} label={promoLabel(promo)} />
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-surface2 h-48 flex flex-col justify-between">
                  <BannerContent promo={promo} label={promoLabel(promo)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const BannerContent = ({ promo, label }) => (
  <div className="flex flex-col gap-1">
    {label && (
      <span className="text-xs text-dim tracking-wider uppercase">{label}</span>
    )}
    <h3 className="font-heading text-base font-semibold leading-snug">{promo.title}</h3>
    {promo.description && (
      <p className="text-xs text-muted line-clamp-2 mt-0.5">{promo.description}</p>
    )}
    <span className="flex items-center gap-1 text-xs font-medium mt-2 text-white/80 group-hover:text-white transition-colors">
      {promo.ctaText || 'Ver más'} <FiArrowRight size={12} />
    </span>
  </div>
);

export default PromoBanner;
