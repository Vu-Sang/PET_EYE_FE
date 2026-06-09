import React from 'react';
import { Link } from 'react-router-dom';
import type { NearbyShopResponse } from '../services/clinic.service';

interface NearbyShopsProps {
  shops: NearbyShopResponse[];
  loading?: boolean;
}

export default function NearbyShops({ shops, loading }: NearbyShopsProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">
          location_off
        </span>
        <p className="text-slate-400 text-sm">Không tìm thấy shop nào gần bạn</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {shops.map((shop, index) => (
        <div
          key={shop.id}
          className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
        >
          {/* Ranking badge */}
          <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg">
            {index + 1}
          </div>

          <div className="flex gap-4">
            {/* Shop logo */}
            <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-700">
              <img
                src={shop.logoUrl || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=200&q=80'}
                alt={shop.shopName}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            {/* Shop info */}
            <div className="flex-1 min-w-0">
              <Link 
                to={`/clinic/${shop.id}`}
                className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-primary transition-colors line-clamp-1"
              >
                {shop.shopName}
              </Link>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                {shop.shopType}
              </p>

              <div className="flex items-center gap-3 mt-2">
                {/* Rating */}
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {shop.ratingAvg.toFixed(1)}
                  </span>
                </div>

                <span className="text-slate-300 dark:text-slate-600">•</span>

                {/* Distance */}
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-teal-500 text-sm">
                    location_on
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {shop.distanceKm.toFixed(1)} km
                  </span>
                </div>

                {/* Duration if available */}
                {shop.durationMinutes && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-blue-500 text-sm">
                        schedule
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {shop.durationMinutes} phút
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Address */}
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                {shop.address}, {shop.city}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3">
            <Link
              to={`/clinic/${shop.id}`}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              Xem chi tiết
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
