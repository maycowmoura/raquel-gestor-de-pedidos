
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Product, Order, OrderItem, Tab, Toast as ToastType, ToastType as TType } from './types';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, CalendarIcon, ShareIcon, ImportIcon } from './components/Icons';
import Modal from './components/Modal';
import Toast from './components/Toast';

const STORAGE_KEYS = {
  PRODUCTS: 'ordersflow_products',
  ORDERS: 'ordersflow_orders'
};

const App: React.FC = () => {
  // Initialize state from localStorage
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<Tab>(Tab.Orders);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [importText, setImportText] = useState('');

  // Filters state
  const [productFilter, setProductFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  // Toast Helpers
  const addToast = useCallback((message: string, type: TType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Filtered Data
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesDate = !dateFilter || order.deliveryDate === dateFilter;
      const matchesProduct = !productFilter || order.items.some(item => {
        const prod = products.find(p => p.id === item.productId);
        return prod?.name.toLowerCase().includes(productFilter.toLowerCase());
      });
      return matchesDate && matchesProduct;
    }).sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());
  }, [orders, dateFilter, productFilter, products]);

  const productTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          totals[prod.name] = (totals[prod.name] || 0) + item.quantity;
        }
      });
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [filteredOrders, products]);

  // Product CRUD
  const saveProduct = (name: string) => {
    if (!name.trim()) {
      addToast('O nome do produto é obrigatório', 'error');
      return;
    }

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, name } : p));
      addToast('Produto atualizado com sucesso!');
    } else {
      const newProduct: Product = { id: Date.now().toString(), name };
      setProducts(prev => [...prev, newProduct]);
      addToast('Produto adicionado com sucesso!');
    }
    closeProductModal();
  };

  const deleteProduct = (id: string) => {
    const isUsedInOrders = orders.some(o => o.items.some(i => i.productId === id));
    if (isUsedInOrders) {
      addToast('Não é possível excluir um produto usado em pedidos ativos', 'error');
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
    addToast('Produto removido com sucesso!');
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // Order CRUD
  const saveOrder = (orderData: Omit<Order, 'id'>) => {
    if (!orderData.customerName.trim()) {
      addToast('O nome do cliente é obrigatório', 'error');
      return;
    }
    if (orderData.items.length === 0) {
      addToast('Adicione pelo menos um produto ao pedido', 'error');
      return;
    }
    if (!orderData.deliveryDate) {
      addToast('Selecione a data de entrega', 'error');
      return;
    }

    if (editingOrder) {
      setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...orderData, id: editingOrder.id } : o));
      addToast('Pedido atualizado com sucesso!');
    } else {
      const newOrder: Order = { ...orderData, id: Date.now().toString() };
      setOrders(prev => [...prev, newOrder]);
      addToast('Pedido criado com sucesso!');
    }
    closeOrderModal();
  };

  const deleteOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    addToast('Pedido removido com sucesso!');
  };

  const closeOrderModal = () => {
    setIsOrderModalOpen(false);
    setEditingOrder(null);
  };

  // Export/Import
  const handleExportWhatsApp = () => {
    const data = { products, orders };
    const json = JSON.stringify(data);
    const text = `Backup OrdersFlow:\n\n${json}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleImportData = () => {
    try {
      const data = JSON.parse(importText);
      if (data.products && Array.isArray(data.products) && data.orders && Array.isArray(data.orders)) {
        setProducts(data.products);
        setOrders(data.orders);
        addToast('Dados importados com sucesso!');
        setIsBackupModalOpen(false);
        setImportText('');
      } else {
        throw new Error('Formato inválido');
      }
    } catch (e) {
      addToast('Falha ao importar: JSON inválido ou mal formatado', 'error');
    }
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      <Toast toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40 px-4 py-4 md:px-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">OrdersFlow</h1>
            <button 
              onClick={() => setIsBackupModalOpen(true)}
              className="ml-4 p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Backup / Sincronizar"
            >
              <ShareIcon />
            </button>
          </div>
          
          <nav className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab(Tab.Orders)}
              className={`flex-1 px-6 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === Tab.Orders ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setActiveTab(Tab.Products)}
              className={`flex-1 px-6 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === Tab.Products ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Produtos
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        {activeTab === Tab.Products ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Catálogo de Produtos</h2>
              <button 
                onClick={() => setIsProductModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <PlusIcon /> Adicionar
              </button>
            </div>

            {products.length === 0 ? (
              <EmptyState message="Nenhum produto cadastrado ainda." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(product => (
                  <div key={product.id} className="bg-white border rounded-xl p-5 flex justify-between items-center group hover:border-indigo-200 hover:shadow-md transition-all">
                    <span className="font-semibold text-gray-700 text-lg">{product.name}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <EditIcon />
                      </button>
                      <button 
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h2 className="text-xl font-bold text-gray-800">Gerenciamento de Pedidos</h2>
              <button 
                onClick={() => setIsOrderModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <PlusIcon /> Novo Pedido
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white border rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Filtrar por produto..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                    <CalendarIcon />
                  </div>
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Totals Summary */}
              {productTotals.length > 0 && (
                <div className="pt-4 border-t">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Totais dos Filtros</h3>
                  <div className="flex flex-wrap gap-2">
                    {productTotals.map(([name, total]) => (
                      <div key={name} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
                        {name} <span className="bg-indigo-200 px-1.5 py-0.5 rounded-md text-xs">{total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {filteredOrders.length === 0 ? (
              <EmptyState message={orders.length === 0 ? "Nenhum pedido realizado." : "Nenhum pedido encontrado nos filtros."} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredOrders.map(order => (
                  <div key={order.id} className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col hover:border-indigo-200 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{order.customerName}</h3>
                        <p className="text-sm text-indigo-600 font-medium flex items-center gap-1.5 mt-1">
                          <CalendarIcon /> {new Date(order.deliveryDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => { setEditingOrder(order); setIsOrderModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <EditIcon />
                        </button>
                        <button 
                          onClick={() => deleteOrder(order.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Produtos</h4>
                      <ul className="space-y-2">
                        {order.items.map((item, idx) => {
                          const prod = products.find(p => p.id === item.productId);
                          return (
                            <li key={idx} className="flex justify-between items-center text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                              <span>{prod?.name || 'Produto Removido'}</span>
                              <span className="bg-white px-2 py-0.5 rounded border shadow-sm">{item.quantity}x</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {order.observations && (
                      <div className="mt-4 pt-4 border-t text-sm text-gray-500 italic">
                        {order.observations}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Backup Modal */}
      <Modal isOpen={isBackupModalOpen} onClose={() => setIsBackupModalOpen(false)} title="Exportar / Importar Dados">
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900">Exportar para WhatsApp</h4>
            <p className="text-xs text-gray-500">Gere um backup completo dos seus produtos e pedidos e envie para seu próprio WhatsApp.</p>
            <button 
              onClick={handleExportWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-semibold transition-colors shadow-sm"
            >
              <ShareIcon /> Exportar via WhatsApp
            </button>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-bold text-gray-900">Importar Backup</h4>
            <p className="text-xs text-gray-500">Cole o código de backup (JSON) abaixo para restaurar seus dados.</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='Cole o JSON aqui...'
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] text-xs font-mono"
            />
            <button 
              onClick={handleImportData}
              disabled={!importText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl font-semibold transition-colors shadow-sm"
            >
              <ImportIcon /> Importar Dados
            </button>
          </div>
        </div>
      </Modal>

      {/* Product Modal */}
      <Modal isOpen={isProductModalOpen} onClose={closeProductModal} title={editingProduct ? 'Editar Produto' : 'Novo Produto'}>
        <ProductForm 
          initialValue={editingProduct?.name || ''} 
          onSave={saveProduct} 
          onCancel={closeProductModal} 
        />
      </Modal>

      {/* Order Modal */}
      <Modal isOpen={isOrderModalOpen} onClose={closeOrderModal} title={editingOrder ? 'Editar Pedido' : 'Novo Pedido'}>
        <OrderForm 
          products={products}
          initialData={editingOrder || undefined}
          onSave={saveOrder}
          onCancel={closeOrderModal}
        />
      </Modal>
    </div>
  );
};

// Sub-components

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-white border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center">
    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
      <SearchIcon />
    </div>
    <p className="text-gray-500 font-medium">{message}</p>
  </div>
);

interface ProductFormProps {
  initialValue: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ initialValue, onSave, onCancel }) => {
  const [name, setName] = useState(initialValue);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Nome do Produto</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Panetone Tradicional"
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors">Cancelar</button>
        <button onClick={() => onSave(name)} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors">Salvar</button>
      </div>
    </div>
  );
};

interface OrderFormProps {
  products: Product[];
  initialData?: Order;
  onSave: (data: Omit<Order, 'id'>) => void;
  onCancel: () => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ products, initialData, onSave, onCancel }) => {
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [deliveryDate, setDeliveryDate] = useState(initialData?.deliveryDate || '');
  const [observations, setObservations] = useState(initialData?.observations || '');
  const [items, setItems] = useState<OrderItem[]>(initialData?.items || []);
  
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);

  const addItem = () => {
    if (!selectedProduct) return;
    const existing = items.find(i => i.productId === selectedProduct);
    if (existing) {
      setItems(prev => prev.map(i => i.productId === selectedProduct ? { ...i, quantity: i.quantity + quantity } : i));
    } else {
      setItems(prev => [...prev, { productId: selectedProduct, quantity }]);
    }
    setSelectedProduct('');
    setQuantity(1);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.productId !== id));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Cliente</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Nome completo"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Data de Entrega</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Product Picker */}
        <div className="space-y-2 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
          <label className="text-sm font-bold text-indigo-900">Adicionar Produtos</label>
          <div className="flex gap-2">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg outline-none"
            >
              <option value="">Selecione...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-20 px-3 py-2 bg-white border border-indigo-200 rounded-lg outline-none"
            />
            <button 
              onClick={addItem}
              className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon />
            </button>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="mt-4 space-y-2">
              {items.map(item => {
                const prod = products.find(p => p.id === item.productId);
                return (
                  <div key={item.productId} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg shadow-sm text-sm">
                    <span className="font-medium text-gray-700">{prod?.name} ({item.quantity}x)</span>
                    <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600 p-1">
                      <TrashIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Observações</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
            placeholder="Informações adicionais..."
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors">Cancelar</button>
        <button 
          onClick={() => onSave({ customerName, deliveryDate, items, observations })} 
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
        >
          Salvar Pedido
        </button>
      </div>
    </div>
  );
};

export default App;
