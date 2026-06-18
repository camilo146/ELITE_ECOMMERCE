import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../services';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-neutral-400 mb-4">Enlace inválido o expirado.</p>
          <Link to="/forgot-password" className="btn-primary">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  const validate = () => {
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      toast.error('Debe incluir mayúsculas, minúsculas y un número');
      return false;
    }
    if (form.password !== form.confirm) {
      toast.error('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authService.resetPassword(token, form.password);
      toast.success('Contraseña actualizada. Inicia sesión.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg?.includes('expired') || msg?.includes('expirado')) {
        toast.error('El enlace expiró. Solicita uno nuevo.');
      } else {
        toast.error(msg || 'Error al restablecer la contraseña');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link to="/" className="font-heading text-lg font-light tracking-[0.38em] text-white uppercase">
            ÉLITE
          </Link>
        </div>

        <h1 className="font-heading text-2xl font-light tracking-[0.08em] uppercase text-white mb-2">
          Nueva contraseña
        </h1>
        <p className="text-sm text-neutral-400 font-light mb-8">
          Mínimo 8 caracteres, con mayúsculas, minúsculas y un número.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="input-field pr-11"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted"
              >
                {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">Confirmar contraseña</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              className="input-field"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : <> Guardar contraseña <FiArrowRight size={15} /> </>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
