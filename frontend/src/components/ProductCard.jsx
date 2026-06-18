import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/formatPrice';
import { FiPackage } from 'react-icons/fi';

const COLOR_MAP = {
  'Negro': '#111111', 'Blanco': '#f5f5f5', 'Azul': '#1D4ED8',
  'Azul Oscuro': '#1E3A5F', 'Azul Marino': '#1E3A5F', 'Azul Claro': '#93C5FD',
  'Rojo': '#EF4444', 'Verde': '#22C55E', 'Verde Militar': '#4B5320',
  'Amarillo': '#EAB308', 'Gris': '#6B7280', 'Gris Melange': '#9CA3AF',
  'Beige': '#D4B896', 'Caqui': '#C3B091', 'Bordeaux': '#6D1A36',
  'Marrón': '#92400E', 'Azul/Blanco': '#3B82F6', 'Rojo/Negro': '#7F1D1D',
  'Verde/Negro': '#166534',
};

const ProductCard = ({ product }) => {
  const hasSecondImage = product.images && product.images.length > 1;
  const discount = product.onSale && product.salePrice
    ? Math.round(((product.salePrice - product.price) / product.salePrice) * 100)
    : null;

  return (
    <Link to={`/product/${product.id}`} className="product-card group block">
      {/* Image */}
      <div className="product-card__image-wrap rounded-none">
        {product.images?.[0] ? (
          <>
            <img
              src={product.images[0]}
              alt={product.name}
              className="product-card__img product-card__img--primary"
              loading="lazy"
            />
            {hasSecondImage && (
              <img
                src={product.images[1]}
                alt={`${product.name} — vista alternativa`}
                className="product-card__img product-card__img--secondary"
                loading="lazy"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dim">
            <FiPackage size={40} strokeWidth={1} />
          </div>
        )}

        {/* Badges */}
        <div className="product-card__badge flex flex-col gap-1.5">
          {discount && (
            <span className="badge-sale">−{discount}%</span>
          )}
          {product.isNew && !discount && (
            <span className="badge-new">Nuevo</span>
          )}
        </div>

        {/* Quick Add */}
        <div className="product-card__quick-add select-none">
          Ver producto
        </div>
      </div>

      {/* Info */}
      <div className="pt-4 space-y-1 min-h-[92px]">
        <p className="text-[9px] text-neutral-500 uppercase tracking-[0.2em] font-medium">
          {product.category ? product.category.charAt(0) + product.category.slice(1).toLowerCase() : ''}
        </p>
        <h3 className="text-xs sm:text-sm font-light text-neutral-200 group-hover:text-white transition-colors duration-300 leading-snug line-clamp-1 capitalize tracking-wide">{product.name}</h3>

        {/* Price */}
        <div className="flex items-center gap-2 pt-0.5 min-h-[20px]">
          <span className={`text-xs sm:text-sm font-medium ${discount ? 'text-rose-600' : 'text-text'}`}>
            {formatPrice(product.price)}
          </span>
          {discount && (
            <span className="text-[10px] sm:text-xs text-dim line-through font-light">{formatPrice(product.salePrice)}</span>
          )}
        </div>

        {/* Color swatches */}
        {product.colors && product.colors.length > 0 ? (
          <div className="flex gap-1.5 pt-1.5 min-h-[18px]">
            {product.colors.slice(0, 5).map((colorName, idx) => (
              <span
                key={idx}
                title={colorName}
                className="w-2.5 h-2.5 border border-border-light hover:scale-110 hover:border-white transition-all duration-300 cursor-pointer"
                style={{ backgroundColor: COLOR_MAP[colorName] || '#888' }}
              />
            ))}
            {product.colors.length > 5 && (
              <span className="text-[9px] text-dim self-center pl-1 font-light">+{product.colors.length - 5}</span>
            )}
          </div>
        ) : (
          <div className="min-h-[18px]" />
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
