import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewService, ReviewResponse } from '../../services/review.service';
import { shopService } from '../../services/shop.service';
import { Star, MessageCircle, Send, Filter, Calendar, User, CheckCircle2, Reply } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

export default function ShopReviews() {
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [page, setPage] = useState(0);

  // 1. Get My Shop Info
  const { data: shop } = useQuery({
    queryKey: ['my-shop'],
    queryFn: () => shopService.getMyShop(),
  });

  // 2. Get Reviews for this shop (paginated)
  const { data: pagedData, isLoading } = useQuery({
    queryKey: ['shop-reviews-owner', shop?.id, page],
    queryFn: () => reviewService.getReviewsByShopPaged(shop!.id, page),
    enabled: !!shop?.id,
  });

  const reviews = pagedData?.content ?? [];
  const totalPages = pagedData?.totalPages ?? 1;

  // 3. Mutation for replying
  const replyMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => reviewService.replyToReview(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-reviews-owner'] });
      setReplyingTo(null);
      setReplyText('');
      toast.success('Đã gửi phản hồi thành công!');
    },
    onError: () => {
      toast.error('Gửi phản hồi thất bại. Vui lòng thử lại.');
    }
  });

  const handleReplySubmit = (reviewId: number) => {
    if (!replyText.trim()) return;
    replyMutation.mutate({ id: reviewId, text: replyText });
  };

  const filteredReviews = reviews.filter(r => filterRating === 'all' || r.rating === filterRating);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Star className={`w-8 h-8 ${isDark ? 'text-indigo-400' : 'text-blue-600'}`} />
            Quản lý Đánh giá
            <div className={`px-3 py-1 text-xs font-bold rounded-full border ${isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
              {reviews.length} Phản hồi
            </div>
          </h1>
          <p className={`font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Xem và phản hồi lại những đánh giá từ khách hàng của bạn.</p>
        </div>

        {/* Rating Summary Card */}
        <div className={`rounded-3xl p-6 flex items-center gap-8 shadow-sm border transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white shadow-xl shadow-slate-200/50 border-slate-100'}`}>
          <div className="text-center">
            <span className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{shop?.ratingAvg?.toFixed(1) || '0.0'}</span>
            <div className="flex text-amber-400 justify-center mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={14} fill={s <= Math.round(shop?.ratingAvg || 0) ? "currentColor" : "none"} />
              ))}
            </div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Điểm trung bình</p>
          </div>
          <div className={`w-px h-12 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`} />
          <div className="flex flex-col gap-1">
            {[5, 4, 3, 2, 1].map(star => {
              const count = reviews.filter(r => r.rating === star).length;
              const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold w-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{star}</span>
                  <div className={`w-24 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                  <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <button
          onClick={() => setFilterRating('all')}
          className={`px-5 py-2.5 rounded-2xl text-[13px] font-bold transition-all border ${
            filterRating === 'all'
              ? (isDark ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20')
              : (isDark ? 'bg-slate-800/50 text-slate-300 border-white/5 hover:bg-slate-800' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300')
          }`}
        >
          Tất cả
        </button>
        {[5, 4, 3, 2, 1].map(star => (
          <button
            key={star}
            onClick={() => setFilterRating(star)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-bold transition-all border ${
              filterRating === star
                ? (isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-400 text-slate-900 border-amber-400 shadow-lg shadow-amber-400/20')
                : (isDark ? 'bg-slate-800/50 text-slate-300 border-white/5 hover:bg-slate-800' : 'bg-white text-slate-500 border-slate-100 hover:border-amber-200')
            }`}
          >
            {star} <Star size={14} fill={filterRating === star ? "currentColor" : "none"} />
          </button>
        ))}
      </div>

      {/* Review List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-20">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto ${isDark ? 'border-indigo-400' : 'border-primary'}`}></div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className={`rounded-[2.5rem] p-16 text-center border border-dashed transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'}`}>
            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <Star size={40} className={isDark ? 'text-slate-600' : 'text-slate-200'} />
            </div>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Chưa có đánh giá nào</h3>
            <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Những đánh giá từ khách hàng sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          filteredReviews.map((review, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={review.id}
              className={`group rounded-[2.5rem] p-8 transition-all border ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/5 hover:border-indigo-500/30 shadow-none' : 'bg-white shadow-xl shadow-slate-200/40 border-slate-100 hover:border-primary/20'}`}
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* User Info */}
                <div className="flex items-start gap-4 md:w-48 shrink-0">
                  <div className="relative">
                    <img
                      src={review.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop'}
                      alt={review.userName}
                      className={`w-14 h-14 rounded-2xl object-cover ring-4 ${isDark ? 'ring-slate-800' : 'ring-slate-50'}`}
                    />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-lg border-2 flex items-center justify-center ${isDark ? 'border-slate-800' : 'border-white'}`}>
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm truncate max-w-[120px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{review.userName}</h4>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                        <Calendar size={10} />
                        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                      {review.serviceName && (
                        <div className={`text-[10px] font-black truncate max-w-[120px] uppercase tracking-tighter ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>
                          #{review.serviceName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-3">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={16} className={s <= review.rating ? 'text-amber-400 fill-amber-400' : (isDark ? 'text-slate-700' : 'text-slate-200')} />
                    ))}
                  </div>
                  <p className={`leading-relaxed text-[15px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {review.comment}
                  </p>

                  {/* Owner Reply Area */}
                  <div className="mt-8">
                    {review.reply ? (
                      <div className={`rounded-3xl p-6 border relative overflow-hidden group/reply ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${isDark ? 'bg-indigo-500' : 'bg-primary'}`} />
                        <div className="flex items-center justify-between mb-3">
                          <div className={`flex items-center gap-2 font-black text-[11px] uppercase tracking-[0.2em] ${isDark ? 'text-indigo-400' : 'text-primary'}`}>
                            <Reply size={14} /> Phản hồi từ Shop
                          </div>
                          <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                            {new Date(review.repliedAt!).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          "{review.reply}"
                        </p>
                        <button 
                          onClick={() => {
                            setReplyingTo(review.id);
                            setReplyText(review.reply!);
                          }}
                          className={`absolute top-4 right-4 opacity-0 group-hover/reply:opacity-100 transition-opacity text-[11px] font-bold hover:underline ${isDark ? 'text-indigo-400' : 'text-primary'}`}
                        >
                          Chỉnh sửa
                        </button>
                      </div>
                    ) : replyingTo === review.id ? (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`rounded-3xl p-6 border ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-primary/5 border-primary/20'}`}
                      >
                        <div className={`flex items-center gap-2 mb-4 font-black text-[11px] uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-primary'}`}>
                          <MessageCircle size={16} /> Viết phản hồi của bạn
                        </div>
                        <textarea
                          autoFocus
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Cảm ơn khách hàng hoặc giải đáp thắc mắc của họ..."
                          className={`w-full border rounded-2xl p-4 text-sm focus:ring-2 outline-none transition-all min-h-[100px] resize-none ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-500' : 'bg-white border-slate-200 focus:ring-primary/20 focus:border-primary placeholder-slate-400'}`}
                        />
                        <div className="flex justify-end gap-3 mt-4">
                          <button
                            onClick={() => setReplyingTo(null)}
                            className={`px-6 py-2 text-[13px] font-bold transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                          >
                            Hủy bỏ
                          </button>
                          <button
                            disabled={replyMutation.isPending || !replyText.trim()}
                            onClick={() => handleReplySubmit(review.id)}
                            className={`flex items-center gap-2 px-8 py-2 text-white rounded-xl text-[13px] font-bold transition-all disabled:opacity-50 ${isDark ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40' : 'bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/40'}`}
                          >
                            {replyMutation.isPending ? 'Đang gửi...' : 'Gửi phản hồi'}
                            {!replyMutation.isPending && <Send size={14} />}
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(review.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[13px] font-bold transition-all group/btn ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white' : 'bg-slate-50 text-slate-600 hover:bg-primary hover:text-white'}`}
                      >
                        <MessageCircle size={16} className="group-hover/btn:scale-110 transition-transform" />
                        Viết phản hồi ngay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Trang {page + 1} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all disabled:opacity-40 ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              ← Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i).filter(i => Math.abs(i - page) <= 2).map(i => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                  i === page
                    ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-primary text-white shadow-lg shadow-primary/20')
                    : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all disabled:opacity-40 ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
