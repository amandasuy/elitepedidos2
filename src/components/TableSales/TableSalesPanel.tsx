import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Plus, 
  DollarSign, 
  Clock, 
  User, 
  Package, 
  CreditCard,
  Save,
  X,
  Minus,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Printer,
  Calculator
} from 'lucide-react';

interface RestaurantTable {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: 'livre' | 'ocupada' | 'aguardando_conta' | 'limpeza';
  location?: string;
  is_active: boolean;
  current_sale_id?: string;
  current_sale?: TableSale;
  created_at: string;
  updated_at: string;
}

interface TableSale {
  id: string;
  table_id: string;
  sale_number: number;
  operator_name?: string;
  customer_name?: string;
  customer_count: number;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_type?: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'voucher' | 'misto';
  change_amount: number;
  status: 'aberta' | 'fechada' | 'cancelada';
  notes?: string;
  opened_at: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  items?: TableSaleItem[];
}

interface TableSaleItem {
  id: string;
  sale_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  weight_kg?: number;
  unit_price?: number;
  price_per_gram?: number;
  discount_amount: number;
  subtotal: number;
  notes?: string;
  created_at: string;
}

interface TableCartItem {
  product_code: string;
  product_name: string;
  quantity: number;
  weight?: number;
  unit_price?: number;
  price_per_gram?: number;
  subtotal: number;
  notes?: string;
}

interface TableSalesPanelProps {
  storeId: number;
  operatorName?: string;
}

