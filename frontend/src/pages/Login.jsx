import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('Email inválido');
      return;
    }
    if (!formData.password.trim()) {
      toast.error('Ingresa tu contraseña');
      return;
    }
    setLoading(true);
    try {
      const userData = await login({
        email: formData.email.trim(),
        password: formData.password.trim(),
      });
      toast.success(`Bienvenido, ${userData.name || userData.username}`);
      if (userData.role === 'admin' || userData.role === 'ADMIN') navigate('/admin');
      else navigate('/');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || '';
      if (status === 403 && msg.toLowerCase().includes('verify')) {
        toast.warning('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
      }
      // otros errores los maneja AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand (desktop only) */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-surface border-r border-border p-14 relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&h=1200&fit=crop&auto=format&q=75"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/60 to-surface/90" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <Link to="/" className="font-heading text-2xl font-black tracking-[0.25em] text-white">ELITE</Link>
        </div>

        <div className="relative z-10">
          <p className="text-xs uppercase tracking-widest text-muted mb-4">Temporada 2025</p>
          <h2 className="font-heading text-4xl font-bold leading-tight mb-4">
            Moda que<br />te define.
          </h2>
          <p className="text-muted text-sm max-w-xs leading-relaxed">
            Accede a tu cuenta y descubre las últimas colecciones de ropa urbana premium.
          </p>
        </div>

        <p className="relative z-10 text-xs text-dim">© {new Date().getFullYear()} ELITE Moda Urbana</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-bg">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="font-heading text-2xl font-black tracking-[0.25em] text-white">ELITE</Link>
          </div>

          <h1 className="font-heading text-2xl font-bold mb-1">Iniciar Sesión</h1>
          <p className="text-muted text-sm mb-8">Bienvenido de vuelta</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="tu@correo.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="form-label mb-0">Contraseña</label>
                <Link to="/forgot-password" className="text-xs text-dim hover:text-muted transition-colors">¿Olvidaste tu contraseña?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pr-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted transition-colors duration-200"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Ingresando...' : (
                  <>Entrar <FiArrowRight size={15} /></>
                )}
              </button>
            </div>
          </form>

          <p className="text-center mt-6 text-sm text-muted">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-white font-semibold hover:underline underline-offset-2">
              Regístrate
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;
