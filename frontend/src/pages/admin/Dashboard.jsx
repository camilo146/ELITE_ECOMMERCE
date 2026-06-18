import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService, orderService, userService } from '../../services';
import { FiPackage, FiShoppingBag, FiUsers, FiDollarSign } from 'react-icons/fi';
import { formatPrice } from '../../utils/formatPrice';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Obtener productos
      const productsData = await productService.getProducts({ limit: 1 });
      const totalProducts = Array.isArray(productsData) ? productsData.length : (productsData.total || 0);

      // Obtener usuarios (si falla, asumimos 0 para no romper el dashboard)
      let totalUsers = 0;
      try {
        const usersData = await userService.getUsers({ limit: 1 });
        totalUsers = Array.isArray(usersData) ? usersData.length : (usersData.total || 0);
      } catch (e) {
        console.warn('No se pudieron cargar usuarios:', e);
      }

      // Obtener pedidos (si falla, asumimos 0)
      let totalOrders = 0;
      try {
        const ordersData = await orderService.getAllOrders({ limit: 1 });
        totalOrders = Array.isArray(ordersData) ? ordersData.length : (ordersData.total || 0);
      } catch (e) {
        console.warn('No se pudieron cargar pedidos:', e);
      }

      setStats({
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue: 0 
      });
    } catch (error) {
      console.error('Error general en dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Productos', value: stats.totalProducts, icon: FiPackage, link: '/admin/products' },
    { title: 'Pedidos', value: stats.totalOrders, icon: FiShoppingBag, link: '/admin/orders' },
    { title: 'Usuarios', value: stats.totalUsers, icon: FiUsers, link: '/admin/users' },
    { title: 'Ingresos', value: formatPrice(stats.totalRevenue), icon: FiDollarSign, link: '/admin/finance' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen pt-8 pb-20">
        <div className="container-xl">
          <div className="skeleton h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="card skeleton h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="container-xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="page-header">Panel Admin</h1>
          <Link to="/" className="btn-secondary self-start">Volver a la Tienda</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {statCards.map((stat, index) => (
            <Link key={index} to={stat.link} className="card group hover:border-border-light transition-colors duration-200">
              <div className="w-10 h-10 bg-surface2 border border-border rounded-[var(--radius-md)] flex items-center justify-center mb-4 group-hover:border-border-light transition-colors duration-200">
                <stat.icon className="text-muted group-hover:text-white transition-colors duration-200" size={20} />
              </div>
              <p className="text-xs text-dim uppercase tracking-[0.15em] mb-1">{stat.title}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {[
            { to: '/admin/products', icon: FiPackage, title: 'Productos', desc: 'Crear, editar y eliminar' },
            { to: '/admin/orders', icon: FiShoppingBag, title: 'Pedidos', desc: 'Estados y seguimiento' },
            { to: '/admin/users', icon: FiUsers, title: 'Usuarios', desc: 'Cuentas y permisos' },
          ].map(({ to, icon: Icon, title, desc }) => (
            <Link key={to} to={to} className="card text-center p-8 hover:border-border-light transition-colors duration-200 group">
              <Icon size={32} strokeWidth={1.5} className="mx-auto mb-4 text-muted group-hover:text-white transition-colors duration-200" />
              <h3 className="font-heading text-lg font-semibold mb-1">{title}</h3>
              <p className="text-xs text-muted">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
