import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe ser usado dentro de CartProvider');
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  // appliedPromotion shape:
  // { id, type, title, promotionalPrice, discountPercentage, minQuantity,
  //   discount, comboItemKeys: Set<'productId-size-color'> }

  const getCartKey = () => (user?.id ? `cart_${user.id}` : 'cart_guest');
  const getPromoKey = () => (user?.id ? `cart_promo_${user.id}` : 'cart_promo_guest');

  // Load from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem(getCartKey());
    const savedPromo = localStorage.getItem(getPromoKey());
    try { setCart(savedCart ? JSON.parse(savedCart) : []); } catch { setCart([]); }
    try { setAppliedPromotion(savedPromo ? JSON.parse(savedPromo) : null); } catch { setAppliedPromotion(null); }
  }, [user]);

  // Persist cart
  useEffect(() => {
    localStorage.setItem(getCartKey(), JSON.stringify(cart));
  }, [cart, user]);

  // Persist promo
  useEffect(() => {
    if (appliedPromotion) {
      localStorage.setItem(getPromoKey(), JSON.stringify(appliedPromotion));
    } else {
      localStorage.removeItem(getPromoKey());
    }
  }, [appliedPromotion, user]);

  // Auto-remove promo if combo is broken
  useEffect(() => {
    if (!appliedPromotion) return;
    const { comboItemKeys, minQuantity } = appliedPromotion;
    if (!comboItemKeys) return;
    const keySet = new Set(Array.isArray(comboItemKeys) ? comboItemKeys : []);
    const comboItemsInCart = cart.filter(item => {
      const key = `${item.id || item._id}-${item.size}-${item.color}`;
      return keySet.has(key);
    });
    const totalComboQty = comboItemsInCart.reduce((n, i) => n + i.quantity, 0);
    if (totalComboQty < minQuantity) {
      setAppliedPromotion(null);
      toast.warn('Tu promoción fue removida porque el combo ya no cumple la cantidad mínima requerida.');
    }
  }, [cart]);

  // ── Regular cart actions ──────────────────────────────────────────────────

  const addToCart = (product, quantity = 1, size = null, color = null) => {
    setCart(prevCart => {
      const productId = product.id || product._id;
      const existing = prevCart.find(
        item => (item.id || item._id) === productId && item.size === size && item.color === color
      );
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (product.stock !== undefined && newQty > product.stock) {
          toast.error(`Stock máximo alcanzado: ${product.stock}`);
          return prevCart;
        }
        toast.info('Cantidad actualizada en el carrito');
        return prevCart.map(item =>
          (item.id || item._id) === productId && item.size === size && item.color === color
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        if (product.stock !== undefined && quantity > product.stock) {
          toast.error(`Sin suficiente stock. Disponible: ${product.stock}`);
          return prevCart;
        }
        toast.success('Producto agregado al carrito');
        return [...prevCart, { ...product, quantity, size, color }];
      }
    });
  };

  // ── Combo add ─────────────────────────────────────────────────────────────

  const addComboToCart = (promo, selectedItems) => {
    // selectedItems: array of { product, size, color }
    const comboItemKeys = [];

    setCart(prevCart => {
      let updatedCart = [...prevCart];
      for (const { product, size, color } of selectedItems) {
        const productId = product.id || product._id;
        const key = `${productId}-${size}-${color}`;
        comboItemKeys.push(key);
        const existing = updatedCart.find(
          item => (item.id || item._id) === productId && item.size === size && item.color === color
        );
        if (existing) {
          updatedCart = updatedCart.map(item =>
            (item.id || item._id) === productId && item.size === size && item.color === color
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          updatedCart = [...updatedCart, { ...product, quantity: 1, size, color }];
        }
      }
      return updatedCart;
    });

    // Calculate discount
    const originalTotal = selectedItems.reduce((sum, { product }) => sum + product.price, 0);
    let discount = 0;
    if (promo.promotionType === 'FIXED_PRICE_BUNDLE') {
      discount = Math.max(0, originalTotal - promo.promotionalPrice);
    } else if (promo.promotionType === 'PERCENTAGE_DISCOUNT') {
      discount = originalTotal * ((promo.discountPercentage || 0) / 100);
    }

    setAppliedPromotion({
      id: promo.id,
      type: promo.promotionType,
      title: promo.title,
      promotionalPrice: promo.promotionalPrice,
      discountPercentage: promo.discountPercentage,
      minQuantity: promo.minQuantity,
      discount,
      comboItemKeys,
    });

    toast.success(`¡Combo agregado! Ahorras ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(discount)}`);
  };

  const removeAppliedPromotion = () => {
    setAppliedPromotion(null);
  };

  const removeFromCart = (productId, size = null, color = null) => {
    setCart(prevCart =>
      prevCart.filter(
        item => !((item.id || item._id) === productId && item.size === size && item.color === color)
      )
    );
    toast.info('Producto eliminado del carrito');
  };

  const updateQuantity = (productId, quantity, size = null, color = null) => {
    if (quantity <= 0) { removeFromCart(productId, size, color); return; }
    setCart(prevCart => {
      const itemToUpdate = prevCart.find(
        item => (item.id || item._id) === productId && item.size === size && item.color === color
      );
      if (itemToUpdate?.stock !== undefined && quantity > itemToUpdate.stock) {
        toast.error(`Stock máximo alcanzado (${itemToUpdate.stock})`);
        return prevCart;
      }
      return prevCart.map(item =>
        (item.id || item._id) === productId && item.size === size && item.color === color
          ? { ...item, quantity }
          : item
      );
    });
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromotion(null);
    toast.info('Carrito vaciado');
  };

  const getCartSubtotal = () =>
    cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const getCartTotal = () => {
    const subtotal = getCartSubtotal();
    return subtotal - (appliedPromotion?.discount || 0);
  };

  const getCartCount = () =>
    cart.reduce((count, item) => count + item.quantity, 0);

  const value = {
    cart,
    appliedPromotion,
    addToCart,
    addComboToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    removeAppliedPromotion,
    getCartSubtotal,
    getCartTotal,
    getCartCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
