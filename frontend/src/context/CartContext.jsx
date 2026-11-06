import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from '../services/Api';

export const precoEfetivo = (item) => {
    const base = item.preco_promocional && parseFloat(item.preco_promocional) > 0
        ? parseFloat(item.preco_promocional)
        : parseFloat(item.preco);

    const adicional = item.varianteSelecionada ? parseFloat(item.varianteSelecionada.preco_adicional) : 0;
    return base + adicional;
};

const CartContext = createContext();

const LOCAL_STORAGE_KEY = '@Meby:cart';

export const CartProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();

    // ─────────────────────────────────────────────────────────────────
    // 1. INICIALIZAÇÃO INTELIGENTE
    // Se o usuário não está logado, tenta puxar o carrinho do navegador
    // ─────────────────────────────────────────────────────────────────
    const [cartItems, setCartItems] = useState(() => {
        try {
            const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
            return localData ? JSON.parse(localData) : [];
        } catch (error) {
            return [];
        }
    });

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartLoading, setCartLoading] = useState(false);

    // ─────────────────────────────────────────────────────────────────
    // 2. SALVAR NO NAVEGADOR EM TEMPO REAL
    // Sempre que o carrinho muda e o usuário é anônimo, salva no HD dele
    // ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cartItems));
        }
    }, [cartItems, isAuthenticated]);

    // 3. RECUPERAR DO BANCO DE DADOS (Quando Logado)
    useEffect(() => {
        if (isAuthenticated) {
            setCartLoading(true);
            apiFetch('/api/carrinho')
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data?.items) setCartItems(data.items); })
                .catch(() => { })
                .finally(() => setCartLoading(false));
        } else {
            // Se ele fizer logout, limpa a tela e volta a carregar o carrinho anônimo que estava salvo
            try {
                const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
                setCartItems(localData ? JSON.parse(localData) : []);
            } catch {
                setCartItems([]);
            }
        }
    }, [isAuthenticated]);

    const quantidadeNoCarrinho = useCallback((productId, varianteId = null) => {
        const item = cartItems.find(i => i.id === productId && i.variante_id === varianteId);
        return item ? (item.quantity || 1) : 0;
    }, [cartItems]);

    const addToCart = useCallback(async (product, quantity = 1) => {
        const varianteId = product.varianteSelecionada ? product.varianteSelecionada.id : null;
        const estoqueReal = product.varianteSelecionada
            ? product.varianteSelecionada.quantidade_estoque
            : product.quantidade_estoque;

        const jaNoCarrinho = quantidadeNoCarrinho(product.id, varianteId);

        if (jaNoCarrinho + quantity > estoqueReal) {
            throw new Error(`Estoque insuficiente. Você já tem ${jaNoCarrinho} no carrinho e o estoque disponível é ${estoqueReal}.`);
        }

        if (isAuthenticated) {
            const res = await apiFetch('/api/carrinho/items', {
                method: 'POST',
                body: JSON.stringify({
                    produto_id: product.id,
                    quantidade: quantity,
                    produto_variante_id: varianteId
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setCartItems(data.items);
            setIsCartOpen(true);
            return;
        }

        // Adiciona no estado (que o useEffect acima vai salvar no localStorage automaticamente)
        setCartItems(prev => {
            const existing = prev.find(i => i.id === product.id && i.variante_id === varianteId);
            if (existing) {
                return prev.map(i =>
                    i.id === product.id && i.variante_id === varianteId
                        ? { ...i, quantity: (i.quantity || 1) + quantity }
                        : i
                );
            }
            return [...prev, {
                ...product,
                quantity,
                variante_id: varianteId,
                nome: varianteId ? `${product.nome} - ${product.varianteSelecionada.nome_variante}` : product.nome
            }];
        });
        setIsCartOpen(true);
    }, [isAuthenticated, quantidadeNoCarrinho]);

    const removeFromCart = useCallback(async (productId, varianteId = null) => {
        if (isAuthenticated) {
            const res = await apiFetch(`/api/carrinho/items/${productId}?varianteId=${varianteId || ''}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) { setCartItems(data.items); return; }
            throw new Error(data.message);
        }

        setCartItems(prev => prev.filter(i => !(i.id === productId && i.variante_id === varianteId)));
    }, [isAuthenticated]);

    const updateQuantity = useCallback(async (productId, param2, param3) => {
        // Lógica inteligente para descobrir quem é a variante e quem é a quantidade
        let varianteId = null;
        let newQuantity = 0;

        if (param3 !== undefined) {
            // Se enviou 3 parâmetros: (id, variante, quantidade)
            varianteId = param2;
            newQuantity = param3;
        } else {
            // Se enviou só 2 parâmetros: (id, quantidade)
            varianteId = null;
            newQuantity = param2;
        }

        const qtdConvertida = parseInt(newQuantity, 10);

        // Se por algum motivo o input ficar vazio, evitamos o erro silencioso
        if (isNaN(qtdConvertida)) {
            console.error("Quantidade inválida no carrinho:", newQuantity);
            return;
        }

        if (qtdConvertida <= 0) return removeFromCart(productId, varianteId);

        // Garante que o ID da variante seja null e não undefined na hora da busca
        const idVarianteBusca = varianteId || null;
        const item = cartItems.find(i => i.id === productId && (i.variante_id || null) === idVarianteBusca);

        const estoqueMax = item?.varianteSelecionada ? item.varianteSelecionada.quantidade_estoque : item?.quantidade_estoque;

        if (item && qtdConvertida > estoqueMax) {
            throw new Error(`Estoque máximo disponível: ${estoqueMax} unidades.`);
        }

        if (isAuthenticated) {
            try {
                // Monta os dados estritamente como o Zod do Backend gosta
                const bodyData = { quantidade: qtdConvertida };
                if (idVarianteBusca) {
                    bodyData.produto_variante_id = parseInt(idVarianteBusca, 10);
                }

                const res = await apiFetch(`/api/carrinho/items/${productId}`, {
                    method: 'PUT',
                    body: JSON.stringify(bodyData),
                });
                const data = await res.json();

                if (!res.ok) {
                    const msgErro = data.erros ? data.erros.map(e => e.message).join(', ') : data.message;
                    throw new Error(msgErro || 'Erro ao atualizar quantidade.');
                }

                setCartItems(data.items);
            } catch (err) {
                // Se der erro, joga para o frontend mostrar o Toast vermelho!
                console.error("Erro no backend:", err);
                throw err;
            }
            return;
        }

        setCartItems(prev =>
            prev.map(i => i.id === productId && (i.variante_id || null) === idVarianteBusca
                ? { ...i, quantity: qtdConvertida }
                : i)
        );
    }, [isAuthenticated, removeFromCart, cartItems]);

    // Essa função é chamada após o login para sincronizar com o banco
    const mergeLocalCartOnLogin = useCallback(async (localItems) => {
        if (!localItems || localItems.length === 0) return;
        try {
            const res = await apiFetch('/api/carrinho/merge', {
                method: 'POST',
                body: JSON.stringify({ items: localItems }),
            });
            const data = await res.json();
            if (res.ok) {
                setCartItems(data.items);
                // Limpa o navegador após o merge para não duplicar no futuro
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
        } catch (_) { }
    }, []);

    const checkout = useCallback(async (codigoCupom = null, metodoPagamento = 'pix', paymentData = null, enderecoId = null) => {
        if (cartItems.length === 0) throw new Error('O carrinho está vazio.');

        const itemsParaPedido = cartItems.map(i => ({
            id: i.id,
            quantity: i.quantity,
            variante_id: i.variante_id
        }));

        const res = await apiFetch('/api/pedidos', {
            method: 'POST',
            body: JSON.stringify({
                cartItems: itemsParaPedido,
                ...(codigoCupom ? { codigoCupom } : {}),
                ...(enderecoId ? { enderecoId } : {}),
                metodoPagamento, // NOVO: 'pix' ou 'cartao'
                paymentData      // NOVO: token seguro gerado pelo formulário do Mercado Pago
            }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Falha ao criar pedido.');
        }

        const orderData = await res.json();
        setCartItems([]);
        setIsCartOpen(false);
        localStorage.removeItem(LOCAL_STORAGE_KEY);

        return {
            pedido: orderData.pedido,
            desconto: orderData.desconto || 0,
            cartItems: [...cartItems],
            statusPagamento: orderData.statusPagamento // Para sabermos se o cartão foi aprovado imediatamente
        };
    }, [cartItems]);

    const value = {
        cartItems,
        isCartOpen,
        cartLoading,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        mergeLocalCartOnLogin,
        checkout,
        quantidadeNoCarrinho,
        totalCartItems: cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);