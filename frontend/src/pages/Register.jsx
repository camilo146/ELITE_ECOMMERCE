import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff, FiArrowRight, FiCheck } from 'react-icons/fi';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const passwordStrength = pwd => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    return score;
  };

  const strength = passwordStrength(formData.password);
  const strengthLabel = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][strength];
  const strengthColor = ['', '#e11d48', '#f59e0b', '#3b82f6', '#22c55e'][strength];

  const handleSubmit = async e => {
    e.preventDefault();
    if (formData.name.length < 3) { toast.error('Nombre demasiado corto'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { toast.error('Email inválido'); return; }
    if (!/^[0-9]{7,15}$/.test(formData.phone.replace(/\s/g, ''))) { toast.error('Teléfono inválido'); return; }
    if (formData.password.length < 6) { toast.error('Contraseña mínimo 6 caracteres'); return; }
    if (formData.password !== formData.confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }

    setLoading(true);
    try {
      await register({ username: formData.name, email: formData.email, phone: formData.phone, password: formData.password });
      navigate('/');
    } catch {
      // handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-surface border-r border-border p-14 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&h=1200&fit=crop&auto=format&q=75"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/60 to-surface/90" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="font-heading text-2xl font-black tracking-[0.25em] text-white">ELITE</Link>
        </div>

        <div className="relative z-10">
          <p className="text-xs uppercase tracking-widest text-muted mb-4">Únete a la comunidad</p>
          <h2 className="font-heading text-4xl font-bold leading-tight mb-6">
            Tu estilo,<br />tu identidad.
          </h2>
          <ul className="space-y-3">
            {['Acceso anticipado a nuevas colecciones', 'Descuentos exclusivos para miembros', 'Historial de pedidos y devoluciones'].map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-muted">
                <FiCheck size={14} className="text-white flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-dim">© {new Date().getFullYear()} ELITE Moda Urbana</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-bg overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="font-heading text-2xl font-black tracking-[0.25em] text-white">ELITE</Link>
          </div>

          <h1 className="font-heading text-2xl font-bold mb-1">Crear Cuenta</h1>
          <p className="text-muted text-sm mb-8">Únete a ELITE y accede a lo mejor de la moda urbana</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Nombre de usuario</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field" placeholder="Tu nombre" required />
            </div>

            <div>
              <label className="form-label">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="tu@correo.com" required />
            </div>

            <div>
              <label className="form-label">Teléfono</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input-field" placeholder="3001234567" required />
            </div>

            <div>
              <label className="form-label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pr-11"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted transition-colors duration-200" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: i <= strength ? strengthColor : '#262626' }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</p>
                </div>
              )}
            </div>

            <div>
              <label className="form-label">Confirmar Contraseña</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input-field pr-11 ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'input-field--error'
                      : ''
                  }`}
                  placeholder="Repite la contraseña"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted transition-colors duration-200" aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'Creando cuenta...' : (<>Crear Cuenta <FiArrowRight size={15} /></>)}
              </button>
            </div>
          </form>

          <p className="text-center mt-6 text-sm text-muted">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-white font-semibold hover:underline underline-offset-2">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
