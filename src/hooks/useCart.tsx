import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productToAdd = await api.get<Product>(`products/${productId}`).then(response => response.data);
      if (!productToAdd) {
        toast.error('Produto não encontrado');
        return;
      }

      const productAmountInStock = await api.get<Stock>(`stock/${productId}`).then(response => response.data);
      const productInCart = cart.find(product => product.id === productId);

      if (!productInCart) {
        const newProduct = { ...productToAdd, amount: 1 }
        if (newProduct.amount <= productAmountInStock.amount) {
          const attCart = [...cart, newProduct];
          setCart(attCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(attCart));
        }
        else {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
      }
      else {
        if (productAmountInStock.amount <= productInCart.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        updateProductAmount({ productId, amount: productInCart.amount + 1 })
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId);
      if (!cart[productIndex]) {
        toast.error('Erro na remoção do produto');
        return;
      }
      const attCart = cart.filter(product => product.id !== productId);
      setCart([...attCart]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(attCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      // TODO
      const productIndex = cart.findIndex(product => product.id === productId);
      if (!cart[productIndex]) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      if (!(amount > 0)) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const productAmountInStock = await api.get<Stock>(`stock/${productId}`).then(response => response.data);
      if (!(productAmountInStock.amount > cart[productIndex].amount)) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const attCart = cart.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            amount: amount
          };
        }
        return { ...product };
      });
      setCart(attCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(attCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
