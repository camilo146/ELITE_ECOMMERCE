import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../services';
import ProductCard from '../components/ProductCard';
import { FiArrowRight, FiTruck, FiRefreshCw, FiShield, FiHeadphones, FiCheck } from 'react-icons/fi';

const BENEFITS = [
  { icon: FiTruck, title: 'Envío Gratis', desc: 'En pedidos +$200.000' },
  { icon: FiRefreshCw, title: 'Devoluciones', desc: '30 días sin preguntas' },
  { icon: FiShield, title: 'Pago Seguro', desc: 'SSL + Mercado Pago' },
  { icon: FiHeadphones, title: 'Atención 24/7', desc: 'Soporte personalizado' },
];

const CATEGORY_TILES = [
  {
    label: 'Jeans', href: '/products?category=jeans',
    comingSoon: true,
    slogan: 'El fit perfecto para tu estilo diario.',
    marketing: 'Nueva Colección'
  },
  {
    label: 'Bermudas', href: '/products?category=bermudas',
    img: '/portada_categoria_bermuda.png',
  },
  {
    label: 'Hoodies', href: '/products?category=hoodies',
    comingSoon: true,
    slogan: 'Comodidad superior sin perder la esencia urbana.',
    marketing: 'Nuevos Estilos'
  },
  {
    label: 'Camisetas', href: '/products?category=camisetas',
    comingSoon: true,
    slogan: 'Básicos premium con texturas únicas.',
    marketing: 'Diseños Exclusivos'
  },
];

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [email, setEmail] = useState('');
  const [newsletterSent, setNewsletterSent] = useState(false);

  useEffect(() => {
    productService.getProducts({}).then(data => {
      const all = Array.isArray(data) ? data : (data.products || []);
      setFeaturedProducts(all.filter(p => p.featured).slice(0, 4));
      setNewProducts(all.filter(p => p.isNew).slice(0, 4));
    }).catch(() => { });
  }, []);

  return (
    <div className="min-h-screen">

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative h-[85vh] md:h-[90vh] flex items-end pb-20 md:pb-28 overflow-hidden bg-black">
        {/* Background Hero Image */}
        <img
          src="/PORTADA_ELITE.png"
          alt="Colección ELITE"
          className="absolute inset-0 w-full h-full object-cover object-center md:object-[center_30%] select-none pointer-events-none opacity-80"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        {/* Modern minimal gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent md:from-black/50" />

        <div className="container-xl relative z-10 animate-fadeIn px-6 md:px-12">
          <h1 className="font-heading text-5xl sm:text-7xl md:text-8xl font-light tracking-[0.12em] leading-none mb-8 uppercase text-white">
            ELITE
          </h1>
          <div className="flex flex-wrap gap-4 pt-1">
            <Link to="/products" className="btn-primary">
              Comprar Ahora
            </Link>
            <Link to="/products?isNew=true" className="btn-outline">
              Nueva Colección
            </Link>
          </div>
        </div>
      </section>

      {/* ── NEW ARRIVALS ───────────────────────────────────── */}
      {newProducts.length > 0 && (
        <section className="section bg-surface/10 py-16 md:py-24">
          <div className="container-xl">
            <div className="flex items-end justify-between mb-10 pb-4 border-b border-border/30">
              <div>
                <p className="text-[9px] text-neutral-500 uppercase tracking-[0.2em] mb-1">Recién llegado</p>
                <h2 className="text-xl sm:text-2xl font-light tracking-[0.1em] uppercase">Nueva Colección</h2>
              </div>
              <Link to="/products?isNew=true" className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors uppercase tracking-wider">
                Ver todo <FiArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {newProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── CATEGORIES GRID ────────────────────────────────── */}
      <section className="section bg-bg py-16 md:py-24 border-t border-border/40">
        <div className="container-xl">
          <div className="flex items-end justify-between mb-10 border-b border-border/40 pb-4">
            <div>
              <p className="text-[9px] text-neutral-500 uppercase tracking-[0.2em] mb-1">Directorios</p>
              <h2 className="text-xl sm:text-2xl font-light tracking-[0.1em] uppercase">Explorar</h2>
            </div>
            <Link to="/products" className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors uppercase tracking-wider">
              Ver todo <FiArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORY_TILES.map(cat => (
              cat.comingSoon ? (
                <div
                  key={cat.label}
                  className="group relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-neutral-900/50 to-neutral-950 border border-border/40 p-6 flex flex-col justify-between hover:border-neutral-800 transition-all duration-500 hover:shadow-[0_0_20px_rgba(255,255,255,0.02)]"
                >
                  {/* Top row: Category name and a subtle glowing indicator */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-[0.25em] text-neutral-400 uppercase">
                      {cat.label}
                    </span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/30 opacity-40"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-600 group-hover:bg-white transition-colors duration-300"></span>
                    </span>
                  </div>

                  {/* Middle / Bottom: Coming soon and marketing slogan */}
                  <div className="space-y-3">
                    <span className="inline-block bg-white/5 border border-white/10 px-2 py-0.5 text-[8px] font-semibold tracking-[0.2em] text-neutral-300 uppercase rounded-none">
                      {cat.marketing}
                    </span>
                    <p className="text-[11px] text-neutral-500 leading-relaxed font-light group-hover:text-neutral-300 transition-colors duration-500">
                      {cat.slogan}
                    </p>
                  </div>

                  {/* Bottom row: decorative/clean visual element */}
                  <div className="pt-2 border-t border-border/20 flex items-center justify-between">
                    <span className="text-[8px] text-dim uppercase tracking-wider group-hover:text-neutral-500 transition-colors duration-500">
                      PRÓXIMAMENTE
                    </span>
                    <FiArrowRight size={12} className="text-neutral-700 group-hover:text-white transition-all transform translate-x-[-4px] group-hover:translate-x-0 duration-300" />
                  </div>
                </div>
              ) : (
                <Link
                  key={cat.label}
                  to={cat.href}
                  className="group relative aspect-[3/4] overflow-hidden bg-neutral-900 rounded-none"
                >
                  <img
                    src={cat.img}
                    alt={cat.label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    loading="lazy"
                  />
                  {/* Elegant central typography overlay on hover */}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors duration-500 flex items-center justify-center p-4">
                    <h3 className="font-heading text-xs font-medium uppercase tracking-[0.25em] text-white border-b border-transparent group-hover:border-white transition-all duration-300 pb-1">
                      {cat.label}
                    </h3>
                  </div>
                </Link>
              )
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ──────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <section className="section bg-bg py-16 md:py-24 border-t border-border/40">
          <div className="container-xl">
            <div className="flex items-end justify-between mb-10 pb-4 border-b border-border/30">
              <div>
                <p className="text-[9px] text-neutral-500 uppercase tracking-[0.2em] mb-1">Selección del equipo</p>
                <h2 className="text-xl sm:text-2xl font-light tracking-[0.1em] uppercase">Destacados</h2>
              </div>
              <Link to="/products" className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors uppercase tracking-wider">
                Ver todos <FiArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── GENDER SPLIT ───────────────────────────────────── */}
      <section className="section bg-bg py-16 md:py-24 border-t border-border/40">
        <div className="container-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hombre */}
            <Link
              to="/products?gender=HOMBRE"
              className="group relative h-[450px] sm:h-[550px] overflow-hidden rounded-none"
            >
              <img
                src="/imagen_hombre_categoria.png"
                alt="Colección Hombre"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                loading="lazy"
                decoding="async"
                width="800"
                height="550"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 flex items-end justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 mb-1">Línea masculina</p>
                  <h3 className="font-heading text-2xl font-light tracking-wider text-white uppercase">Hombre</h3>
                </div>
                <span className="btn-outline btn-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 text-[10px]">
                  Ver colección
                </span>
              </div>
            </Link>

            {/* Mujer */}
            <Link
              to="/products?gender=MUJER"
              className="group relative h-[450px] sm:h-[550px] overflow-hidden rounded-none"
            >
              <img
                src="/imagen_mujer_categoria.png"
                alt="Colección Mujer"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                loading="lazy"
                decoding="async"
                width="800"
                height="550"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 flex items-end justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 mb-1">Línea femenina</p>
                  <h3 className="font-heading text-2xl font-light tracking-wider text-white uppercase">Mujer</h3>
                </div>
                <span className="btn-outline btn-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 text-[10px]">
                  Ver colección
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SALE BANNER ────────────────────────────────────── */}
      <section className="py-0">
        <div className="relative h-72 md:h-[400px] overflow-hidden bg-neutral-950">
          <img
            src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&h=500&fit=crop&auto=format&q=80"
            alt="Ofertas Especiales"
            className="w-full h-full object-cover opacity-20"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-bg/50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400 mb-4">REBAJAS DE TEMPORADA</p>
            <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl font-light tracking-[0.1em] mb-8 uppercase text-white">
              Hasta <span className="text-rose-700 font-medium">50% OFF</span>
            </h2>
            <Link to="/products?sale=true" className="btn-primary">
              Ver Rebajas
            </Link>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ───────────────────────────────────────── */}
      <section className="border-t border-border bg-bg py-8 md:py-12">
        <div className="container-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y divide-border md:divide-y-0 md:divide-x divide-border/60">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} className="px-4 py-6 text-center">
                  <div className="flex justify-center mb-3"><Icon size={20} className="text-neutral-300" strokeWidth={1} /></div>
                  <h4 className="font-medium text-xs tracking-wider uppercase mb-1">{b.title}</h4>
                  <p className="text-[11px] text-neutral-500 font-light">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ─────────────────────────────────────── */}
      <section className="section border-t border-border bg-neutral-950/20 py-20 md:py-28">
        <div className="container-xl">
          <div className="max-w-md mx-auto text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-3">COMUNIDAD ELITE</p>
            <h2 className="text-xl sm:text-2xl font-light uppercase tracking-[0.12em] mb-4">Únete a ELITE</h2>
            <p className="text-muted text-xs leading-relaxed font-light mb-10 max-w-sm mx-auto">
              Regístrate para recibir lanzamientos exclusivos, acceso anticipado y colecciones especiales.
            </p>

            {newsletterSent ? (
              <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 border border-border/80 px-6 py-4 animate-fadeIn">
                <FiCheck size={14} className="text-green-500" />
                <span className="tracking-wide">Te has suscrito con éxito.</span>
              </div>
            ) : (
              <form
                onSubmit={e => { e.preventDefault(); if (email) setNewsletterSent(true); }}
                className="flex items-center border-b border-border-light focus-within:border-white transition-colors duration-300 pb-2 mx-auto"
              >
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Tu dirección de correo"
                  className="bg-transparent text-xs text-text placeholder-dim focus:outline-none flex-grow tracking-wide"
                  required
                />
                <button type="submit" className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 hover:text-white transition-colors duration-300 pl-4 font-medium select-none">
                  Suscribirse
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
