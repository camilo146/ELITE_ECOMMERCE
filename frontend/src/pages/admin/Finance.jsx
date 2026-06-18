import { useState, useEffect } from 'react';
import { transactionService } from '../../services';
import { toast } from 'react-toastify';
import { formatPrice } from '../../utils/formatPrice';
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiDollarSign, 
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiFilter
} from 'react-icons/fi';

const Finance = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    startDate: '',
    endDate: ''
  });

  const [formData, setFormData] = useState({
    type: 'income',
    category: 'sale',
    amount: '',
    description: '',
    reference: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const categories = {
    income: [
      { value: 'sale', label: 'Venta' },
      { value: 'refund', label: 'Devolución recibida' },
      { value: 'other_income', label: 'Otro ingreso' }
    ],
    expense: [
      { value: 'inventory', label: 'Inventario' },
      { value: 'shipping', label: 'Envío' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'salary', label: 'Salario' },
      { value: 'rent', label: 'Renta/Alquiler' },
      { value: 'utilities', label: 'Servicios públicos' },
      { value: 'other_expense', label: 'Otro gasto' }
    ]
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transData, summaryData] = await Promise.all([
        transactionService.getAll({ ...filters, limit: 100 }),
        transactionService.getSummary(filters)
      ]);
      // Manejar si el backend devuelve un array directo o un objeto con propiedad transactions
      setTransactions(Array.isArray(transData) ? transData : (transData.transactions || []));
      setSummary(summaryData);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos financieros');
      setTransactions([]); // Asegurar que sea un array en caso de error
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación de campos obligatorios
    if (!formData.type || !formData.category || !formData.amount || !formData.description) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    // Validación de monto
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('El monto debe ser un número mayor a 0');
      return;
    }

    // Validación de descripción
    if (formData.description.length < 5) {
      toast.error('La descripción debe tener al menos 5 caracteres');
      return;
    }

    // Validación de fecha
    const transactionDate = new Date(formData.transactionDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Fin del día actual

    if (transactionDate > today) {
      toast.error('La fecha de transacción no puede ser futura');
      return;
    }

    // Validación de fecha muy antigua (más de 5 años)
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    
    if (transactionDate < fiveYearsAgo) {
      toast.warning('La fecha de transacción es muy antigua (más de 5 años)');
    }

    try {
      if (editingTransaction) {
        await transactionService.update(editingTransaction.id, formData);
        toast.success('Transacción actualizada exitosamente');
      } else {
        await transactionService.create(formData);
        toast.success('Transacción creada exitosamente');
      }
      
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar transacción');
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      description: transaction.description,
      reference: transaction.reference || '',
      transactionDate: transaction.transactionDate.split('T')[0],
      notes: transaction.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    // Usar toast para confirmación
    const confirmDelete = window.confirm('¿Estás seguro de eliminar esta transacción? Esta acción no se puede deshacer.');
    if (!confirmDelete) return;
    
    try {
      await transactionService.delete(id);
      toast.success('Transacción eliminada exitosamente');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar la transacción');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'income',
      category: 'sale',
      amount: '',
      description: '',
      reference: '',
      transactionDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingTransaction(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-16">Cargando...</div>;

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Gestión Financiera</h1>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus /> Nueva Transacción
          </button>
        </div>

        {/* Resumen */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card bg-gradient-to-br from-green-600 to-green-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-100">Ingresos</p>
                  <p className="text-2xl font-bold">{formatPrice(summary.totalIncome)}</p>
                </div>
                <FiTrendingUp className="text-4xl text-green-200" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-red-600 to-red-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-100">Gastos</p>
                  <p className="text-2xl font-bold">{formatPrice(summary.totalExpenses)}</p>
                </div>
                <FiTrendingDown className="text-4xl text-red-200" />
              </div>
            </div>

            <div className={`card bg-gradient-to-br ${summary.netProfit >= 0 ? 'from-blue-600 to-blue-700' : 'from-orange-600 to-orange-700'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">Ganancia Neta</p>
                  <p className="text-2xl font-bold">{formatPrice(summary.netProfit)}</p>
                </div>
                <FiDollarSign className="text-4xl text-blue-200" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-600 to-purple-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100">Margen</p>
                  <p className="text-2xl font-bold">{summary.profitMargin}%</p>
                </div>
                <FiFilter className="text-4xl text-purple-200" />
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="card mb-6">
          <h3 className="text-lg font-bold mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="input-field"
            >
              <option value="">Todos los tipos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>

            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="input-field"
            >
              <option value="">Todas las categorías</option>
              <optgroup label="Ingresos">
                {categories.income.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </optgroup>
              <optgroup label="Gastos">
                {categories.expense.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </optgroup>
            </select>

            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="input-field"
              placeholder="Desde"
            />

            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="input-field"
              placeholder="Hasta"
            />
          </div>
        </div>

        {/* Lista de transacciones */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Transacciones</h3>
          
          {!transactions || transactions.length === 0 ? (
            <p className="text-muted text-center py-8">No hay transacciones</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2">Fecha</th>
                    <th className="text-left py-3 px-2">Tipo</th>
                    <th className="text-left py-3 px-2">Categoría</th>
                    <th className="text-left py-3 px-2">Descripción</th>
                    <th className="text-right py-3 px-2">Monto</th>
                    <th className="text-center py-3 px-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(transaction => (
                    <tr key={transaction.id} className="border-b border-border hover:bg-surface2/50">
                      <td className="py-3 px-2 text-sm">
                        {new Date(transaction.transactionDate).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`badge ${transaction.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                          {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm">
                        {categories[transaction.type]?.find(c => c.value === transaction.category)?.label || transaction.category}
                      </td>
                      <td className="py-3 px-2 text-sm">{transaction.description}</td>
                      <td className={`py-3 px-2 text-right font-bold ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatPrice(transaction.amount)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-surface rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Categoría</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    {categories[formData.type].map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Monto</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="input-field"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Referencia (opcional)</label>
                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Fecha</label>
                  <input
                    type="date"
                    name="transactionDate"
                    value={formData.transactionDate}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notas (opcional)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="input-field"
                    rows="3"
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1">
                    {editingTransaction ? 'Actualizar' : 'Crear'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Finance;
