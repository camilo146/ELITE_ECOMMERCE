import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch {
      // Siempre muestra éxito para no revelar si el email existe
      setSent(true);
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

        {sent ? (
          <div className="bg-surface/30 border border-border p-10 text-center">
            <FiCheck size={40} className="text-green-400 mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="font-heading text-lg font-light tracking-[0.1em] uppercase text-white mb-3">
              Correo enviado
            </h2>
            <p className="text-sm text-neutral-400 font-light mb-6 leading-relaxed">
              Si ese email está registrado, recibirás un enlace para restablecer tu contraseña.
              Revisa también tu carpeta de spam.
            </p>
            <Link to="/login" className="text-xs text-neutral-500 hover:text-white transition-colors uppercase tracking-widest">
              Volver al login
            </Link>
          </div>
        ) : (
          <>
            <Link to="/login" className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-white mb-8 uppercase tracking-widest transition-colors">
              <FiArrowLeft size={13} /> Volver
            </Link>

            <h1 className="font-heading text-2xl font-light tracking-[0.08em] uppercase text-white mb-2">
              Recuperar contraseña
            </h1>
            <p className="text-sm text-neutral-400 font-light mb-8">
              Te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
