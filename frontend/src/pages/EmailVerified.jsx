import { useSearchParams, Link } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiClock, FiArrowRight } from 'react-icons/fi';
import { useState } from 'react';
import { authService } from '../services';
import { toast } from 'react-toastify';

const CONFIG = {
  success: {
    icon: FiCheckCircle,
    color: 'text-green-400',
    title: 'Email verificado',
    desc: 'Tu cuenta ha sido activada. Ya puedes iniciar sesión.',
    action: null,
  },
  expired: {
    icon: FiClock,
    color: 'text-yellow-400',
    title: 'Enlace expirado',
    desc: 'El enlace de verificación ha expirado. Puedes solicitar uno nuevo.',
    action: 'resend',
  },
  error: {
    icon: FiXCircle,
    color: 'text-red-400',
    title: 'Enlace inválido',
    desc: 'El enlace no es válido. Solicita un nuevo correo de verificación.',
    action: 'resend',
  },
};

const EmailVerified = () => {
  const [params] = useSearchParams();
  const status = params.get('status') || 'error';
  const config = CONFIG[status] || CONFIG.error;
  const Icon = config.icon;

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async e => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authService.resendVerification(email);
      setSent(true);
      toast.success('Correo enviado. Revisa tu bandeja.');
    } catch {
      toast.error('Error al enviar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <Link to="/" className="font-heading text-lg font-light tracking-[0.38em] text-white uppercase">
            ELITE
          </Link>
        </div>

        <div className="bg-surface/30 border border-border p-10">
          <Icon size={48} className={`${config.color} mx-auto mb-6`} strokeWidth={1.25} />

          <h1 className="font-heading text-xl font-light tracking-[0.1em] uppercase text-white mb-3">
            {config.title}
          </h1>
          <p className="text-sm text-neutral-400 font-light mb-8 leading-relaxed">
            {config.desc}
          </p>

          {status === 'success' && (
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              Iniciar Sesión <FiArrowRight size={14} />
            </Link>
          )}

          {config.action === 'resend' && !sent && (
            <form onSubmit={handleResend} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Tu email"
                className="input-field"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Reenviar verificación'}
              </button>
            </form>
          )}

          {sent && (
            <p className="text-sm text-green-400">
              Enlace enviado. Revisa tu bandeja de entrada.
            </p>
          )}

          <p className="mt-6 text-xs text-neutral-600">
            <Link to="/login" className="hover:text-neutral-400 transition-colors">
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerified;