const TableSalesPanel: React.FC<TableSalesPanelProps> = ({ storeId, operatorName }) => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [cartItems, setCartItems] = useState<TableCartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerCount, setCustomerCount] = useState(1);
  const [paymentType, setPaymentType] = useState<'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'voucher' | 'misto'>('dinheiro');
  const [changeAmount, setChangeAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

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

  const getTableName = () => {
    return storeId === 1 ? 'store1_tables' : 'store2_tables';
  };

  const getSalesTableName = () => {
    return storeId === 1 ? 'store1_table_sales' : 'store2_table_sales';
  };

  const getItemsTableName = () => {
    return storeId === 1 ? 'store1_table_sale_items' : 'store2_table_sale_items';
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseConfigured) {
        console.warn('⚠️ Supabase não configurado - usando dados de demonstração');
        
        // Dados de demonstração
        const demoTables: RestaurantTable[] = [
          {
            id: 'demo-1',
            number: 1,
            name: 'Mesa 1',
            capacity: 4,
            status: 'livre',
            location: 'Área interna',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'demo-2',
            number: 2,
            name: 'Mesa 2',
            capacity: 2,
            status: 'livre',
            location: 'Área externa',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        
        setTables(demoTables);
        setLoading(false);
        return;
      }

      console.log(`🔄 Carregando mesas da ${getTableName()}...`);
      
      const { data, error } = await supabase
        .from(getTableName())
        .select(`
          *,
          current_sale:${getSalesTableName()}!${getTableName()}_current_sale_id_fkey(*)
        `)
        .eq('is_active', true)
        .order('number');

      if (error) {
        console.error(`❌ Erro ao carregar mesas:`, error);
        throw error;
      }

      setTables(data || []);
      console.log(`✅ ${data?.length || 0} mesas carregadas da Loja ${storeId}`);
    } catch (err) {
      console.error(`❌ Erro ao carregar mesas da Loja ${storeId}:`, err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mesas');
    } finally {
      setLoading(false);
    }
  };

  const openTable = async (table: RestaurantTable) => {
    try {
      setSaving(true);
      
      if (!supabaseConfigured) {
        // Simulação para modo demo
        setSelectedTable({
          ...table,
          status: 'ocupada',
          current_sale: {
            id: 'demo-sale',
            table_id: table.id,
            sale_number: 1001,
            operator_name: operatorName,
            customer_name: '',
            customer_count: 1,
            subtotal: 0,
            discount_amount: 0,
            total_amount: 0,
            status: 'aberta',
            change_amount: 0,
            opened_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
        setShowSaleModal(true);
        setSaving(false);
        return;
      }

      console.log(`🔓 Abrindo mesa ${table.number}...`);
      
      // Criar nova venda para a mesa
      const { data: newSale, error: saleError } = await supabase
        .from(getSalesTableName())
        .insert([{
          table_id: table.id,
          operator_name: operatorName,
          customer_count: 1,
          subtotal: 0,
          discount_amount: 0,
          total_amount: 0,
          status: 'aberta',
          change_amount: 0,
          opened_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (saleError) {
        console.error('❌ Erro ao criar venda:', saleError);
        throw saleError;
      }

      // Atualizar status da mesa
      const { error: tableError } = await supabase
        .from(getTableName())
        .update({
          status: 'ocupada',
          current_sale_id: newSale.id
        })
        .eq('id', table.id);

      if (tableError) {
        console.error('❌ Erro ao atualizar mesa:', tableError);
        throw tableError;
      }

      setSelectedTable({
        ...table,
        status: 'ocupada',
        current_sale_id: newSale.id,
        current_sale: newSale
      });
      
      setShowSaleModal(true);
      console.log('✅ Mesa aberta com sucesso');
      
      await fetchTables();
    } catch (err) {
      console.error('❌ Erro ao abrir mesa:', err);
      alert('Erro ao abrir mesa. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const addItemToCart = () => {
    const newItem: TableCartItem = {
      product_code: `PROD${Date.now()}`,
      product_name: 'Açaí 500ml',
      quantity: 1,
      unit_price: 25.90,
      subtotal: 25.90,
      notes: ''
    };
    
    setCartItems(prev => [...prev, newItem]);
  };

  const removeItemFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromCart(index);
      return;
    }

    setCartItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newSubtotal = (item.unit_price || 0) * quantity;
        return { ...item, quantity, subtotal: newSubtotal };
      }
      return item;
    }));
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const finalizeSale = async () => {
    if (!selectedTable?.current_sale || cartItems.length === 0) return;

    try {
      setSaving(true);
      console.log('💰 Finalizando venda da mesa...');

      if (!supabaseConfigured) {
        // Simulação para modo demo
        alert('Venda finalizada com sucesso (modo demonstração)');
        setShowSaleModal(false);
        setSelectedTable(null);
        setCartItems([]);
        setSaving(false);
        return;
      }

      const total = getCartTotal();
      
      // 1. Atualizar a venda
      const { error: saleUpdateError } = await supabase
        .from(getSalesTableName())
        .update({
          customer_name: customerName,
          customer_count: customerCount,
          subtotal: total,
          total_amount: total,
          payment_type: paymentType,
          change_amount: changeAmount,
          notes: notes,
          status: 'fechada',
          closed_at: new Date().toISOString()
        })
        .eq('id', selectedTable.current_sale.id);

      if (saleUpdateError) {
        console.error('❌ Erro ao atualizar venda:', saleUpdateError);
        throw saleUpdateError;
      }

      // 2. Inserir itens da venda
      const saleItems = cartItems.map(item => ({
        sale_id: selectedTable.current_sale!.id,
        product_code: item.product_code,
        product_name: item.product_name,
        quantity: item.quantity,
        weight_kg: item.weight,
        unit_price: item.unit_price,
        price_per_gram: item.price_per_gram,
        discount_amount: 0,
        subtotal: item.subtotal,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from(getItemsTableName())
        .insert(saleItems);

      if (itemsError) {
        console.error('❌ Erro ao inserir itens:', itemsError);
        throw itemsError;
      }

      // 3. Buscar caixa aberto para registrar a entrada
      const cashRegisterTable = storeId === 1 ? 'pdv_cash_registers' : 'pdv2_cash_registers';
      const cashEntriesTable = storeId === 1 ? 'pdv_cash_entries' : 'pdv2_cash_entries';
      
      const { data: openRegister, error: registerError } = await supabase
        .from(cashRegisterTable)
        .select('*')
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (registerError) {
        console.error('❌ Erro ao buscar caixa:', registerError);
        throw registerError;
      }

      // 4. Registrar entrada no caixa (CORREÇÃO: definir type explicitamente)
      if (openRegister) {
        const { error: cashEntryError } = await supabase
          .from(cashEntriesTable)
          .insert([{
            register_id: openRegister.id,
            type: 'income', // ✅ CORREÇÃO: Definir explicitamente como 'income'
            amount: total,
            description: `Venda Mesa #${selectedTable.number} - Venda #${selectedTable.current_sale.sale_number}`,
            payment_method: paymentType
          }]);

        if (cashEntryError) {
          console.error('❌ Erro ao registrar entrada no caixa:', cashEntryError);
          throw cashEntryError;
        }
        
        console.log('✅ Entrada registrada no caixa');
      } else {
        console.warn('⚠️ Nenhum caixa aberto encontrado - venda finalizada sem registro no caixa');
      }

      // 5. Atualizar status da mesa
      const { error: tableUpdateError } = await supabase
        .from(getTableName())
        .update({
          status: 'aguardando_conta',
          current_sale_id: null
        })
        .eq('id', selectedTable.id);

      if (tableUpdateError) {
        console.error('❌ Erro ao atualizar mesa:', tableUpdateError);
        throw tableUpdateError;
      }

      console.log('✅ Venda finalizada com sucesso');
      
      // Limpar estado
      setShowSaleModal(false);
      setSelectedTable(null);
      setCartItems([]);
      setCustomerName('');
      setCustomerCount(1);
      setPaymentType('dinheiro');
      setChangeAmount(0);
      setNotes('');
      
      // Recarregar mesas
      await fetchTables();
      
      // Mostrar mensagem de sucesso
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
      
    } catch (err) {
      console.error(`❌ Erro ao finalizar venda na Loja ${storeId}:`, err);
      alert(`Erro ao finalizar venda: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeSale = async () => {
    await finalizeSale();
  };

  const closeTable = async (table: RestaurantTable) => {
    try {
      setSaving(true);
      
      if (!supabaseConfigured) {
        // Simulação para modo demo
        alert('Mesa liberada (modo demonstração)');
        await fetchTables();
        setSaving(false);
        return;
      }

      console.log(`🔒 Liberando mesa ${table.number}...`);
      
      const { error } = await supabase
        .from(getTableName())
        .update({
          status: 'livre',
          current_sale_id: null
        })
        .eq('id', table.id);

      if (error) {
        console.error('❌ Erro ao liberar mesa:', error);
        throw error;
      }

      console.log('✅ Mesa liberada com sucesso');
      await fetchTables();
    } catch (err) {
      console.error('❌ Erro ao liberar mesa:', err);
      alert('Erro ao liberar mesa. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ocupada':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'aguardando_conta':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'limpeza':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'livre':
        return 'Livre';
      case 'ocupada':
        return 'Ocupada';
      case 'aguardando_conta':
        return 'Aguardando Conta';
      case 'limpeza':
        return 'Limpeza';
      default:
        return status;
    }
  };

  useEffect(() => {
    fetchTables();
  }, [storeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            Vendas por Mesa - Loja {storeId}
          </h2>
          <p className="text-gray-600">Gerencie vendas presenciais por mesa</p>
        </div>
        <button
          onClick={fetchTables}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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
                Supabase não configurado. Funcionalidades limitadas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
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
            className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all hover:shadow-md ${getStatusColor(table.status)}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{table.name}</h3>
                <p className="text-sm opacity-75">Capacidade: {table.capacity} pessoas</p>
                {table.location && (
                  <p className="text-xs opacity-60">{table.location}</p>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(table.status)}`}>
                  {getStatusLabel(table.status)}
                </span>
              </div>
            </div>

            {/* Current Sale Info */}
            {table.current_sale && (
              <div className="mb-4 p-3 bg-white/50 rounded-lg border">
                <p className="text-sm font-medium">Venda #{table.current_sale.sale_number}</p>
                <p className="text-xs opacity-75">
                  Aberta: {new Date(table.current_sale.opened_at).toLocaleTimeString('pt-BR')}
                </p>
                {table.current_sale.customer_name && (
                  <p className="text-xs opacity-75">Cliente: {table.current_sale.customer_name}</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {table.status === 'livre' && (
                <button
                  onClick={() => openTable(table)}
                  disabled={saving}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Abrindo...' : 'Abrir Mesa'}
                </button>
              )}
              
              {table.status === 'ocupada' && table.current_sale && (
                <button
                  onClick={() => {
                    setSelectedTable(table);
                    setShowSaleModal(true);
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Continuar Venda
                </button>
              )}
              
              {table.status === 'aguardando_conta' && (
                <button
                  onClick={() => closeTable(table)}
                  disabled={saving}
                  className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Liberando...' : 'Liberar Mesa'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma mesa encontrada para a Loja {storeId}</p>
        </div>
      )}

      {/* Sale Modal */}
      {showSaleModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  {selectedTable.name} - Venda #{selectedTable.current_sale?.sale_number}
                </h2>
                <button
                  onClick={() => {
                    setShowSaleModal(false);
                    setSelectedTable(null);
                    setCartItems([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex h-[70vh]">
              {/* Left Side - Customer Info */}
              <div className="w-1/3 p-6 border-r border-gray-200 overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Dados da Venda</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Cliente
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome do cliente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Pessoas
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCustomerCount(Math.max(1, customerCount - 1))}
                        className="bg-gray-100 hover:bg-gray-200 rounded-full p-2"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center font-medium">{customerCount}</span>
                      <button
                        onClick={() => setCustomerCount(customerCount + 1)}
                        className="bg-gray-100 hover:bg-gray-200 rounded-full p-2"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Forma de Pagamento
                    </label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as any)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="dinheiro">Dinheiro</option>
                      <option value="pix">PIX</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                      <option value="voucher">Voucher</option>
                      <option value="misto">Misto</option>
                    </select>
                  </div>

                  {paymentType === 'dinheiro' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Troco para
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={changeAmount}
                        onChange={(e) => setChangeAmount(parseFloat(e.target.value) || 0)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0,00"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observações
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                      placeholder="Observações da venda..."
                    />
                  </div>
                </div>
              </div>

              {/* Right Side - Items */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Itens da Venda</h3>
                  <button
                    onClick={addItemToCart}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Adicionar Item
                  </button>
                </div>

                {cartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Nenhum item adicionado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-800">{item.product_name}</h4>
                            <p className="text-sm text-gray-600">Código: {item.product_code}</p>
                          </div>
                          <button
                            onClick={() => removeItemFromCart(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateItemQuantity(index, item.quantity - 1)}
                              className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateItemQuantity(index, item.quantity + 1)}
                              className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              {formatPrice(item.subtotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total */}
                {cartItems.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-800">Total:</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatPrice(getCartTotal())}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaleModal(false);
                  setSelectedTable(null);
                  setCartItems([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizeSale}
                disabled={saving || cartItems.length === 0}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Finalizar Venda
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableSalesPanel;