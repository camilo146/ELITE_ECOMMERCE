import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff, FiArrowRight, FiCheck, FiX } from 'react-icons/fi';

// Requisitos que exige el backend (RegisterRequest.java)
const PWD_RULES = [
  { label: 'Mínimo 8 caracteres',           test: p => p.length >= 8 },
  { label: 'Al menos una mayúscula',         test: p => /[A-Z]/.test(p) },
  { label: 'Al menos una minúscula',         test: p => /[a-z]/.test(p) },
  { label: 'Al menos un número',             test: p => /\d/.test(p) },
];

const Register = () => {
  const [formData, setFormData] = useState({
    username: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const pwdOk = PWD_RULES.every(r => r.test(formData.password));

  const validate = () => {
    if (formData.username.trim().length < 3) {
      toast.error('El nombre de usuario debe tener al menos 3 caracteres'); return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(formData.username.trim())) {
      toast.error('El usuario solo puede tener letras, números, _ y -'); return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Email inválido'); return false;
    }
    if (!/^[0-9+\-\s()]{7,20}$/.test(formData.phone.replace(/\s/g, ''))) {
      toast.error('Teléfono inválido (7-15 dígitos)'); return false;
    }
    if (!pwdOk) {
      toast.error('La contraseña no cumple los requisitos mínimos'); return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden'); return false;
    }
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });
      if (result?.emailVerificationRequired) {
        navigate('/login');
      } else {
        navigate('/');
      }
    } catch {
      // error handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
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
          <h2 className="font-heading text-4xl font-bold leading-tight mb-6">Tu estilo,<br />tu identidad.</h2>
          <ul className="space-y-3">
            {['Acceso anticipado a nuevas colecciones', 'Descuentos exclusivos para miembros', 'Historial de pedidos y devoluciones'].map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-muted">
                <FiCheck size={14} className="text-white flex-shrink-0" /> {item}
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
            {/* Username */}
            <div>
              <label className="form-label">Nombre de usuario</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input-field"
                placeholder="sin espacios: juan_perez"
                autoComplete="username"
                required
              />
              <p className="text-[10px] text-neutral-600 mt-1">Solo letras, números, _ y - (sin espacios)</p>
            </div>

            {/* Email */}
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

            {/* Phone */}
            <div>
              <label className="form-label">Teléfono</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="3001234567"
                autoComplete="tel"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="form-label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pr-11"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted">
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>

              {/* Password requirements */}
              {formData.password && (
                <ul className="mt-2 space-y-1">
                  {PWD_RULES.map(rule => {
                    const ok = rule.test(formData.password);
                    return (
                      <li key={rule.label} className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-green-500' : 'text-neutral-500'}`}>
                        {ok ? <FiCheck size={10} /> : <FiX size={10} />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="form-label">Confirmar Contraseña</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input-field pr-11 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500/50' : ''}`}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted">
                  {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-[11px] text-red-400 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Creando cuenta...' : <> Crear Cuenta <FiArrowRight size={15} /> </>}
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
