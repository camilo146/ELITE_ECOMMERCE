import { useState, useEffect } from 'react';
import { promotionService, productService, uploadService } from '../../services';
import { FiEdit, FiTrash2, FiPlus, FiX, FiToggleLeft, FiToggleRight, FiTag, FiImage } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { formatPrice } from '../../utils/formatPrice';

const CATEGORIES = ['JEANS', 'CARGOS', 'BERMUDAS', 'JOGGERS', 'CAMISETAS', 'CAMISAS', 'HOODIES'];

const EMPTY_FORM = {
  name: '',
  title: '',
  description: '',
  imageUrl: '',
  promotionType: 'FIXED_PRICE_BUNDLE',
  minQuantity: 2,
  promotionalPrice: '',
  discountPercentage: '',
  startDate: '',
  endDate: '',
  active: false,
  showInPopup: false,
  showInBanner: false,
  ctaText: '',
  ctaUrl: '',
  productIds: [],
  categories: [],
};

const TYPE_LABELS = {
  FIXED_PRICE_BUNDLE: 'Bundle precio fijo',
  PERCENTAGE_DISCOUNT: 'Descuento porcentual',
};

const AdminPromotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    Promise.all([fetchPromotions(), fetchProducts()]);
  }, []);

  const fetchPromotions = async () => {
    try {
      const data = await promotionService.getAll();
      setPromotions(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Error al cargar promociones');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await productService.getProducts({ limit: 200 });
      setProducts(Array.isArray(data) ? data : (data.products || []));
    } catch { /* silent */ }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = async (promo) => {
    setEditingId(promo.id);
    setFormData({
      name: promo.name || '',
      title: promo.title || '',
      description: promo.description || '',
      imageUrl: promo.imageUrl || '',
      promotionType: promo.promotionType || 'FIXED_PRICE_BUNDLE',
      minQuantity: promo.minQuantity || 2,
      promotionalPrice: promo.promotionalPrice || '',
      discountPercentage: promo.discountPercentage || '',
      startDate: promo.startDate ? promo.startDate.slice(0, 16) : '',
      endDate: promo.endDate ? promo.endDate.slice(0, 16) : '',
      active: promo.active ?? false,
      showInPopup: promo.showInPopup ?? false,
      showInBanner: promo.showInBanner ?? false,
      ctaText: promo.ctaText || '',
      ctaUrl: promo.ctaUrl || '',
      productIds: (promo.products || []).map(p => p.id),
      categories: promo.categories || [],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleField = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const data = await uploadService.uploadImage(file);
      const url = data.url || data.imageUrl || data.filename;
      setFormData(prev => ({ ...prev, imageUrl: url }));
      toast.success('Imagen subida');
    } catch {
      toast.error('Error al subir imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleProductId = (id) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter(pid => pid !== id)
        : [...prev.productIds, id],
    }));
  };

  const toggleCategory = (cat) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      minQuantity: formData.minQuantity ? Number(formData.minQuantity) : null,
      promotionalPrice: formData.promotionalPrice ? Number(formData.promotionalPrice) : null,
      discountPercentage: formData.discountPercentage ? Number(formData.discountPercentage) : null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
    };
    try {
      if (editingId) {
        await promotionService.update(editingId, payload);
        toast.success('Promoción actualizada');
      } else {
        await promotionService.create(payload);
        toast.success('Promoción creada');
      }
      closeModal();
      fetchPromotions();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al guardar';
      toast.error(msg);
    }
  };

  const handleToggle = async (id) => {
    try {
      const updated = await promotionService.toggle(id);
      setPromotions(prev => prev.map(p => p.id === id ? updated : p));
      toast.success(updated.active ? 'Promoción activada' : 'Promoción desactivada');
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDelete = async (id) => {
    if (deleting !== id) { setDeleting(id); return; }
    try {
      await promotionService.delete(id);
      setPromotions(prev => prev.filter(p => p.id !== id));
      toast.success('Promoción eliminada');
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-8 pb-20">
        <div className="container-xl">
          <div className="skeleton h-10 w-64 mb-8" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="card skeleton h-20" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="container-xl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="page-header">Promociones</h1>
            <p className="text-sm text-muted mt-1">{promotions.length} promociones registradas</p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 self-start">
            <FiPlus size={16} /> Nueva Promoción
          </button>
        </div>

        {/* Table */}
        {promotions.length === 0 ? (
          <div className="card text-center py-20">
            <FiTag size={40} className="mx-auto text-muted mb-4" strokeWidth={1} />
            <p className="text-muted">No hay promociones todavía. Crea la primera.</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-dim font-medium tracking-wide text-xs uppercase">Nombre</th>
                    <th className="text-left px-5 py-3 text-dim font-medium tracking-wide text-xs uppercase">Tipo</th>
                    <th className="text-left px-5 py-3 text-dim font-medium tracking-wide text-xs uppercase">Detalle</th>
                    <th className="text-left px-5 py-3 text-dim font-medium tracking-wide text-xs uppercase">Popup</th>
                    <th className="text-left px-5 py-3 text-dim font-medium tracking-wide text-xs uppercase">Estado</th>
                    <th className="text-left px-5 py-3 text-dim font-medium tracking-wide text-xs uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map(promo => (
                    <tr key={promo.id} className="border-b border-border last:border-0 hover:bg-surface2 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium">{promo.title}</div>
                        <div className="text-xs text-muted">{promo.name}</div>
                      </td>
                      <td className="px-5 py-4 text-muted">{TYPE_LABELS[promo.promotionType]}</td>
                      <td className="px-5 py-4 text-muted">
                        {promo.promotionType === 'FIXED_PRICE_BUNDLE'
                          ? `${promo.minQuantity} × ${formatPrice(promo.promotionalPrice)}`
                          : `${promo.discountPercentage}% off`}
                      </td>
                      <td className="px-5 py-4">
                        {promo.showInPopup
                          ? <span className="text-xs bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-0.5 rounded-full">Sí</span>
                          : <span className="text-xs text-dim">No</span>}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggle(promo.id)}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${promo.active ? 'text-green-400' : 'text-dim'}`}
                        >
                          {promo.active ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                          {promo.active ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEdit(promo)} className="text-muted hover:text-white transition-colors">
                            <FiEdit size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(promo.id)}
                            className={`transition-colors ${deleting === promo.id ? 'text-red-400' : 'text-muted hover:text-red-400'}`}
                            title={deleting === promo.id ? 'Clic para confirmar' : 'Eliminar'}
                          >
                            <FiTrash2 size={15} />
                          </button>
                          {deleting === promo.id && (
                            <span className="text-xs text-red-400">¿Confirmar?</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-[var(--radius-lg)] w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-heading text-lg font-semibold">
                {editingId ? 'Editar Promoción' : 'Nueva Promoción'}
              </h2>
              <button onClick={closeModal} className="text-muted hover:text-white transition-colors">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Nombre interno */}
              <div>
                <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">Nombre interno (admin)</label>
                <input name="name" value={formData.name} onChange={handleField} required
                  className="input-underlined w-full" placeholder="ej: promo_3_pantalonetas_jun25" />
              </div>

              {/* Título visible */}
              <div>
                <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">Título visible</label>
                <input name="title" value={formData.title} onChange={handleField} required
                  className="input-underlined w-full" placeholder="ej: Lleva 3 pantalonetas por $149.900" />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">Descripción corta</label>
                <textarea name="description" value={formData.description} onChange={handleField} rows={2}
                  className="input-underlined w-full resize-none" placeholder="ej: Combina los colores que quieras" />
              </div>

              {/* Imagen */}
              <div>
                <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">Imagen del banner / popup</label>
                <div className="flex items-center gap-3">
                  <input name="imageUrl" value={formData.imageUrl} onChange={handleField}
                    className="input-underlined flex-1" placeholder="URL de imagen o sube una" />
                  <label className={`btn-ghost text-xs flex items-center gap-1.5 cursor-pointer ${uploadingImage ? 'opacity-50' : ''}`}>
                    <FiImage size={14} />
                    {uploadingImage ? 'Subiendo…' : 'Subir'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                </div>
                {formData.imageUrl && (
                  <img src={formData.imageUrl} alt="preview" className="mt-2 h-20 object-cover rounded border border-border" />
                )}
              </div>

              {/* Tipo de promoción */}
              <div>
                <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">Tipo de promoción</label>
                <select name="promotionType" value={formData.promotionType} onChange={handleField}
                  className="input-underlined w-full bg-transparent">
                  <option value="FIXED_PRICE_BUNDLE">Bundle precio fijo (ej: 3 por $149.900)</option>
                  <option value="PERCENTAGE_DISCOUNT">Descuento porcentual (ej: 20% off)</option>
                </select>
              </div>

              {/* Campos condicionales */}
              {formData.promotionType === 'FIXED_PRICE_BUNDLE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">Cantidad requerida</label>
                    <input type="number" name="minQuantity" value={formData.minQuantity} onChange={handleField}
                      min="2" required className="input-underlined w-full" />
                  </div>
                  <div>
                    <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">Precio del combo ($)</label>
                    <input type="number" name="promotionalPrice" value={formData.promotionalPrice} onChange={handleField}
                      min="1" required className="input-underlined w-full" placeholder="149900" />
                  </div>
                </div>
              )}

              {formData.promotionType === 'PERCENTAGE_DISCOUNT' && (
                <div>
                  <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">Porcentaje de descuento (%)</label>
                  <input type="number" name="discountPercentage" value={formData.discountPercentage} onChange={handleField}
                    min="1" max="100" required className="input-underlined w-full" placeholder="20" />
                </div>
              )}

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">Inicio (opcional)</label>
                  <input type="datetime-local" name="startDate" value={formData.startDate} onChange={handleField}
                    className="input-underlined w-full" />
                </div>
                <div>
                  <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">Fin (opcional)</label>
                  <input type="datetime-local" name="endDate" value={formData.endDate} onChange={handleField}
                    className="input-underlined w-full" />
                </div>
              </div>

              {/* CTA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">Texto del botón CTA</label>
                  <input name="ctaText" value={formData.ctaText} onChange={handleField}
                    className="input-underlined w-full" placeholder="ej: Armar combo" />
                </div>
                <div>
                  <label className="block text-xs text-dim uppercase tracking-wide mb-1.5">URL del botón (opcional)</label>
                  <input name="ctaUrl" value={formData.ctaUrl} onChange={handleField}
                    className="input-underlined w-full" placeholder="se genera auto si está vacío" />
                </div>
              </div>

              {/* Opciones de display */}
              <div className="flex flex-wrap gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="active" checked={formData.active} onChange={handleField}
                    className="accent-white" />
                  <span className="text-sm">Activa</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="showInPopup" checked={formData.showInPopup} onChange={handleField}
                    className="accent-white" />
                  <span className="text-sm">Mostrar en popup al entrar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="showInBanner" checked={formData.showInBanner} onChange={handleField}
                    className="accent-white" />
                  <span className="text-sm">Mostrar en banner del home</span>
                </label>
              </div>

              {/* Productos elegibles */}
              <div>
                <label className="block text-xs text-dim uppercase tracking-wide mb-2">
                  Productos elegibles (selecciona uno o más)
                </label>
                <div className="max-h-40 overflow-y-auto border border-border rounded-[var(--radius-md)] p-2 space-y-1">
                  {products.length === 0 && <p className="text-xs text-muted p-2">Cargando productos…</p>}
                  {products.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-surface2 rounded transition-colors">
                      <input type="checkbox" checked={formData.productIds.includes(p.id)}
                        onChange={() => toggleProductId(p.id)} className="accent-white" />
                      <span className="text-sm">{p.name}</span>
                      <span className="text-xs text-muted ml-auto">{p.category} · {formatPrice(p.price)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categorías elegibles */}
              <div>
                <label className="block text-xs text-dim uppercase tracking-wide mb-2">
                  O categorías elegibles completas
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${formData.categories.includes(cat) ? 'border-white text-white bg-white/10' : 'border-border text-muted hover:border-border-light'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={closeModal} className="btn-ghost">Cancelar</button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Guardar cambios' : 'Crear promoción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromotions;
