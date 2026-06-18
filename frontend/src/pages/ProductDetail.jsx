import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productService } from '../services';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatPrice';
import { toast } from 'react-toastify';
import { FiChevronLeft, FiChevronRight, FiMinus, FiPlus, FiShare2, FiPackage, FiTruck, FiRefreshCw, FiShield } from 'react-icons/fi';

const COLOR_MAP = {
  'Negro': '#111111', 'Blanco': '#f5f5f5', 'Azul': '#1D4ED8', 'Azul Oscuro': '#1E3A5F',
  'Azul Marino': '#1E3A5F', 'Azul Claro': '#93C5FD', 'Rojo': '#EF4444',
  'Verde': '#22C55E', 'Verde Militar': '#4B5320', 'Amarillo': '#EAB308',
  'Gris': '#6B7280', 'Gris Melange': '#9CA3AF', 'Beige': '#D4B896',
  'Caqui': '#C3B091', 'Bordeaux': '#6D1A36',
};

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const { addToCart } = useCart();

  useEffect(() => {
    if (id) {
      setLoading(true);
      productService.getProductById(id)
        .then(data => {
          setProduct(data);
          setSelectedColor('');
          setSelectedSize('');
          setActiveImage(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  const handleAddToCart = () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      toast.warning('Selecciona una talla antes de continuar');
      return;
    }
    if (product.colors?.length > 0 && !selectedColor) {
      toast.warning('Selecciona un color antes de continuar');
      return;
    }
    addToCart(product, quantity, selectedSize, selectedColor);
    toast.success('Añadido al carrito');
  };

  const discount = product?.onSale && product?.salePrice
    ? Math.round(((product.salePrice - product.price) / product.salePrice) * 100)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen pt-8 pb-20">
        <div className="container-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
            <div className="aspect-product bg-surface rounded-[var(--radius-lg)]" />
            <div className="space-y-4 pt-4">
              <div className="h-4 bg-surface rounded w-24" />
              <div className="h-8 bg-surface2 rounded w-3/4" />
              <div className="h-6 bg-surface rounded w-1/3" />
              <div className="h-20 bg-surface rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <FiPackage size={52} strokeWidth={1} className="text-dim mb-4" />
        <h1 className="font-heading text-xl font-semibold mb-2">Producto no encontrado</h1>
        <p className="text-muted text-sm mb-6">El artículo que buscas no está disponible.</p>
        <Link to="/products" className="btn-primary">Ver Colección</Link>
      </div>
    );
  }

  const images = product.images?.length > 0 ? product.images : [];

  return (
    <div className="min-h-screen pt-4 pb-24 bg-bg">
      <div className="container-xl">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-500 mb-8 border-b border-border/40 pb-4">
          <Link to="/" className="hover:text-white transition-colors">Inicio</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-white transition-colors">Colección</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link to={`/products?category=${product.category.toLowerCase()}`} className="hover:text-white transition-colors">
                {product.category}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-neutral-300 truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-10 xl:gap-16 items-start">
          {/* ── LEFT: Gallery Stacked (Desktop) / Carousel (Mobile) ── */}
          <div className="w-full lg:w-3/5">
            {/* Desktop stacked gallery */}
            <div className="hidden lg:flex flex-col gap-6">
              {images.map((img, idx) => (
                <div key={idx} className="aspect-[3/4] bg-neutral-900 border border-border/40 overflow-hidden">
                  <img
                    src={img}
                    alt={`${product.name} — vista ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-102"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* Mobile/Tablet image slider */}
            <div className="lg:hidden relative aspect-[3/4] w-full overflow-hidden bg-neutral-900">
              {images.length > 0 ? (
                <img
                  src={images[activeImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-dim">
                  <FiPackage size={52} strokeWidth={1} />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {discount && <span className="badge-sale">−{discount}%</span>}
                {product.isNew && !discount && <span className="badge-new">Nuevo</span>}
              </div>

              {/* Slider Nav Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black flex items-center justify-center rounded-full transition-colors"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setActiveImage(i => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black flex items-center justify-center rounded-full transition-colors"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </>
              )}

              {/* Dot Indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`h-1 rounded-full transition-all ${
                        activeImage === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Product Purchase Details (Sticky on desktop) ── */}
          <div className="w-full lg:w-2/5 lg:sticky lg:top-24 space-y-6">
            {/* Category + Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                  {product.category && product.category}
                  {product.gender && ` · ${product.gender}`}
                </p>
                <button className="text-neutral-500 hover:text-white transition-colors" title="Compartir">
                  <FiShare2 size={16} />
                </button>
              </div>
              <h1 className="font-heading text-2xl md:text-3xl font-light tracking-wide uppercase text-white leading-snug capitalize">{product.name}</h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-4">
                <span className={`text-xl font-medium ${discount ? 'text-rose-600' : 'text-white'}`}>
                  {formatPrice(product.price)}
                </span>
                {discount && (
                  <>
                    <span className="text-sm text-dim line-through font-light">{formatPrice(product.salePrice)}</span>
                    <span className="badge-sale">−{discount}%</span>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-border/50 pt-6" />

            {/* Size Selector */}
            {product.sizes?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs uppercase tracking-widest text-neutral-300 font-medium">
                    Talla
                    {selectedSize && <span className="ml-2 text-neutral-500 font-light normal-case">— {selectedSize}</span>}
                    {!selectedSize && <span className="text-rose-700 ml-1">*</span>}
                  </span>
                  <a href="#" className="text-[10px] uppercase tracking-wider text-neutral-500 underline underline-offset-4 hover:text-white transition-colors">
                    Guía de tallas
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 text-xs font-light border transition-all duration-300 rounded-none flex items-center justify-center ${
                        selectedSize === size
                          ? 'border-white bg-white text-black font-normal'
                          : 'border-border text-neutral-400 hover:border-border-light hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selector */}
            {product.colors?.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-300 font-medium mb-3.5">
                  Color
                  {selectedColor && <span className="ml-2 text-neutral-500 font-light normal-case">— {selectedColor}</span>}
                  {!selectedColor && <span className="text-rose-700 ml-1">*</span>}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {product.colors.map((colorName, i) => (
                    <button
                      key={`${colorName}-${i}`}
                      onClick={() => setSelectedColor(colorName)}
                      title={colorName}
                      className="relative flex items-center justify-center"
                    >
                      <div
                        className={`w-8 h-8 border transition-all duration-300 rounded-none ${
                          selectedColor === colorName ? 'border-white scale-110' : 'border-border/80 hover:border-white'
                        }`}
                        style={{ backgroundColor: COLOR_MAP[colorName] || '#888' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-300 font-medium mb-3.5">Cantidad</p>
              <div className="flex items-center border border-border/80 rounded-none w-fit bg-neutral-950/30">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                >
                  <FiMinus size={12} />
                </button>
                <span className="w-10 text-center text-xs font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.stock || 99, q + 1))}
                  className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                >
                  <FiPlus size={12} />
                </button>
              </div>
              <p className="text-[10px] text-neutral-500 mt-2 font-light">
                {product.stock > 0
                  ? product.stock < 10 ? `¡Solo quedan ${product.stock} unidades!` : `${product.stock} disponibles`
                  : 'Sin stock disponible'
                }
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="btn-primary w-full py-4 text-[10px] tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {product.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
              </button>
              <Link to="/checkout" className="btn-outline w-full py-4 text-[10px] tracking-[0.2em] text-center">
                Comprar Ahora
              </Link>
            </div>

            <div className="border-t border-border/50 pt-6" />

            {/* Description & details */}
            <div className="space-y-4 text-xs font-light text-neutral-400 leading-relaxed">
              <p>{product.description}</p>
              <div className="space-y-1.5 pt-2">
                {product.material && (
                  <p className="tracking-wide"><span className="text-neutral-500 uppercase text-[9px] tracking-wider mr-2">Material:</span> <span className="text-neutral-300 font-normal">{product.material}</span></p>
                )}
                {product.brand && (
                  <p className="tracking-wide"><span className="text-neutral-500 uppercase text-[9px] tracking-wider mr-2">Marca:</span> <span className="text-neutral-300 font-normal">{product.brand}</span></p>
                )}
              </div>
            </div>

            {/* Shipping note */}
            <div className="flex flex-col gap-2.5 text-[10px] text-neutral-400 border border-border/60 rounded-none p-4 bg-neutral-950/20 leading-relaxed">
              <p className="flex items-center gap-2"><FiTruck size={12} className="text-neutral-400" /> Envío gratis en pedidos superiores a $200.000</p>
              <p className="flex items-center gap-2"><FiRefreshCw size={12} className="text-neutral-400" /> Devoluciones sin costo hasta 30 días</p>
              <p className="flex items-center gap-2"><FiShield size={12} className="text-neutral-400" /> Pago seguro protegido con encriptación SSL</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
