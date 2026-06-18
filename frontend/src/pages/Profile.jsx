import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService, uploadService } from '../services';
import { FiCamera, FiEdit2, FiSave, FiX, FiUser } from 'react-icons/fi';
import { toast } from 'react-toastify';

const Profile = () => {
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    profileImage: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        profileImage: user.profileImage || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      country: user.country || '',
      profileImage: user.profileImage || ''
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar 2MB');
      return;
    }

    try {
      setUploading(true);
      const response = await uploadService.uploadImage(file, true);
      const imageUrl = `http://localhost:8080${response.imageUrl}`;
      setFormData(prev => ({ ...prev, profileImage: imageUrl }));
      toast.success('Foto actualizada');
    } catch (error) {
      toast.error('Error al subir la foto');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.name && formData.name.length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Por favor ingresa un email válido');
        return;
      }
    }

    if (formData.phone) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        toast.error('El teléfono debe tener 10 dígitos');
        return;
      }
    }

    try {
      // Fetch the refreshed user profile from server after update
      const fresh = await authService.getCurrentUser();
      const updatedUser = { ...user, ...fresh };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Perfil actualizado');
      setIsEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al actualizar perfil');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <FiUser size={48} strokeWidth={1} className="text-dim mb-4" />
        <p className="text-lg font-semibold mb-2">Inicia sesión para ver tu perfil</p>
        <Link to="/login" className="btn-primary mt-4">Iniciar Sesión</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="container-xl max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="page-header">Mi Perfil</h1>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="btn-secondary flex items-center gap-2 self-start">
              <FiEdit2 size={15} /> Editar
            </button>
          ) : (
            <button
              onClick={() => { setIsEditing(false); resetForm(); }}
              className="btn-secondary flex items-center gap-2 self-start"
            >
              <FiX size={15} /> Cancelar
            </button>
          )}
        </div>

        <div className="card">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-surface2 border border-border flex items-center justify-center">
                {formData.profileImage ? (
                  <img src={formData.profileImage} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <FiUser size={40} strokeWidth={1} className="text-dim" />
                )}
              </div>

              {isEditing && (
                <label className="absolute bottom-0 right-0 w-9 h-9 bg-white text-black rounded-full flex items-center justify-center cursor-pointer hover:bg-neutral-100 transition-colors duration-200">
                  <FiCamera size={15} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                    aria-label="Subir foto de perfil"
                  />
                </label>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-bg/70 rounded-full flex items-center justify-center">
                  <span className="text-xs text-muted">Subiendo...</span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="form-label">Nombre Completo</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} disabled={!isEditing} className="input-field" required />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} disabled={!isEditing} className="input-field" required />
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} disabled={!isEditing} className="input-field" placeholder="3001234567" />
              </div>
              <div>
                <label className="form-label">Ciudad</label>
                <input type="text" name="city" value={formData.city} onChange={handleInputChange} disabled={!isEditing} className="input-field" placeholder="Bogotá" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">País</label>
                <input type="text" name="country" value={formData.country} onChange={handleInputChange} disabled={!isEditing} className="input-field" placeholder="Colombia" />
              </div>
            </div>

            <div>
              <label className="form-label">Dirección</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="input-field resize-none"
                rows="3"
                placeholder="Calle 123 #45-67, Apartamento 101"
              />
            </div>

            {isEditing && (
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                <FiSave size={15} /> Guardar Cambios
              </button>
            )}
          </form>

          {!isEditing && (
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-dim mb-4">Cuenta</h3>
              <div className="space-y-2 text-sm">
                <p className="text-muted">Tipo: <span className="text-text">{user.role === 'admin' || user.role === 'ADMIN' ? 'Administrador' : 'Cliente'}</span></p>
                {user.createdAt && (
                  <p className="text-muted">Miembro desde: <span className="text-text">{new Date(user.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
