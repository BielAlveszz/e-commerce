import { useState, useEffect } from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import ProductCard from "../components/ProductCard";
import Cart from "../components/Cart";

const Index = () => {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/produtos')
      .then(response => response.json())
      .then(data => setProducts(data))
      .catch(error => console.error("Erro ao buscar produtos:", error));
  }, []);

  const handleAddToCart = (productToAdd) => {
    setCartItems(prevItems => {
      const isItemInCart = prevItems.find(item => item.id === productToAdd.id);
      if (isItemInCart) {
        return prevItems.map(item =>
          item.id === productToAdd.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      }
      return [...prevItems, { ...productToAdd, quantity: 1 }];
    });
  };

  const handleCheckout = async () => { /* Código da resposta anterior */ };
  
  const totalCartItems = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div>
      <Header cartItems={totalCartItems} onCartClick={() => setIsCartOpen(true)} />
      <Hero />
      <main className="container my-5">
        <h2 className="text-center mb-4">Nossos Produtos</h2>
        <div className="row g-4">
          {products.map(product => (
            <div key={product.id} className="col-12 col-md-6 col-lg-3 d-flex align-items-stretch">
              <ProductCard product={product} onAddToCart={handleAddToCart} />
            </div>
          ))}
        </div>
      </main>
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} setCartItems={setCartItems} onCheckout={handleCheckout} />
    </div>
  );
};
export default Index;