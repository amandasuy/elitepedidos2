import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { RestaurantTable, TableSale, TableSaleItem, TableCartItem } from '../../types/table-sales';
import { 
  Users, 
  Plus, 
  Minus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  DollarSign, 
  Clock, 
  User, 
  Package,
  AlertCircle,
  RefreshCw,
  Calculator,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface TableSalesPanelProps {
  storeId: 1 | 2;
  operatorName?: string;
}

const TableSalesPanel: React.FC<TableSalesPanelProps> = ({ storeId, operatorName = 'Operador' }) => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [currentSale, setCurrentSale] = useState<TableSale | null>(null);
  const [cartItems, setCartItems] = useState<TableCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    payment_type: 'dinheiro' as 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'voucher' | 'misto',
    change_amount: 0,
    customer_name: '',
    customer_count: 1,
    discount_amount: 0,
    notes: ''
  });

  // Product form state
  const [productForm, setProductForm] = useState({
    product_code: '',
    product_name: '',
    quantity: 1,
    weight_kg: 0,
    unit_price: 0,
    price_per_gram: 0,
    is_weighable: false,
    notes: ''
  });

  const tableName = storeId === 1 ? 'store1_tables' : 'store2_tables';
  const salesTableName = storeId === 1 ? 'store1_table_sales' : 'store2_table_sales';
  const itemsTableName = storeId === 1 ? 'store1_table_sale_items' : 'store2_table_sale_items';

  // Check Supabase configuration
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const isConfigured = supabaseUrl && supabaseKey && 
                        supabaseUrl !== 'your_supabase_url_here' && 
                        supabaseKey !== 'your_supabase_anon_key_here' &&
                        !supabaseUrl.includes('placeholder');
    
    setSupabaseConfigured(isConfigured);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre': return 'bg-green-100 text-green-800';
      case 'ocupada': return 'bg-red-100 text-red-800';
      case 'aguardando_conta': return 'bg-yellow-100 text-yellow-800';
      case 'limpeza': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'livre': return 'Livre';
      case 'ocupada': return 'Ocupada';
      case 'aguardando_conta': return 'Aguardando Conta';
      case 'limpeza': return 'Limpeza';
      default: return status;
    }
  };

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseConfigured) {
        console.warn(`⚠️ Supabase não configurado - usando dados de demonstração para Loja ${storeId}`);
        
        // Mock data for demonstration
        const mockTables: RestaurantTable[] = [
          {
            id: '1',
            number: 1,
            name: `Mesa 1 - Loja ${storeId}`,
            capacity: 4,
            status: 'livre',
            location: 'Área interna',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            number: 2,
            name: `Mesa 2 - Loja ${storeId}`,
            capacity: 2,
            status: 'livre',
            location: 'Área externa',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        
        setTables(mockTables);
        setLoading(false);
        return;
      }

      console.log(`🔄 Carregando mesas da Loja ${storeId}...`);

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          current_sale:${salesTableName}(*)
        `)
        .eq('is_active', true)
        .order('number');

      if (error) throw error;

      setTables(data || []);
      console.log(`✅ ${data?.length || 0} mesas carregadas da Loja ${storeId}`);
    } catch (err) {
      console.error(`❌ Erro ao carregar mesas da Loja ${storeId}:`, err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mesas');
    } finally {
      setLoading(false);
    }
  }, [tableName, salesTableName, storeId, supabaseConfigured]);

  const openTable = async (table: RestaurantTable) => {
    try {
      if (!supabaseConfigured) {
        alert('Funcionalidade não disponível - Supabase não configurado');
        return;
      }

      console.log(`🍽️ Abrindo mesa ${table.number} da Loja ${storeId}...`);

      // Create new sale
      const { data: newSale, error: saleError } = await supabase
        .from(salesTableName)
        .insert([{
          table_id: table.id,
          operator_name: operatorName,
          customer_count: 1,
          subtotal: 0,
          discount_amount: 0,
          total_amount: 0,
          status: 'aberta',
          opened_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Update table status
      const { error: tableError } = await supabase
        .from(tableName)
        .update({
          status: 'ocupada',
          current_sale_id: newSale.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', table.id);

      if (tableError) throw tableError;

      setCurrentSale(newSale);
      setSelectedTable({ ...table, status: 'ocupada', current_sale_id: newSale.id });
      setCartItems([]);
      
      console.log(`✅ Mesa ${table.number} aberta com sucesso`);
      await fetchTables();
    } catch (err) {
      console.error(`❌ Erro ao abrir mesa da Loja ${storeId}:`, err);
      alert(`Erro ao abrir mesa: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const addProductToCart = () => {
    if (!productForm.product_name.trim() || !productForm.product_code.trim()) {
      alert('Nome e código do produto são obrigatórios');
      return;
    }

    if (productForm.quantity <= 0) {
      alert('Quantidade deve ser maior que zero');
      return;
    }

    let subtotal = 0;
    if (productForm.is_weighable) {
      if (productForm.weight_kg <= 0 || productForm.price_per_gram <= 0) {
        alert('Para produtos pesáveis, peso e preço por grama são obrigatórios');
        return;
      }
      subtotal = productForm.weight_kg * 1000 * productForm.price_per_gram; // peso em kg * 1000 * preço por grama
    } else {
      if (productForm.unit_price <= 0) {
        alert('Preço unitário deve ser maior que zero');
        return;
      }
      subtotal = productForm.quantity * productForm.unit_price;
    }

    const newItem: TableCartItem = {
      product_code: productForm.product_code,
      product_name: productForm.product_name,
      quantity: productForm.quantity,
      weight: productForm.is_weighable ? productForm.weight_kg : undefined,
      unit_price: productForm.is_weighable ? undefined : productForm.unit_price,
      price_per_gram: productForm.is_weighable ? productForm.price_per_gram : undefined,
      subtotal,
      notes: productForm.notes || undefined
    };

    setCartItems(prev => [...prev, newItem]);
    
    // Reset form
    setProductForm({
      product_code: '',
      product_name: '',
      quantity: 1,
      weight_kg: 0,
      unit_price: 0,
      price_per_gram: 0,
      is_weighable: false,
      notes: ''
    });
    
    setShowAddProduct(false);
  };

  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateCartItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    setCartItems(prev => prev.map((item, i) => {
      if (i === index) {
        let newSubtotal = 0;
        if (item.price_per_gram && item.weight) {
          newSubtotal = item.weight * 1000 * item.price_per_gram;
        } else if (item.unit_price) {
          newSubtotal = quantity * item.unit_price;
        }

        return {
          ...item,
          quantity,
          subtotal: newSubtotal
        };
      }
      return item;
    }));
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const finalizeSale = async () => {
    try {
      if (!currentSale || !selectedTable) {
        throw new Error('Nenhuma venda ativa encontrada');
      }

      if (cartItems.length === 0) {
        alert('Adicione pelo menos um item à venda');
        return;
      }

      if (!supabaseConfigured) {
        alert('Funcionalidade não disponível - Supabase não configurado');
        return;
      }

      console.log(`💰 Finalizando venda da mesa ${selectedTable.number} - Loja ${storeId}...`);

      const subtotal = getCartTotal();
      const total = subtotal - paymentData.discount_amount;

      // Update sale
      const { data: updatedSale, error: saleError } = await supabase
        .from(salesTableName)
        .update({
          customer_name: paymentData.customer_name || undefined,
          customer_count: paymentData.customer_count,
          subtotal,
          discount_amount: paymentData.discount_amount,
          total_amount: total,
          payment_type: paymentData.payment_type,
          change_amount: paymentData.change_amount,
          status: 'fechada',
          notes: paymentData.notes || undefined,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSale.id)
        .select()
        .single();

      if (saleError) throw saleError;

      // Add sale items
      const saleItems = cartItems.map(item => ({
        sale_id: currentSale.id,
        product_code: item.product_code,
        product_name: item.product_name,
        quantity: item.quantity,
        weight_kg: item.weight || undefined,
        unit_price: item.unit_price || undefined,
        price_per_gram: item.price_per_gram || undefined,
        discount_amount: 0,
        subtotal: item.subtotal,
        notes: item.notes || undefined
      }));

      const { error: itemsError } = await supabase
        .from(itemsTableName)
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Get current cash register for the store
      const cashRegisterTable = storeId === 1 ? 'pdv_cash_registers' : 'pdv2_cash_registers';
      const cashEntriesTable = storeId === 1 ? 'pdv_cash_entries' : 'pdv2_cash_entries';

      const { data: openRegister, error: registerError } = await supabase
        .from(cashRegisterTable)
        .select('id')
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (registerError) {
        console.warn(`⚠️ Erro ao buscar caixa aberto da Loja ${storeId}:`, registerError);
      }

      // Add cash entry if there's an open register and payment is cash
      if (openRegister && (paymentData.payment_type === 'dinheiro' || paymentData.payment_type === 'misto')) {
        try {
          const { error: cashError } = await supabase
            .from(cashEntriesTable)
            .insert([{
              register_id: openRegister.id,
              type: 'income', // Usar 'income' para entradas de caixa
              amount: total,
              description: `Venda Mesa #${selectedTable.number} - Loja ${storeId}`,
              payment_method: paymentData.payment_type
            }]);

          if (cashError) {
            console.warn(`⚠️ Erro ao registrar no caixa da Loja ${storeId} (não crítico):`, cashError);
          } else {
            console.log(`✅ Venda registrada no caixa da Loja ${storeId}`);
          }
        } catch (cashErr) {
          console.warn(`⚠️ Erro ao registrar no caixa da Loja ${storeId}:`, cashErr);
        }
      }

      // Update table status
      const { error: tableError } = await supabase
        .from(tableName)
        .update({
          status: 'limpeza',
          current_sale_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTable.id);

      if (tableError) throw tableError;

      // Reset state
      setSelectedTable(null);
      setCurrentSale(null);
      setCartItems([]);
      setShowPayment(false);
      setPaymentData({
        payment_type: 'dinheiro',
        change_amount: 0,
        customer_name: '',
        customer_count: 1,
        discount_amount: 0,
        notes: ''
      });

      console.log(`✅ Venda da mesa ${selectedTable.number} finalizada com sucesso`);
      
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
      successMessage.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Venda da Mesa ${selectedTable.number} finalizada com sucesso!
      `;
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);

      await fetchTables();
    } catch (err) {
      console.error(`❌ Erro ao finalizar venda da Loja ${storeId}:`, err);
      alert(`Erro ao finalizar venda: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const closeTable = async (table: RestaurantTable) => {
    try {
      if (!supabaseConfigured) {
        alert('Funcionalidade não disponível - Supabase não configurado');
        return;
      }

      console.log(`🧹 Liberando mesa ${table.number} da Loja ${storeId}...`);

      const { error } = await supabase
        .from(tableName)
        .update({
          status: 'livre',
          current_sale_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', table.id);

      if (error) throw error;

      console.log(`✅ Mesa ${table.number} liberada`);
      await fetchTables();
    } catch (err) {
      console.error(`❌ Erro ao liberar mesa da Loja ${storeId}:`, err);
      alert(`Erro ao liberar mesa: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const handleFinalizeSale = async () => {
    await finalizeSale();
  };

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Carregando mesas da Loja {storeId}...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-indigo-600" />
            Vendas de Mesas - Loja {storeId}
          </h2>
          <p className="text-gray-600">Gerencie vendas presenciais por mesa</p>
        </div>
        <button
          onClick={fetchTables}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      {/* Supabase Configuration Warning */}
      {!supabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 rounded-full p-2">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
            <div>
              <h3 className="font-medium text-yellow-800">Modo Demonstração</h3>
              <p className="text-yellow-700 text-sm">
                Supabase não configurado. Funcionalidades limitadas para Loja {storeId}.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-4 transition-all hover:shadow-md ${
              selectedTable?.id === table.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Mesa {table.number}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(table.status)}`}>
                {getStatusLabel(table.status)}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <Users size={14} />
                <span>Capacidade: {table.capacity} pessoas</span>
              </div>
              {table.location && (
                <div className="flex items-center gap-2">
                  <Package size={14} />
                  <span>{table.location}</span>
                </div>
              )}
              {table.current_sale && (
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>Aberta: {new Date(table.current_sale.opened_at).toLocaleTimeString('pt-BR')}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {table.status === 'livre' && (
                <button
                  onClick={() => openTable(table)}
                  disabled={!supabaseConfigured}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Abrir Mesa
                </button>
              )}

              {table.status === 'ocupada' && (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setSelectedTable(table);
                      setCurrentSale(table.current_sale || null);
                    }}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    Gerenciar Venda
                  </button>
                  <button
                    onClick={() => closeTable(table)}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white py-1.5 rounded-lg text-sm transition-colors"
                  >
                    Liberar Mesa
                  </button>
                </div>
              )}

              {(table.status === 'aguardando_conta' || table.status === 'limpeza') && (
                <button
                  onClick={() => closeTable(table)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Liberar Mesa
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            Nenhuma mesa encontrada
          </h3>
          <p className="text-gray-500">
            Configure as mesas da Loja {storeId} no banco de dados para começar a usar este módulo.
          </p>
        </div>
      )}

      {/* Sale Management Modal */}
      {selectedTable && currentSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  Mesa {selectedTable.number} - Loja {storeId}
                </h2>
                <button
                  onClick={() => {
                    setSelectedTable(null);
                    setCurrentSale(null);
                    setCartItems([]);
                    setShowAddProduct(false);
                    setShowPayment(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Itens da Venda</h3>
                    <button
                      onClick={() => setShowAddProduct(true)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Adicionar
                    </button>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {cartItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Package size={32} className="mx-auto text-gray-300 mb-2" />
                        <p>Nenhum item adicionado</p>
                      </div>
                    ) : (
                      cartItems.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-800">{item.product_name}</h4>
                              <p className="text-sm text-gray-600">Código: {item.product_code}</p>
                              {item.weight && (
                                <p className="text-sm text-gray-600">Peso: {item.weight}kg</p>
                              )}
                              {item.notes && (
                                <p className="text-sm text-gray-500 italic">Obs: {item.notes}</p>
                              )}
                            </div>
                            <button
                              onClick={() => removeFromCart(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                                className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="font-medium w-8 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                                className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <div className="font-bold text-green-600">
                              {formatPrice(item.subtotal)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Total */}
                  {cartItems.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-800">Total:</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatPrice(getCartTotal())}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações da Venda</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Cliente (opcional)
                      </label>
                      <input
                        type="text"
                        value={paymentData.customer_name}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, customer_name: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Nome do cliente"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Pessoas
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={paymentData.customer_count}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, customer_count: parseInt(e.target.value) || 1 }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Desconto (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentData.discount_amount}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Forma de Pagamento
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="payment"
                            value="dinheiro"
                            checked={paymentData.payment_type === 'dinheiro'}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, payment_type: e.target.value as any }))}
                            className="text-indigo-600"
                          />
                          <Banknote size={16} className="text-green-600" />
                          <span>Dinheiro</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="payment"
                            value="pix"
                            checked={paymentData.payment_type === 'pix'}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, payment_type: e.target.value as any }))}
                            className="text-indigo-600"
                          />
                          <QrCode size={16} className="text-blue-600" />
                          <span>PIX</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="payment"
                            value="cartao_credito"
                            checked={paymentData.payment_type === 'cartao_credito'}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, payment_type: e.target.value as any }))}
                            className="text-indigo-600"
                          />
                          <CreditCard size={16} className="text-purple-600" />
                          <span>Cartão de Crédito</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="payment"
                            value="cartao_debito"
                            checked={paymentData.payment_type === 'cartao_debito'}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, payment_type: e.target.value as any }))}
                            className="text-indigo-600"
                          />
                          <CreditCard size={16} className="text-orange-600" />
                          <span>Cartão de Débito</span>
                        </label>
                      </div>
                    </div>

                    {paymentData.payment_type === 'dinheiro' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Troco para (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentData.change_amount}
                          onChange={(e) => setPaymentData(prev => ({ ...prev, change_amount: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Valor para troco"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observações
                      </label>
                      <textarea
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        rows={3}
                        placeholder="Observações da venda..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total da Venda:</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(getCartTotal() - paymentData.discount_amount)}
                  </p>
                </div>
                <button
                  onClick={handleFinalizeSale}
                  disabled={cartItems.length === 0 || !supabaseConfigured}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={20} />
                  Finalizar Venda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Adicionar Produto</h2>
                <button
                  onClick={() => setShowAddProduct(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código do Produto *
                </label>
                <input
                  type="text"
                  value={productForm.product_code}
                  onChange={(e) => setProductForm(prev => ({ ...prev, product_code: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: ACAI500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={productForm.product_name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, product_name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Açaí 500ml"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={productForm.is_weighable}
                    onChange={(e) => setProductForm(prev => ({ 
                      ...prev, 
                      is_weighable: e.target.checked,
                      unit_price: e.target.checked ? 0 : prev.unit_price,
                      price_per_gram: e.target.checked ? prev.price_per_gram : 0,
                      weight_kg: e.target.checked ? prev.weight_kg : 0
                    }))}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Produto pesável
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  value={productForm.quantity}
                  onChange={(e) => setProductForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {productForm.is_weighable ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Peso (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={productForm.weight_kg}
                      onChange={(e) => setProductForm(prev => ({ ...prev, weight_kg: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço por grama (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={productForm.price_per_gram}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price_per_gram: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.045"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço Unitário (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.unit_price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="15.90"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={productForm.notes}
                  onChange={(e) => setProductForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={2}
                  placeholder="Observações do produto..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddProduct(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addProductToCart}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableSalesPanel;