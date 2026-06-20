import { useState, useEffect } from 'react';
import { productService, uploadService } from '../../services';
import { FiEdit, FiTrash2, FiPlus, FiX, FiImage, FiPackage } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { formatPrice } from '../../utils/formatPrice';

const CATEGORIES = ['JEANS', 'CARGOS', 'BERMUDAS', 'JOGGERS', 'CAMISETAS', 'CAMISAS', 'HOODIES'];
const GENDERS = ['HOMBRE', 'MUJER', 'UNISEX'];
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36'];

const AVAILABLE_COLORS = [
  { name: 'Negro', hex: '#111111' },
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Gris', hex: '#6B7280' },
  { name: 'Gris Melange', hex: '#9CA3AF' },
  { name: 'Beige', hex: '#D4B896' },
  { name: 'Azul Oscuro', hex: '#1E3A5F' },
  { name: 'Azul Claro', hex: '#93C5FD' },
  { name: 'Azul', hex: '#1D4ED8' },
  { name: 'Rojo', hex: '#EF4444' },
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Verde Militar', hex: '#4B5320' },
  { name: 'Bordeaux', hex: '#6D1A36' },
  { name: 'Caqui', hex: '#C3B091' },
  { name: 'Azul Marino', hex: '#1E3A5F' },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  originalPrice: '',
  salePrice: '',
  category: 'CAMISETAS',
  gender: 'UNISEX',
  brand: 'ELITE',
  material: '',
  images: [],
  sizes: [],
  colors: [],
  stock: 0,
  featured: false,
  isNew: false,
  onSale: false,
};

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [uploadedImages, setUploadedImages] = useState([]); // from file upload (/uploads/...)
  const [imageUrls, setImageUrls] = useState(['']);          // manually typed external URLs
  const [uploadingImages, setUploadingImages] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [originalPriceBeforeDiscount, setOriginalPriceBeforeDiscount] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await productService.getProducts({ limit: 100 });
      setProducts(Array.isArray(data) ? data : (data.products || []));
    } catch {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        originalPrice: product.originalPrice || '',
        salePrice: product.salePrice || '',
        category: product.category || 'CAMISETAS',
        gender: product.gender || 'UNISEX',
        brand: product.brand || 'ELITE',
        material: product.material || '',
        images: product.images || [],
        sizes: product.sizes || [],
        colors: product.colors || [],
        stock: product.stock || 0,
        featured: product.featured || false,
        isNew: product.isNew || false,
        onSale: product.onSale || false,
      });
      // Separate uploaded (/uploads/...) from external URLs so the URL
      // inputs stay clean and don't show internal storage paths.
      const uploads = (product.images || []).filter(u => u.startsWith('/uploads/'));
      const externalUrls = (product.images || []).filter(u => !u.startsWith('/uploads/'));
      setUploadedImages(uploads);
      setImageUrls(externalUrls.length > 0 ? externalUrls : ['']);

      if (product.onSale && product.salePrice) {
        const discount = Math.round(((product.salePrice - product.price) / product.salePrice) * 100);
        setDiscountPercentage(discount);
        setOriginalPriceBeforeDiscount(product.salePrice.toString());
      } else {
        setDiscountPercentage(0);
        setOriginalPriceBeforeDiscount('');
      }
    } else {
      setEditingProduct(null);
      setFormData(EMPTY_FORM);
      setUploadedImages([]);
      setImageUrls(['']);
      setDiscountPercentage(0);
      setOriginalPriceBeforeDiscount('');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'onSale' && checked && formData.price) {
      const currentPrice = parseFloat(formData.price);
      setOriginalPriceBeforeDiscount(currentPrice.toString());
      setDiscountPercentage(20);
      setFormData(prev => ({
        ...prev,
        onSale: true,
        salePrice: currentPrice.toString(),
        price: (currentPrice * 0.8).toFixed(2),
      }));
      return;
    }

    if (name === 'onSale' && !checked) {
      if (originalPriceBeforeDiscount) {
        setFormData(prev => ({ ...prev, price: originalPriceBeforeDiscount, salePrice: '', onSale: false }));
      }
      setDiscountPercentage(0);
      setOriginalPriceBeforeDiscount('');
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleDiscountChange = (pct) => {
    setDiscountPercentage(pct);
    if (originalPriceBeforeDiscount) {
      const base = parseFloat(originalPriceBeforeDiscount);
      setFormData(prev => ({
        ...prev,
        salePrice: originalPriceBeforeDiscount,
        price: (base * (1 - pct / 100)).toFixed(2),
      }));
    }
  };

  const toggleSize = (size) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const toggleColor = (colorName) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.includes(colorName)
        ? prev.colors.filter(c => c !== colorName)
        : [...prev.colors, colorName],
    }));
  };

  const syncImages = (uploaded, urls) =>
    [...uploaded, ...urls.filter(u => u.trim())];

  const handleImageUrlChange = (index, value) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
    setFormData(prev => ({ ...prev, images: syncImages(uploadedImages, newUrls) }));
  };

  const addImageUrl = () => setImageUrls([...imageUrls, '']);

  const removeImageUrl = (index) => {
    const newUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(newUrls.length > 0 ? newUrls : ['']);
    setFormData(prev => ({ ...prev, images: syncImages(uploadedImages, newUrls) }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingImages(true);
    try {
      const results = await Promise.all(files.map(f => uploadService.uploadImage(f)));
      const newUploaded = [...uploadedImages, ...results.map(r => r.imageUrl)];
      setUploadedImages(newUploaded);
      setFormData(prev => ({ ...prev, images: syncImages(newUploaded, imageUrls) }));
      toast.success(`${files.length} imagen(es) subida(s)`);
    } catch {
      toast.error('Error al subir imágenes');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.price || !formData.category) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    if (formData.name.length < 3) { toast.error('El nombre debe tener al menos 3 caracteres'); return; }
    if (formData.description.length < 10) { toast.error('La descripción debe tener al menos 10 caracteres'); return; }
    if (parseFloat(formData.price) <= 0) { toast.error('El precio debe ser mayor a 0'); return; }
    if (parseInt(formData.stock) < 0) { toast.error('El stock no puede ser negativo'); return; }
    if (formData.images.length === 0) { toast.error('Agrega al menos una imagen'); return; }
    if (formData.sizes.length === 0) { toast.warning('Se recomienda agregar al menos una talla'); }

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
        stock: parseInt(formData.stock) || 0,
        status: 'ACTIVE',
      };

      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, productData);
        toast.success('Producto actualizado');
      } else {
        await productService.createProduct(productData);
        toast.success('Producto creado');
      }

      closeModal();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try {
      await productService.deleteProduct(id);
      toast.success('Producto eliminado');
      fetchProducts();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="container-xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="page-header">Productos</h1>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <FiPlus /> Nuevo Producto
          </button>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4">Imagen</th>
                <th className="text-left p-4">Nombre</th>
                <th className="text-left p-4">Precio</th>
                <th className="text-left p-4">Categoría</th>
                <th className="text-left p-4">Género</th>
                <th className="text-left p-4">Stock</th>
                <th className="text-left p-4">Estado</th>
                <th className="text-right p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-border hover:bg-surface2/50">
                  <td className="p-4">
                    <div className="w-12 h-12 bg-surface2 rounded overflow-hidden">
                      {product.images?.[0]
                        ? <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-dim"><FiPackage size={20} strokeWidth={1} /></div>}
                    </div>
                  </td>
                  <td className="p-4 font-medium">{product.name}</td>
                  <td className="p-4">
                    <span className="font-semibold text-green-400">{formatPrice(product.price)}</span>
                    {product.onSale && product.salePrice && (
                      <p className="text-xs text-dim line-through">{formatPrice(product.salePrice)}</p>
                    )}
                  </td>
                  <td className="p-4 capitalize text-sm">{product.category}</td>
                  <td className="p-4 text-sm text-muted">{product.gender}</td>
                  <td className="p-4">
                    <span className={product.stock > 0 ? 'text-green-400' : 'text-red-400'}>{product.stock}</span>
                  </td>
                  <td className="p-4">
                    {product.featured && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded mr-1">Dest.</span>}
                    {product.isNew && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded mr-1">NEW</span>}
                    {product.onSale && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">SALE</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openModal(product)} className="p-2 hover:bg-surface2 rounded"><FiEdit /></button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-red-900/50 rounded text-red-400"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <p className="text-center py-12 text-dim">No hay productos. Crea el primero.</p>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-surface rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-surface border-b border-border p-6 flex justify-between items-center z-10">
                <h2 className="text-2xl font-bold">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                <button onClick={closeModal} className="text-muted hover:text-white"><FiX size={24} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Nombre del Producto *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field" required />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Descripción *</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows="4" className="input-field" required />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Precio de Venta *</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} step="0.01" min="0" className="input-field" required />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Precio de Costo (opcional)</label>
                    <input type="number" name="originalPrice" value={formData.originalPrice} onChange={handleChange} step="0.01" min="0" className="input-field" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Categoría *</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="input-field" required>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Género *</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="input-field" required>
                      {GENDERS.map(g => (
                        <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Marca</label>
                    <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="input-field" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Material</label>
                    <input type="text" name="material" value={formData.material} onChange={handleChange} placeholder="Ej: 100% Algodón" className="input-field" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Stock *</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleChange} min="0" className="input-field" required />
                  </div>
                </div>

                {/* Tallas */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Tallas Disponibles <span className="text-dim">(selecciona todas las que apliquen)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SIZES.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={`min-w-[3rem] px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                          formData.sizes.includes(size)
                            ? 'border-white bg-white text-black'
                            : 'border-border text-muted hover:border-border-light'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {formData.sizes.length > 0 && (
                    <p className="text-xs text-dim mt-2">Seleccionadas: {formData.sizes.join(', ')}</p>
                  )}
                </div>

                {/* Imágenes */}
                <div>
                  <label className="block text-sm font-medium mb-2">Imágenes del Producto *</label>

                  <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 text-blue-400 rounded-lg border-2 border-dashed border-blue-500/50 hover:bg-blue-500/30 cursor-pointer transition mb-3">
                    <FiImage size={20} />
                    <span>{uploadingImages ? 'Subiendo...' : 'Subir Imágenes'}</span>
                    <input type="file" accept="image/*" multiple onChange={handleFileUpload} disabled={uploadingImages} className="hidden" />
                  </label>

                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {formData.images.map((url, index) => (
                        <div key={index} className="relative group">
                          <img src={url} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => {
                              const url = formData.images[index];
                              if (url.startsWith('/uploads/')) {
                                const newUploaded = uploadedImages.filter(u => u !== url);
                                setUploadedImages(newUploaded);
                                setFormData(prev => ({ ...prev, images: syncImages(newUploaded, imageUrls) }));
                              } else {
                                const newUrls = imageUrls.filter(u => u !== url);
                                const safe = newUrls.length > 0 ? newUrls : [''];
                                setImageUrls(safe);
                                setFormData(prev => ({ ...prev, images: syncImages(uploadedImages, newUrls) }));
                              }
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-muted mb-2">O pega URLs:</p>
                  <div className="space-y-2">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => handleImageUrlChange(index, e.target.value)}
                          placeholder="https://ejemplo.com/imagen.jpg"
                          className="input-field flex-1"
                        />
                        {imageUrls.length > 1 && (
                          <button type="button" onClick={() => removeImageUrl(index)} className="px-3 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">
                            <FiX />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addImageUrl} className="btn-secondary w-full text-sm">+ Agregar URL</button>
                  </div>
                </div>

                {/* Colores */}
                <div>
                  <label className="block text-sm font-medium mb-3">Colores Disponibles</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_COLORS.map(colorObj => {
                      const isSelected = formData.colors.includes(colorObj.name);
                      return (
                        <button
                          key={colorObj.name}
                          type="button"
                          onClick={() => toggleColor(colorObj.name)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm transition ${
                            isSelected ? 'border-white bg-white/10' : 'border-border hover:border-border-light'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: colorObj.hex }} />
                          <span>{colorObj.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Opciones */}
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="featured" checked={formData.featured} onChange={handleChange} className="w-4 h-4" />
                    <span>Producto Destacado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="isNew" checked={formData.isNew} onChange={handleChange} className="w-4 h-4" />
                    <span>Nuevo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="onSale" checked={formData.onSale} onChange={handleChange} className="w-4 h-4" />
                    <span>En Oferta</span>
                  </label>
                </div>

                {/* Descuento */}
                {formData.onSale && (
                  <div className="card bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30">
                    <h3 className="text-lg font-bold mb-4">Configuración de Descuento</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Descuento: <span className="text-red-400 text-xl font-bold">{discountPercentage}%</span>
                        </label>
                        <input
                          type="range" min="5" max="90" step="5"
                          value={discountPercentage}
                          onChange={(e) => handleDiscountChange(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      {originalPriceBeforeDiscount && (
                        <div className="bg-surface2/50 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted">Precio original:</span>
                            <span className="line-through text-dim">{formatPrice(originalPriceBeforeDiscount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted">Descuento:</span>
                            <span className="text-red-400">-{formatPrice(parseFloat(originalPriceBeforeDiscount) * discountPercentage / 100)}</span>
                          </div>
                          <div className="flex justify-between border-t border-border pt-2">
                            <span className="font-bold">Precio final:</span>
                            <span className="text-2xl font-bold text-green-400">{formatPrice(formData.price)}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {[10, 20, 30, 40, 50, 60, 70].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleDiscountChange(pct)}
                            className={`px-3 py-1.5 rounded text-sm transition ${
                              discountPercentage === pct ? 'bg-red-500 text-white' : 'bg-surface2 text-muted hover:bg-surface2'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    {editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                  </button>
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
