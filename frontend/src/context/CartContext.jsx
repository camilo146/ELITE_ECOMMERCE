import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);

  const getCartKey = () => {
    if (user && user.id) return `cart_${user.id}`;
    return 'cart_guest';
  };

  useEffect(() => {
    const cartKey = getCartKey();
    const savedCart = localStorage.getItem(cartKey);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        setCart([]);
      }
    } else {
      setCart([]);
    }
  }, [user]);

  useEffect(() => {
    const cartKey = getCartKey();
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, user]);

  const addToCart = (product, quantity = 1, size = null, color = null) => {
    setCart((prevCart) => {
      const productId = product.id || product._id;
      const existingItem = prevCart.find(
        (item) =>
          (item.id || item._id) === productId &&
          item.size === size &&
          item.color === color
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (product.stock !== undefined && newQuantity > product.stock) {
          toast.error(`Stock máximo alcanzado: ${product.stock}`);
          return prevCart;
        }
        toast.info('Cantidad actualizada en el carrito');
        return prevCart.map((item) =>
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

  const removeFromCart = (productId, size = null, color = null) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) =>
          !((item.id || item._id) === productId && item.size === size && item.color === color)
      )
    );
    toast.info('Producto eliminado del carrito');
  };

  const updateQuantity = (productId, quantity, size = null, color = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }

    setCart((prevCart) => {
      const itemToUpdate = prevCart.find(
        (item) =>
          (item.id || item._id) === productId &&
          item.size === size &&
          item.color === color
      );

      if (itemToUpdate && itemToUpdate.stock !== undefined && quantity > itemToUpdate.stock) {
        toast.error(`Stock máximo alcanzado (${itemToUpdate.stock})`);
        return prevCart;
      }

      return prevCart.map((item) =>
        (item.id || item._id) === productId && item.size === size && item.color === color
          ? { ...item, quantity }
          : item
      );
    });
  };

  const clearCart = () => {
    setCart([]);
    toast.info('Carrito vaciado');
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
