import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-bg/50">
      <div className="container-xl py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-10 mb-12 md:mb-16">
          {/* Brand info */}
          <div className="col-span-2 md:col-span-2">
            <Link to="/" className="font-heading text-lg font-light tracking-[0.38em] block mb-5 transition-opacity duration-300 hover:opacity-85">ELITE</Link>
            <p className="text-xs text-muted leading-relaxed max-w-xs font-light">
              Diseño contemporáneo y calidad premium. Prendas estructuradas creadas para durar.
            </p>
          </div>

          {/* Colecciones */}
          <div>
            <h5 className="text-[10px] font-medium uppercase tracking-[0.22em] mb-5 text-neutral-500">Colecciones</h5>
            <ul className="space-y-3">
              {[
                ['Jeans', '/products?category=jeans'],
                ['Chaquetas', '/products?category=chaquetas'],
                ['Hoodies', '/products?category=hoodies'],
                ['Camisetas', '/products?category=camisetas'],
                ['Joggers', '/products?category=joggers'],
                ['Ofertas', '/products?sale=true'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link to={href} className="text-xs text-muted hover:text-white transition-colors duration-300 font-light tracking-wide">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Comprar */}
          <div>
            <h5 className="text-[10px] font-medium uppercase tracking-[0.22em] mb-5 text-neutral-500">Comprar</h5>
            <ul className="space-y-3">
              {[
                ['Hombre', '/products?gender=HOMBRE'],
                ['Mujer', '/products?gender=MUJER'],
                ['Unisex', '/products?gender=UNISEX'],
                ['Novedades', '/products?isNew=true'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link to={href} className="text-xs text-muted hover:text-white transition-colors duration-300 font-light tracking-wide">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ayuda */}
          <div>
            <h5 className="text-[10px] font-medium uppercase tracking-[0.22em] mb-5 text-neutral-500">Ayuda</h5>
            <ul className="space-y-3">
              {[
                ['Mis Pedidos', '/orders'],
                ['Guía de Tallas', '#'],
                ['Envíos', '#'],
                ['Devoluciones', '#'],
                ['Contacto', '#'],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link to={href} className="text-xs text-muted hover:text-white transition-colors duration-300 font-light tracking-wide">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h5 className="text-[10px] font-medium uppercase tracking-[0.22em] mb-5 text-neutral-500">Síguenos</h5>
            <ul className="space-y-3">
              {[['Instagram', '#'], ['TikTok', '#'], ['Facebook', '#'], ['Pinterest', '#']].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-xs text-muted hover:text-white transition-colors duration-300 font-light tracking-wide">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] tracking-wider text-dim">© {year} ELITE. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] tracking-wider text-dim hover:text-muted transition-colors duration-300">Privacidad</a>
            <a href="#" className="text-[10px] tracking-wider text-dim hover:text-muted transition-colors duration-300">Términos</a>
            <a href="#" className="text-[10px] tracking-wider text-dim hover:text-muted transition-colors duration-300">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
