import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../services';
import ProductCard from '../components/ProductCard';
import { FiFilter, FiX, FiChevronDown, FiChevronUp, FiPackage } from 'react-icons/fi';

const CATEGORIES = [
  { label: 'Jeans', value: 'JEANS' }, { label: 'Cargos', value: 'CARGOS' },
  { label: 'Bermudas', value: 'BERMUDAS' }, { label: 'Joggers', value: 'JOGGERS' },
  { label: 'Camisetas', value: 'CAMISETAS' }, { label: 'Camisas', value: 'CAMISAS' },
  { label: 'Chaquetas', value: 'CHAQUETAS' }, { label: 'Hoodies', value: 'HOODIES' },
];

const GENDERS = [
  { label: 'Hombre', value: 'HOMBRE' },
  { label: 'Mujer', value: 'MUJER' },
  { label: 'Unisex', value: 'UNISEX' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36'];

const SORT_OPTIONS = [
  { label: 'Más recientes', value: 'newest' },
  { label: 'Precio: menor a mayor', value: 'price_asc' },
  { label: 'Precio: mayor a menor', value: 'price_desc' },
  { label: 'Destacados', value: 'featured' },
];

const COLOR_MAP = {
  'Negro': '#111111', 'Blanco': '#f5f5f5', 'Azul': '#1D4ED8', 'Azul Oscuro': '#1E3A5F',
  'Azul Marino': '#1E3A5F', 'Azul Claro': '#93C5FD', 'Rojo': '#EF4444',
  'Verde': '#22C55E', 'Verde Militar': '#4B5320', 'Amarillo': '#EAB308',
  'Gris': '#6B7280', 'Gris Melange': '#9CA3AF', 'Beige': '#D4B896',
  'Caqui': '#C3B091', 'Bordeaux': '#6D1A36', 'Azul/Blanco': '#3B82F6',
  'Rojo/Negro': '#7F1D1D', 'Verde/Negro': '#166534',
};

const FilterSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/40 py-5">
      <button
        className="flex items-center justify-between w-full text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400 hover:text-white transition-colors mb-4"
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
      </button>
      {open && children}
    </div>
  );
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortRef = useRef(null);
  const [searchParams] = useSearchParams();

  const categoryParam = searchParams.get('category');
  const genderParam = searchParams.get('gender');
  const searchParam = searchParams.get('search');
  const saleParam = searchParams.get('sale');

  const [filters, setFilters] = useState({
    category: categoryParam ? categoryParam.toUpperCase() : '',
    gender: genderParam || '',
    size: '',
    color: '',
    minPrice: '',
    maxPrice: '',
  });

  useEffect(() => {
    const handleClickOutside = e => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      category: categoryParam ? categoryParam.toUpperCase() : '',
      gender: genderParam || '',
    }));
  }, [categoryParam, genderParam]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (categoryParam) params.category = categoryParam.toUpperCase();
    if (genderParam) params.gender = genderParam;
    if (searchParam) params.search = searchParam;
    if (saleParam === 'true') params.onSale = true;

    productService.getProducts(params)
      .then(data => setProducts(Array.isArray(data) ? data : (data.products || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [categoryParam, genderParam, searchParam, saleParam]);

  const toggleFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ category: '', gender: '', size: '', color: '', minPrice: '', maxPrice: '' });
  }, []);

  const allColors = [...new Set(products.flatMap(p => p.colors || []))];
  const activeFilterCount = [filters.category, filters.gender, filters.size, filters.color, filters.minPrice, filters.maxPrice]
    .filter(Boolean).length;

  const sorted = [...products]
    .filter(p => {
      if (filters.category && p.category !== filters.category) return false;
      if (filters.gender && p.gender !== filters.gender) return false;
      if (filters.size && !(p.sizes || []).includes(filters.size)) return false;
      if (filters.color && !(p.colors || []).includes(filters.color)) return false;
      if (filters.minPrice && p.price < parseFloat(filters.minPrice)) return false;
      if (filters.maxPrice && p.price > parseFloat(filters.maxPrice)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'featured') return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      return (b.id || 0) - (a.id || 0);
    });

  const getTitle = () => {
    if (searchParam) return `"${searchParam}"`;
    if (saleParam === 'true') return 'Ofertas';
    if (filters.gender && filters.category) {
      return `${CATEGORIES.find(c => c.value === filters.category)?.label} · ${filters.gender.charAt(0) + filters.gender.slice(1).toLowerCase()}`;
    }
    if (filters.category) return CATEGORIES.find(c => c.value === filters.category)?.label || filters.category;
    if (filters.gender) return filters.gender === 'HOMBRE' ? 'Hombre' : filters.gender === 'MUJER' ? 'Mujer' : 'Unisex';
    return 'Toda la Colección';
  };

  const SidebarContent = () => (
    <div className="space-y-0">
      {/* Category */}
      <FilterSection title="Categoría">
        <div className="space-y-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => toggleFilter('category', cat.value)}
              className={`flex items-center justify-between w-full px-1 py-2 rounded-none text-xs tracking-wider transition-colors duration-300 ${
                filters.category === cat.value ? 'text-white font-medium' : 'text-neutral-400 hover:text-white font-light'
              }`}
            >
              <span>{cat.label}</span>
              {filters.category === cat.value && (
                <span className="w-1 h-1 bg-white" />
              )}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Gender */}
      <FilterSection title="Género">
        <div className="flex flex-wrap gap-2">
          {GENDERS.map(g => (
            <button
              key={g.value}
              onClick={() => toggleFilter('gender', g.value)}
              className={`filter-pill ${filters.gender === g.value ? 'filter-pill-active' : ''}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Size */}
      <FilterSection title="Talla">
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map(size => (
            <button
              key={size}
              onClick={() => toggleFilter('size', size)}
              className={`w-11 h-11 flex items-center justify-center text-xs font-light border transition-all duration-300 rounded-none ${
                filters.size === size
                  ? 'border-white bg-white text-black font-normal'
                  : 'border-border text-muted hover:border-border-light hover:text-white'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Color */}
      {allColors.length > 0 && (
        <FilterSection title="Color">
          <div className="flex flex-wrap gap-2">
            {allColors.map(colorName => (
              <button
                key={colorName}
                onClick={() => toggleFilter('color', colorName)}
                title={colorName}
                className={`relative w-6 h-6 border transition-all duration-300 rounded-none ${
                  filters.color === colorName ? 'border-white scale-110' : 'border-border-light hover:border-white'
                }`}
                style={{ backgroundColor: COLOR_MAP[colorName] || '#888' }}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Price */}
      <FilterSection title="Precio" defaultOpen={false}>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Mín"
              value={filters.minPrice}
              onChange={e => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
              className="input-field py-2 text-xs rounded-none border-border"
            />
            <span className="text-dim text-xs">—</span>
            <input
              type="number"
              placeholder="Máx"
              value={filters.maxPrice}
              onChange={e => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              className="input-field py-2 text-xs rounded-none border-border"
            />
          </div>
        </div>
      </FilterSection>

      {activeFilterCount > 0 && (
        <div className="pt-5">
          <button onClick={clearFilters} className="text-[10px] uppercase tracking-widest text-muted hover:text-white underline underline-offset-4 transition-colors">
            Limpiar filtros ({activeFilterCount})
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pt-4 pb-20">
      <div className="container-xl">
        {/* Title row */}
        <div className="py-8 md:py-12 border-b border-border/40 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-light uppercase tracking-[0.08em] text-white">{getTitle()}</h1>
            <p className="text-xs text-neutral-500 font-light mt-2 tracking-wider">{sorted.length} artículo{sorted.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Sort */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2.5 text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white border border-border/60 px-4 py-3 rounded-none transition-all duration-300"
                aria-expanded={showSortMenu}
              >
                <span className="hidden sm:inline">{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                <span className="sm:hidden">Ordenar</span>
                <FiChevronDown size={12} className={`transition-transform duration-300 ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-neutral-950 border border-border/80 rounded-none py-1 shadow-2xl z-30 animate-slideDown">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-3 text-[10px] uppercase tracking-widest transition-colors duration-300 ${
                        sortBy === opt.value ? 'text-white font-medium bg-white/5' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile filter btn */}
            <button
              onClick={() => setShowFilterDrawer(true)}
              className="flex items-center gap-2.5 text-[10px] uppercase tracking-widest border border-border/60 px-4 py-3 rounded-none text-neutral-400 hover:text-white transition-all duration-300 md:hidden"
            >
              <FiFilter size={12} />
              Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
          </div>
        </div>

        <div className="flex gap-10 pt-8">
          {/* Sidebar — Desktop */}
          <aside className="hidden md:block w-52 flex-shrink-0">
            <SidebarContent />
          </aside>

          {/* Grid */}
          <div className="flex-1 min-w-0">
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {filters.category && (
                  <button onClick={() => toggleFilter('category', filters.category)} className="filter-pill-active text-xs flex items-center gap-1.5">
                    {CATEGORIES.find(c => c.value === filters.category)?.label} <FiX size={12} />
                  </button>
                )}
                {filters.gender && (
                  <button onClick={() => toggleFilter('gender', filters.gender)} className="filter-pill-active text-xs flex items-center gap-1.5">
                    {GENDERS.find(g => g.value === filters.gender)?.label} <FiX size={12} />
                  </button>
                )}
                {filters.size && (
                  <button onClick={() => toggleFilter('size', filters.size)} className="filter-pill-active text-xs flex items-center gap-1.5">
                    Talla {filters.size} <FiX size={12} />
                  </button>
                )}
                {filters.color && (
                  <button onClick={() => toggleFilter('color', filters.color)} className="filter-pill-active text-xs flex items-center gap-1.5">
                    {filters.color} <FiX size={12} />
                  </button>
                )}
                <button onClick={clearFilters} className="text-xs text-dim hover:text-muted transition-colors duration-200 ml-1">
                  Limpiar todo
                </button>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-product bg-surface rounded-[var(--radius-md)]" />
                    <div className="mt-3 space-y-2">
                      <div className="h-3 bg-surface rounded w-1/2" />
                      <div className="h-4 bg-surface2 rounded w-3/4" />
                      <div className="h-3 bg-surface rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sorted.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {sorted.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div className="empty-state">
                <FiPackage size={52} strokeWidth={1} className="text-dim mb-4" />
                <h3 className="font-heading text-xl font-semibold mb-2">Sin resultados</h3>
                <p className="text-muted text-sm mb-6">Prueba ajustando los filtros</p>
                <button onClick={clearFilters} className="btn-outline btn-sm">Limpiar Filtros</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFilterDrawer(false)} />
          <div className="relative ml-auto w-80 max-w-full h-full bg-bg border-l border-border overflow-y-auto flex flex-col animate-slideDown">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-sm uppercase tracking-widest">Filtros</h2>
              <button onClick={() => setShowFilterDrawer(false)}>
                <FiX size={20} className="text-muted hover:text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <SidebarContent />
            </div>
            <div className="p-5 border-t border-border">
              <button onClick={() => setShowFilterDrawer(false)} className="btn-primary w-full">
                Ver {sorted.length} resultado{sorted.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
