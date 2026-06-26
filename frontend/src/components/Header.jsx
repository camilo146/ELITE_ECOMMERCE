import { Link, useLocation } from 'react-router-dom';
import { FiSearch, FiUser, FiShoppingBag, FiMenu, FiX } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const NAV_LINKS = [
  { label: 'Nuevo', href: '/products?isNew=true' },
  { label: 'Hombre', href: '/products?gender=HOMBRE' },
  { label: 'Mujer', href: '/products?gender=MUJER' },
  { label: 'Jeans', href: '/products?category=jeans' },
  { label: 'Bermudas', href: '/products?category=bermudas' },
  { label: 'Hoodies', href: '/products?category=hoodies' },
  { label: 'Ofertas', href: '/products?sale=true', accent: true },
];

const ALL_CATEGORIES = [
  { label: 'Jeans', href: '/products?category=jeans' },
  { label: 'Cargos', href: '/products?category=cargos' },
  { label: 'Bermudas', href: '/products?category=bermudas' },
  { label: 'Joggers', href: '/products?category=joggers' },
  { label: 'Camisetas', href: '/products?category=camisetas' },
  { label: 'Camisas', href: '/products?category=camisas' },
  { label: 'Hoodies', href: '/products?category=hoodies' },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const { getCartCount } = useCart();
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = e => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setIsUserMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = e => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const cartCount = getCartCount();

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-white text-black text-[9px] sm:text-[10px] text-center py-2 font-medium tracking-[0.22em] uppercase px-4 select-none">
        <span className="hidden sm:inline">Envío gratis en pedidos mayores a $200.000 &nbsp;&mdash;&nbsp; Devoluciones gratuitas</span>
        <span className="sm:hidden">Envío gratis +$200.000 &nbsp;&middot;&nbsp; Devoluciones gratis</span>
      </div>

      <header className={`sticky top-0 w-full z-40 transition-all duration-300 ${
        scrolled ? 'bg-bg/95 backdrop-blur-md border-b border-border/40 py-0.5' : 'bg-bg border-b border-transparent py-2'
      }`}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-14 sm:h-16 gap-4">

            {/* Left: hamburger (mobile) or nav (desktop) */}
            <div className="flex items-center min-w-0">
              <button
                className="p-2 -ml-2 text-muted hover:text-white transition-colors md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menú"
              >
                {isMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
              </button>

              <nav className="hidden md:flex items-center gap-5 lg:gap-6">
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`text-[10px] font-medium uppercase tracking-[0.18em] whitespace-nowrap transition-colors duration-300 ${
                      ['Jeans', 'Bermudas', 'Hoodies'].includes(link.label) ? 'hidden xl:inline' : ''
                    } ${link.accent ? 'text-sale hover:text-red-400' : 'text-muted hover:text-white'}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Logo — centered in grid */}
            <Link
              to="/"
              className="font-heading text-lg font-light tracking-[0.38em] text-white uppercase select-none justify-self-center pl-[0.38em] pr-4 transition-opacity duration-300 hover:opacity-85"
            >
              ELITE
            </Link>

            {/* Right icons */}
            <div className="flex items-center gap-3 sm:gap-4 justify-self-end">
              {/* Search trigger */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="icon-btn"
                aria-label="Buscar"
              >
                <FiSearch size={18} />
              </button>

              {/* User account */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="icon-btn"
                    aria-label="Mi cuenta"
                    aria-expanded={isUserMenuOpen}
                  >
                    <FiUser size={18} />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-3 w-52 bg-surface border border-border rounded-none shadow-2xl py-1 animate-slideDown z-50">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-[9px] text-dim uppercase tracking-[0.18em]">Cuenta</p>
                        <p className="text-xs font-medium truncate mt-0.5">{user.username || user.email}</p>
                      </div>
                      {[
                        ['/profile', 'Mi Perfil'],
                        ['/orders', 'Mis Pedidos'],
                      ].map(([href, label]) => (
                        <Link key={href} to={href} className="block px-4 py-2.5 text-xs text-muted hover:text-white hover:bg-white/5 transition-colors">
                          {label}
                        </Link>
                      ))}
                      {(user.role === 'admin' || user.role === 'ADMIN') && (
                        <Link to="/admin" className="block px-4 py-2.5 text-xs text-yellow-400 hover:bg-white/5 transition-colors">
                          Panel Admin
                        </Link>
                      )}
                      <div className="border-t border-border mt-1">
                        <button
                          onClick={logout}
                          className="w-full text-left px-4 py-2.5 text-xs text-dim hover:text-white hover:bg-white/5 transition-colors"
                        >
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="icon-btn" aria-label="Iniciar sesión">
                  <FiUser size={18} />
                </Link>
              )}

              {/* Cart */}
              <Link to="/cart" className="relative icon-btn" aria-label="Carrito">
                <FiShoppingBag size={18} />
                {cartCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-white text-black text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none select-none">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border bg-bg/98 backdrop-blur-xl animate-slideDown">
            <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-1">
              <form onSubmit={handleSearch} className="flex gap-2 mb-4 pb-4 border-b border-border/50">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  className="input-field py-2 text-xs flex-1 rounded-none border-border-light bg-transparent"
                  aria-label="Buscar productos"
                />
                <button type="submit" className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-none">
                  <FiSearch size={14} />
                </button>
              </form>
              {NAV_LINKS.filter(l => !['Jeans', 'Bermudas', 'Hoodies'].includes(l.label)).map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`block py-2.5 text-xs uppercase tracking-wider transition-colors border-b border-border/30 ${
                    link.accent ? 'font-medium text-sale hover:text-red-400' : 'text-muted hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {ALL_CATEGORIES.map(cat => (
                <Link
                  key={cat.href}
                  to={cat.href}
                  className="block py-2.5 text-xs uppercase tracking-wider text-muted hover:text-white transition-colors border-b border-border/30"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Full-Screen Search Overlay */}
      <div className={`search-overlay ${isSearchOpen ? 'active' : ''}`} ref={searchRef}>
        <div className="w-full max-w-screen-xl mx-auto px-6 flex justify-end pt-4 sm:pt-6">
          <button
            onClick={() => setIsSearchOpen(false)}
            className="icon-btn hover:rotate-90 transition-transform duration-300"
            aria-label="Cerrar búsqueda"
          >
            <FiX size={22} />
          </button>
        </div>
        <div className="search-overlay__container">
          <form onSubmit={handleSearch} className="w-full">
            <p className="text-[10px] uppercase tracking-[0.22em] text-dim mb-4 text-center">¿Qué estás buscando?</p>
            <div className="relative border-b border-border-light py-2.5 focus-within:border-white transition-colors">
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Jeans, hoodies, bermudas..."
                className="w-full bg-transparent text-lg md:text-xl text-center text-text placeholder-dim focus:outline-none"
                autoFocus={isSearchOpen}
                aria-label="Buscar productos"
              />
              <button type="submit" aria-label="Buscar" className="absolute right-0 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors">
                <FiSearch size={18} />
              </button>
            </div>
          </form>
          
          {/* Quick suggestions */}
          <div className="mt-12 text-center">
            <p className="text-[10px] text-dim uppercase tracking-[0.18em] mb-4">Sugerencias</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {[
                ['Nuevo', '/products?isNew=true'],
                ['Hombre', '/products?gender=HOMBRE'],
                ['Mujer', '/products?gender=MUJER'],
                ['Jeans', '/products?category=jeans'],
                ['Bermudas', '/products?category=bermudas'],
                ['Hoodies', '/products?category=hoodies'],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  to={href}
                  onClick={() => setIsSearchOpen(false)}
                  className="text-[10px] uppercase tracking-wider px-4 py-2 border border-border text-muted hover:text-white hover:border-white transition-all duration-300"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
