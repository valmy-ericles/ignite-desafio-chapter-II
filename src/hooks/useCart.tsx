import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const copyCart = [...cart]
      const productExists = copyCart.find(item => item.id === productId);
      
      const response = await api.get(`stock/${productId}`);
      const { amount } = response.data;

      if(productExists && productExists?.amount >= amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }
      
      if(productExists) {
        const index = copyCart.findIndex(item => item.id === productId)
        copyCart[index].amount += 1;

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(copyCart));
        setCart(copyCart);
      } else {
        const response = await api.get(`products/${productId}`);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...copyCart, { amount: 1, ...response.data }]));
        setCart([...copyCart, { amount: 1, ...response.data }]);
      }
      toast.success('Producto adicionado')
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const exists = cart.find(item => item.id === productId)
      if(!exists) throw 500;
      
      const filtered = cart.filter(item => item.id !== productId);
      setCart(filtered);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filtered));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) return;

      const response = await api.get(`stock/${productId}`);
      const amountStock = response.data.amount;

      if(amount > amountStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const copyCart = [...cart]
      const productExists = copyCart.find(item => item.id === productId);
      
      if(productExists) {
        productExists.amount = amount;
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(copyCart));
        setCart(copyCart);
      } else {
        throw Error();
      }      
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
