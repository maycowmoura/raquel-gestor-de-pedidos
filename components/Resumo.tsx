import React, { useState, useMemo } from 'react';
import { Order, Product } from '../types';
import { CalendarIcon, SearchIcon } from './Icons';

interface ResumoProps {
  orders: Order[];
  products: Product[];
}

const Resumo: React.FC<ResumoProps> = ({ orders, products }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultStartDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(todayStr);

  const summary = useMemo(() => {
    const totals: Record<string, { name: string, quantity: number }> = {};
    let totalRevenue = 0;

    orders.forEach(order => {
      // Filtrar pedidos que estão dentro do período selecionado
      if (order.deliveryDate >= startDate && order.deliveryDate <= endDate) {
        if (order.totalValue) {
          totalRevenue += order.totalValue;
        }

        order.items.forEach(item => {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            totals[prod.id] = totals[prod.id] ?? { name: prod.name, quantity: 0 };
            totals[prod.id].quantity += Number(item.quantity);
          }
        });
      }
    });
    return {
      items: Object.entries(totals).sort((a, b) => b[1].quantity - a[1].quantity),
      totalRevenue
    };
  }, [orders, products, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Resumo de Entregas</h2>
      </div>

      <div className="bg-white border rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Data Inicial</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <CalendarIcon />
              </div>
              <input
                type="date"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Data Final</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <CalendarIcon />
              </div>
              <input
                type="date"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {summary.items.length === 0 ? (
        <div className="bg-white border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
            <SearchIcon />
          </div>
          <p className="text-gray-500 font-medium">Nenhum produto entregue neste período.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
            <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Faturamento do Período</h4>
            <div className="text-4xl font-bold text-emerald-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalRevenue)}
            </div>
            <p className="text-sm font-medium text-emerald-600 mt-2 opacity-80">Refletindo pedidos entregues neste intervalo de datas.</p>
          </div>

          <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col hover:border-indigo-200 transition-all">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quantidade por Produto</h4>
            <ul className="space-y-2 flex-1">
              {summary.items.map(([id, item]) => (
                <li key={id} className="flex justify-between items-center text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  <span>{item.name}</span>
                  <span className="bg-white px-2 py-0.5 rounded border shadow-sm">{item.quantity}x</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resumo;
