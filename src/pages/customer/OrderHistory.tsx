import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

type OrderStatus = 'Đã giao' | 'Đang xử lý' | 'Đã huỷ';

export default function OrderHistory() {
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const orders = [
    {
      id: 'ORD-88291',
      date: '24/10/2023',
      amount: '1.250.000đ',
      status: 'Đã giao',
      items: 3,
      image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1964&auto=format&fit=crop'
    },
    {
      id: 'ORD-88102',
      date: '12/10/2023',
      amount: '450.000đ',
      status: 'Đang xử lý',
      items: 1,
      image: 'https://images.unsplash.com/photo-1544568100-847a948585b9?q=80&w=1974&auto=format&fit=crop'
    },
    {
      id: 'ORD-87954',
      date: '28/09/2023',
      amount: '2.100.000đ',
      status: 'Đã huỷ',
      items: 5,
      image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=2069&auto=format&fit=crop'
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đã giao':
        return 'bg-green-100 text-green-600';
      case 'Đang xử lý':
        return 'bg-blue-100 text-blue-600';
      case 'Đã huỷ':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Đã giao':
        return <CheckCircle2 size={14} />;
      case 'Đang xử lý':
        return <Clock size={14} />;
      case 'Đã huỷ':
        return <XCircle size={14} />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  const TAB_FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Đã giao', value: 'Đã giao' },
    { label: 'Đang xử lý', value: 'Đang xử lý' },
    { label: 'Đã huỷ', value: 'Đã huỷ' },
  ];

  const filtered = activeTab === 'all' 
    ? orders 
    : orders.filter(o => o.status === activeTab);

  return (
    <main className=" flex-1 flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Lịch sử đơn hàng
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi và quản lý các đơn hàng mua sắm thú cưng của bạn.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              placeholder="Tìm kiếm đơn hàng..."
            />
          </div>

          <button className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-2 border-b border-slate-100 dark:border-slate-700 overflow-x-auto scrollbar-hide">
        {TAB_FILTERS.map(t => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`pb-4 px-4 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${activeTab === t.value
              ? 'text-[#122143] dark:text-white border-[#122143] dark:border-white'
              : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'
              }`}
          >
            {t.label}
            {t.value !== 'all' && (
              <span className={`ml-1.5 text-[10px] font-black ${activeTab === t.value ? 'opacity-100' : 'opacity-50'}`}>
                ({orders.filter(o => o.status === t.value).length})
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Orders */}
      <div className="space-y-4 ">
        {filtered.map((order) => (
          <div
            key={order.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-full sm:w-24 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={order.image}
                  alt="Đơn hàng"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="font-bold text-lg">{order.id}</h3>
                    <p className="text-slate-500 text-sm">
                      Ngày đặt: {order.date}
                    </p>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}
                  >
                    {getStatusIcon(order.status)}
                    {order.status}
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-end gap-4 mt-4">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        Tổng tiền
                      </p>
                      <p className="font-bold">{order.amount}</p>
                    </div>

                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        Số sản phẩm
                      </p>
                      <p className="font-bold">{order.items} sản phẩm</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors">
                      Xem chi tiết
                    </button>

                    <Link
                      to="/"
                      className="px-4 py-2 rounded-lg bg-[#1a2b4c] text-white text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      Mua lại
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-lg">Không có đơn hàng nào</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
          </div>
        )}
      </div>
    </main>
  );
}