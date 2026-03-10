import { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Minus, Trash2, Tag,
  Store, Utensils, CheckCircle, ArrowLeft, Percent, Loader2,
} from 'lucide-react';
import { fetchProducts, type Product, type ProductCategory } from '../api/products';
import { createSale, type CreateSaleBody, type OrderType, type PaymentMethod } from '../api/sales';

// --- Constants ---

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  bread: 'Pães',
  pastry: 'Confeitaria',
  beverage: 'Bebidas',
};

const ALL_CATEGORIES: ('all' | ProductCategory)[] = ['all', 'bread', 'pastry', 'beverage'];

const CATEGORY_FILTER_LABELS: Record<string, string> = {
  all: 'Todas',
  ...CATEGORY_LABELS,
};

type DiscountType = 'percent' | 'fixed';

interface CartItem {
  product: Product;
  quantity: number;
  discountType: DiscountType;
  discountValueInCents: number;
}

interface PDVProps {
  onBack?: () => void;
}

// --- Helpers ---

function centsToReais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function reaisToCents(reais: string): number {
  const parsed = parseFloat(reais);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

// --- Component ---

export default function PDV({ onBack }: PDVProps) {
  // Product catalog
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProductCategory>('all');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeDiscountIdx, setActiveDiscountIdx] = useState<number | null>(null);

  // Global discount
  const [globalDiscountType, setGlobalDiscountType] = useState<DiscountType>('fixed');
  const [globalDiscountValueInCents, setGlobalDiscountValueInCents] = useState(0);

  // Checkout modal
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('counter');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // --- Load products ---

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => setCatalogError(err.message))
      .finally(() => setLoadingProducts(false));
  }, []);

  // --- Derived: categories from data ---

  const availableCategories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))];
    return ['all' as const, ...cats];
  }, [products]);

  // --- Derived: filtered products ---

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // --- Derived: totals (all in cents) ---

  const { subtotalInCents, totalDiscountInCents, totalQuantity, finalTotalInCents } = useMemo(() => {
    let sub = 0;
    let itemsDiscount = 0;
    let qty = 0;

    cart.forEach((item) => {
      const price = item.product.promoActive && item.product.promoPriceInCents
        ? item.product.promoPriceInCents
        : item.product.basePriceInCents;
      const rawLine = item.quantity * price;
      sub += rawLine;
      qty += item.quantity;

      let disc = 0;
      if (item.discountType === 'percent') {
        disc = Math.round(rawLine * (item.discountValueInCents / 100));
      } else {
        disc = item.discountValueInCents;
      }
      itemsDiscount += Math.min(disc, rawLine);
    });

    const postItemSub = sub - itemsDiscount;

    let gDisc = 0;
    if (globalDiscountType === 'percent') {
      gDisc = Math.round(postItemSub * (globalDiscountValueInCents / 100));
    } else {
      gDisc = globalDiscountValueInCents;
    }
    gDisc = Math.min(gDisc, postItemSub);

    const tDisc = itemsDiscount + gDisc;
    const finalT = Math.max(0, sub - tDisc);

    return {
      subtotalInCents: sub,
      totalDiscountInCents: tDisc,
      totalQuantity: qty,
      finalTotalInCents: finalT,
    };
  }, [cart, globalDiscountType, globalDiscountValueInCents]);

  // --- Actions ---

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.findIndex((i) => i.product.id === product.id);
      if (existing >= 0) {
        const newCart = [...prev];
        newCart[existing] = { ...newCart[existing], quantity: newCart[existing].quantity + 1 };
        return newCart;
      }
      return [...prev, { product, quantity: 1, discountType: 'fixed', discountValueInCents: 0 }];
    });
  }

  function updateQuantity(idx: number, delta: number) {
    setCart((prev) => {
      const newCart = [...prev];
      const newQty = newCart[idx].quantity + delta;
      if (newQty <= 0) {
        newCart.splice(idx, 1);
        if (activeDiscountIdx === idx) setActiveDiscountIdx(null);
        else if (activeDiscountIdx !== null && activeDiscountIdx > idx) setActiveDiscountIdx(activeDiscountIdx - 1);
        return newCart;
      }
      newCart[idx] = { ...newCart[idx], quantity: newQty };
      return newCart;
    });
  }

  function updateItemDiscount(idx: number, type: DiscountType, value: number) {
    setCart((prev) => {
      const newCart = [...prev];
      newCart[idx] = { ...newCart[idx], discountType: type, discountValueInCents: value };
      return newCart;
    });
  }

  function clearCart() {
    setCart([]);
    setGlobalDiscountValueInCents(0);
    setActiveDiscountIdx(null);
  }

  async function handleConfirmOrder() {
    setSubmitting(true);
    try {
      const itemsDiscountTotal = cart.reduce((sum, item) => {
        const price = getEffectivePrice(item.product);
        const rawLine = item.quantity * price;
        const disc = item.discountType === 'percent'
          ? Math.round(rawLine * (item.discountValueInCents / 100))
          : item.discountValueInCents;
        return sum + Math.min(disc, rawLine);
      }, 0);

      const postItemSubtotal = subtotalInCents - itemsDiscountTotal;
      const computedGlobalDiscount = globalDiscountType === 'percent'
        ? Math.round(postItemSubtotal * (globalDiscountValueInCents / 100))
        : globalDiscountValueInCents;

      const body: CreateSaleBody = {
        items: cart.map((item) => {
          const price = getEffectivePrice(item.product);
          const rawLine = item.quantity * price;
          return {
            productId: item.product.id,
            quantity: item.quantity,
            discountInCents: item.discountType === 'percent'
              ? Math.round(rawLine * (item.discountValueInCents / 100))
              : item.discountValueInCents,
          };
        }),
        paymentMethod,
        orderType,
        tableNumber: orderType === 'table' ? tableNumber : undefined,
        globalDiscountInCents: Math.min(computedGlobalDiscount, postItemSubtotal),
        totalInCents: finalTotalInCents,
      };

      await createSale(body);
      setCheckoutSuccess(true);
      setTimeout(() => {
        setCheckoutSuccess(false);
        setCheckoutModalOpen(false);
        clearCart();
        setOrderType('counter');
        setTableNumber('');
        setPaymentMethod('cash');
      }, 2000);
    } catch {
      setCatalogError('Erro ao finalizar pedido');
    } finally {
      setSubmitting(false);
    }
  }

  // --- Render helpers ---

  function getEffectivePrice(product: Product): number {
    return product.promoActive && product.promoPriceInCents
      ? product.promoPriceInCents
      : product.basePriceInCents;
  }

  // --- Loading state ---

  if (loadingProducts) {
    return (
      <div className="flex items-center justify-center h-screen fixed inset-0 z-50 bg-cream-50">
        <Loader2 className="animate-spin text-bakery-500" size={40} />
      </div>
    );
  }

  if (catalogError && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen fixed inset-0 z-50 bg-cream-50">
        <p className="text-red-600">Erro ao carregar catálogo: {catalogError}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen bg-cream-50 overflow-hidden font-sans fixed inset-0 z-50">

      {/* 60% PANEL: CATALOG */}
      <div className="w-[60%] flex flex-col h-full border-r border-wheat-200">

        {/* Header / Search / Filters */}
        <div className="p-4 bg-white shadow-sm z-10 flex flex-col gap-4 sticky top-0">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 bg-wheat-100 text-wheat-900 rounded-lg hover:bg-wheat-200 transition-colors"
                title="Voltar ao Backoffice"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-2xl font-bold text-bakery-600 tracking-tight flex-1">PDV</h1>
            <div className="relative w-64 text-gray-800">
              <input
                type="text"
                placeholder="Buscar produto..."
                className="w-full pl-10 pr-4 py-2 bg-cream-100 border-none rounded-lg focus:ring-2 focus:ring-bakery-400 outline-none transition-shadow text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors text-sm ${
                  selectedCategory === cat
                    ? 'bg-wheat-800 text-cream-50 shadow-sm'
                    : 'bg-white border border-wheat-200 text-wheat-800 hover:bg-wheat-100'
                }`}
              >
                {CATEGORY_FILTER_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-wheat-50 gap-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start pb-20">
          {filteredProducts.map((product) => {
            const price = getEffectivePrice(product);
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-4 rounded-xl shadow-sm border border-wheat-200 hover:shadow-md hover:border-bakery-300 transition-all flex flex-col items-center text-center focus:outline-none focus:ring-2 focus:ring-bakery-500 active:scale-95 h-36"
              >
                <div className="text-[10px] font-bold px-2 py-0.5 rounded pl-1 bg-cream-200 text-bakery-700 mb-2 self-start uppercase tracking-wider">
                  {CATEGORY_LABELS[product.category]}
                </div>
                <h3 className="font-bold text-gray-800 leading-tight mb-2 flex items-center justify-center flex-1 w-full line-clamp-2">
                  {product.name}
                </h3>
                <div className="text-bakery-600 font-extrabold text-lg mt-auto">
                  {centsToReais(price)}
                </div>
              </button>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full pt-10 text-center text-gray-400 font-medium">
              Nenhum produto encontrado.
            </div>
          )}
        </div>
      </div>

      {/* 40% PANEL: CART */}
      <div className="w-[40%] flex flex-col h-full bg-white relative shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">

        {/* Cart Header */}
        <div className="p-4 bg-bakery-600 text-white shadow-sm z-10 sticky top-0 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">Pedido Atual</h2>
            <p className="text-bakery-200 text-xs font-medium">{totalQuantity} itens na bandeja</p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-white outline-none hover:bg-bakery-700 p-2 rounded transition-colors"
              title="Limpar pedido"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 bg-cream-50/50 pb-8 content-start">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-wheat-600 opacity-60">
              <Store size={64} className="mb-4 text-wheat-400" />
              <p className="text-lg font-bold text-center">Nenhum item adicionado.</p>
              <p className="text-sm font-medium mt-1">Clique nos produtos ao lado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => {
                const unitPrice = getEffectivePrice(item.product);
                const rawLine = item.quantity * unitPrice;
                let itemDisc = item.discountType === 'percent'
                  ? Math.round(rawLine * (item.discountValueInCents / 100))
                  : item.discountValueInCents;
                itemDisc = Math.min(itemDisc, rawLine);
                const lineTotal = rawLine - itemDisc;

                return (
                  <div key={item.product.id} className="bg-white p-3 rounded-lg shadow-sm border border-wheat-200 relative group transition-all hover:shadow-md hover:border-bakery-200 flex flex-col">

                    {/* Item Heading Row */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-gray-800 leading-tight">
                        {item.product.name}
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                          {centsToReais(unitPrice)} un.
                        </div>
                      </div>
                      <div className="text-gray-900 font-extrabold text-right">
                        {centsToReais(lineTotal)}
                      </div>
                    </div>

                    {/* Quantity Controls & Discount Trigger */}
                    <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-100">

                      <div className="flex items-center space-x-1">
                        <button
                          className="w-8 h-8 flex items-center justify-center text-bakery-600 bg-cream-50 shadow-sm border border-wheat-200 rounded hover:bg-bakery-50 hover:border-bakery-300 focus:outline-none focus:ring-2 focus:ring-bakery-400 transition-colors"
                          onClick={() => updateQuantity(index, -1)}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 flex justify-center items-center font-bold text-gray-800 text-sm">{item.quantity}</span>
                        <button
                          className="w-8 h-8 flex items-center justify-center text-bakery-600 bg-cream-50 shadow-sm border border-wheat-200 rounded hover:bg-bakery-50 hover:border-bakery-300 focus:outline-none focus:ring-2 focus:ring-bakery-400 transition-colors"
                          onClick={() => updateQuantity(index, 1)}
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <button
                        onClick={() => setActiveDiscountIdx(activeDiscountIdx === index ? null : index)}
                        className={`text-xs font-bold flex items-center px-2 py-1.5 rounded transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-bakery-400 ${
                          item.discountValueInCents > 0 || activeDiscountIdx === index
                            ? 'bg-wheat-800 text-white'
                            : 'bg-wheat-100 text-wheat-900 hover:bg-wheat-200'
                        }`}
                      >
                        <Tag size={12} className="mr-1.5" />
                        {item.discountValueInCents > 0 ? (
                          <span>
                            -{item.discountType === 'percent'
                              ? `${item.discountValueInCents}%`
                              : centsToReais(item.discountValueInCents)}
                          </span>
                        ) : 'Desconto'}
                      </button>
                    </div>

                    {/* Inline Discount Input */}
                    {activeDiscountIdx === index && (
                      <div className="mt-3 bg-wheat-100 p-2.5 rounded-md border border-wheat-300 flex items-center justify-between shadow-inner">
                        <span className="text-xs font-bold text-wheat-900 flex items-center"><Percent size={12} className="mr-1" /> Aplicar Desconto:</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex rounded bg-white border border-wheat-300 overflow-hidden shadow-sm">
                            <button
                              className={`px-2 py-1 text-xs font-bold outline-none ${item.discountType === 'percent' ? 'bg-bakery-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                              onClick={() => updateItemDiscount(index, 'percent', item.discountValueInCents)}
                            >%</button>
                            <div className="w-px bg-wheat-300"></div>
                            <button
                              className={`px-2 py-1 text-xs font-bold outline-none ${item.discountType === 'fixed' ? 'bg-bakery-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                              onClick={() => updateItemDiscount(index, 'fixed', item.discountValueInCents)}
                            >R$</button>
                          </div>
                          {item.discountType === 'percent' ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={item.discountValueInCents || ''}
                              onChange={(e) => updateItemDiscount(index, 'percent', parseInt(e.target.value) || 0)}
                              className="w-16 px-1 py-0.5 h-7 bg-white border border-wheat-300 rounded text-right text-xs font-bold text-gray-800 outline-none focus:border-bakery-400 focus:ring-1 focus:ring-bakery-400"
                              placeholder="0"
                              autoFocus
                            />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="0.50"
                              onChange={(e) => updateItemDiscount(index, 'fixed', reaisToCents(e.target.value))}
                              className="w-16 px-1 py-0.5 h-7 bg-white border border-wheat-300 rounded text-right text-xs font-bold text-gray-800 outline-none focus:border-bakery-400 focus:ring-1 focus:ring-bakery-400"
                              placeholder="0,00"
                              autoFocus
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Totals */}
        <div className="bg-white border-t border-wheat-300 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.03)] p-5 sticky bottom-0 z-10 flex flex-col gap-3">

          <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
            <span className="text-gray-600 text-sm font-bold">Subtotal Parcial</span>
            <span className="font-extrabold text-gray-800 text-sm">{centsToReais(subtotalInCents)}</span>
          </div>

          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col">
              <span
                className="text-gray-800 text-sm font-bold flex items-center gap-1 cursor-pointer select-none"
                onClick={() => setGlobalDiscountType(globalDiscountType === 'percent' ? 'fixed' : 'percent')}
              >
                Desconto Total <Tag size={12} className="text-bakery-500" />
              </span>
              <span className="text-[10px] text-gray-500 font-medium">No Fechamento</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex rounded-md border border-gray-200 overflow-hidden bg-gray-50 shadow-inner">
                <button
                  className={`px-2 py-1 text-xs font-extrabold outline-none focus:ring-1 focus:ring-inset focus:ring-bakery-400 transition-colors ${globalDiscountType === 'percent' ? 'bg-wheat-300 text-wheat-900 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => setGlobalDiscountType('percent')}
                >%</button>
                <div className="w-px bg-gray-200"></div>
                <button
                  className={`px-2 py-1 text-xs font-extrabold outline-none focus:ring-1 focus:ring-inset focus:ring-bakery-400 transition-colors ${globalDiscountType === 'fixed' ? 'bg-wheat-300 text-wheat-900 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => setGlobalDiscountType('fixed')}
                >R$</button>
              </div>
              {globalDiscountType === 'percent' ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={globalDiscountValueInCents || ''}
                  onChange={(e) => setGlobalDiscountValueInCents(parseInt(e.target.value) || 0)}
                  className="w-16 h-8 px-2 border-b-2 border-dashed border-gray-300 bg-transparent text-right text-sm font-extrabold text-gray-800 outline-none focus:border-bakery-500 transition-colors"
                  placeholder="0"
                />
              ) : (
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  onChange={(e) => setGlobalDiscountValueInCents(reaisToCents(e.target.value))}
                  className="w-16 h-8 px-2 border-b-2 border-dashed border-gray-300 bg-transparent text-right text-sm font-extrabold text-gray-800 outline-none focus:border-bakery-500 transition-colors"
                  placeholder="0,00"
                />
              )}
            </div>
          </div>

          {totalDiscountInCents > 0 && (
            <div className="flex justify-between items-center bg-green-50/50 px-3 py-1.5 rounded-lg border border-green-100 text-green-700 font-bold text-xs mt-1">
              <span>Economia / Descontos</span>
              <span>- {centsToReais(totalDiscountInCents)}</span>
            </div>
          )}

          <div className="flex justify-between items-end pt-3 border-t border-gray-200 mt-1 pb-1">
            <span className="text-gray-800 font-black uppercase tracking-widest text-xs">Total</span>
            <span className="text-4xl font-black text-bakery-600 drop-shadow-sm">{centsToReais(finalTotalInCents)}</span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setCheckoutModalOpen(true)}
            className="w-full bg-bakery-500 hover:bg-bakery-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg tracking-wide shadow-lg shadow-bakery-500/30 transition-all flex justify-center items-center active:scale-[0.98] outline-none focus:ring-4 focus:ring-bakery-300/50"
          >
            Avançar Pagamento
          </button>
        </div>
      </div>

      {/* MODAL DE FINALIZAÇÃO */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 relative">

            {checkoutSuccess ? (
              <div className="p-12 flex flex-col items-center justify-center bg-wheat-50 text-center animate-in fade-in duration-300">
                <div className="w-24 h-24 bg-green-100/80 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <CheckCircle size={56} className="text-green-600" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Pedido Realizado!</h2>
                <p className="text-wheat-800 font-bold text-lg">Preparando a comanda...</p>
              </div>
            ) : (
              <>
                <div className="p-6 bg-bakery-50 border-b border-bakery-100 flex flex-col items-center text-center">
                  <h2 className="text-2xl font-black text-bakery-800 mb-1 tracking-tight">Finalização</h2>
                  <p className="text-bakery-600/80 text-sm font-bold">Confirme a modalidade e valor.</p>
                </div>

                <div className="p-6">
                  {/* Order Type Selection */}
                  <div className="flex gap-4 mb-6">
                    <button
                      onClick={() => setOrderType('counter')}
                      className={`flex-1 p-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all outline-none focus:ring-2 focus:ring-bakery-400 focus:ring-offset-2 ${
                        orderType === 'counter'
                          ? 'border-bakery-500 bg-bakery-50 text-bakery-700 shadow-md transform scale-[1.02]'
                          : 'border-wheat-200 bg-white text-gray-500 hover:border-bakery-300 hover:bg-wheat-50 hover:text-gray-700'
                      }`}
                    >
                      <Store size={32} className={orderType === 'counter' ? 'text-bakery-500' : ''} />
                      <span className="font-extrabold tracking-wide uppercase text-sm">Balcão</span>
                    </button>
                    <button
                      onClick={() => {
                        setOrderType('table');
                        setTableNumber('');
                      }}
                      className={`flex-1 p-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all outline-none focus:ring-2 focus:ring-bakery-400 focus:ring-offset-2 ${
                        orderType === 'table'
                          ? 'border-bakery-500 bg-bakery-50 text-bakery-700 shadow-md transform scale-[1.02]'
                          : 'border-wheat-200 bg-white text-gray-500 hover:border-bakery-300 hover:bg-wheat-50 hover:text-gray-700'
                      }`}
                    >
                      <Utensils size={32} className={orderType === 'table' ? 'text-bakery-500' : ''} />
                      <span className="font-extrabold tracking-wide uppercase text-sm">Mesa</span>
                    </button>
                  </div>

                  {/* Table Input */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${orderType === 'table' ? 'max-h-24 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Número da Mesa</label>
                    <input
                      type="number"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Ex: 12"
                      className="w-full text-xl font-bold p-3.5 bg-cream-50/50 border-2 border-wheat-200 rounded-xl outline-none focus:ring-0 focus:border-bakery-500 shadow-inner transition-colors text-center"
                      autoFocus={orderType === 'table'}
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Forma de Pagamento</label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { value: 'cash' as const, label: 'Dinheiro' },
                        { value: 'credit' as const, label: 'Crédito' },
                        { value: 'debit' as const, label: 'Débito' },
                        { value: 'pix' as const, label: 'PIX' },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setPaymentMethod(opt.value)}
                          className={`py-2.5 px-2 rounded-xl border-2 text-xs font-extrabold uppercase tracking-wide transition-all outline-none focus:ring-2 focus:ring-bakery-400 ${
                            paymentMethod === opt.value
                              ? 'border-bakery-500 bg-bakery-50 text-bakery-700 shadow-md'
                              : 'border-wheat-200 bg-white text-gray-500 hover:border-bakery-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-wheat-100/50 p-5 rounded-xl border-2 border-wheat-200 mb-8 flex justify-between items-center shadow-inner pt-4 pb-4">
                    <div>
                      <div className="text-xs font-black text-wheat-800 uppercase tracking-widest">Valor a Cobrar</div>
                      {totalDiscountInCents > 0 && <div className="text-[10px] text-bakery-600 font-bold uppercase mt-1">Inclui desconto no total</div>}
                    </div>
                    <div className="text-3xl font-black text-bakery-600 tracking-tighter">
                      {centsToReais(finalTotalInCents)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCheckoutModalOpen(false)}
                      className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl transition-colors outline-none focus:ring-2 focus:ring-gray-300 active:scale-95"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleConfirmOrder}
                      disabled={(orderType === 'table' && !tableNumber) || submitting}
                      className="flex-[2] py-4 bg-bakery-600 hover:bg-bakery-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none relative overflow-hidden text-white font-black uppercase tracking-wide rounded-xl shadow-[0_4px_14px_0_rgba(234,88,12,0.39)] hover:shadow-[0_6px_20px_rgba(234,88,12,0.23)] transition-all flex justify-center items-center outline-none focus:ring-4 focus:ring-bakery-400/50 active:scale-[0.98]"
                    >
                      {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
