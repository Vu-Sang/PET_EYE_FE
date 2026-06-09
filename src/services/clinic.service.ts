import { Clinic } from '../types';
import { shopService } from './shop.service';
import apiClient from './apiClient';

// Types for Goong Map API responses
export interface NearbyShopResponse {
  id: number;
  shopName: string;
  shopType: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  logoUrl: string;
  ratingAvg: number;
  distanceKm: number;
  durationMinutes: number | null;
}

export interface DirectionsResponse {
  routes: Array<{
    overview_polyline: {
      points: string;
    };
    legs: Array<{
      distance: {
        value: number;
        text: string;
      };
      duration: {
        value: number;
        text: string;
      };
      steps: Array<{
        html_instructions: string;
        distance: {
          value: number;
          text: string;
        };
        duration: {
          value: number;
          text: string;
        };
      }>;
    }>;
  }>;
}

export const clinicService = {
  getAll: async (): Promise<Clinic[]> => {
    try {
      const shops = await shopService.searchPublic();
      
      // Map BE Shop to FE Clinic
      return shops.map(shop => ({
        id: shop.id,
        name: shop.shopName,
        address: shop.address + (shop.city ? `, ${shop.city}` : ''),
        rating: shop.ratingAvg || 0,
        reviewCount: 0, // Not in BE yet
        isOpen: true,
        hours: '08:00 - 20:00',
        distance: '---',
        price: '---',
        tags: [shop.shopType], // Use shopType as a tag
        image: shop.licenseImageUrl || 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=800&auto=format&fit=crop',
        verified: shop.isVerified,
        badge: shop.isVerified ? 'Verified' : null,
      }));
    } catch (error) {
      console.error('Failed to fetch shops', error);
      return [];
    }
  },

  getById: async (id: number): Promise<Clinic> => {
    const shop = await shopService.getPublicById(id);
    
    return {
      id: shop.id,
      name: shop.shopName,
      address: shop.address + (shop.city ? `, ${shop.city}` : ''),
      rating: shop.ratingAvg || 0,
      reviewCount: 0,
      isOpen: true,
      hours: '08:00 - 20:00',
      distance: '---',
      price: '---',
      tags: [shop.shopType],
      image: shop.licenseImageUrl || 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=800&auto=format&fit=crop',
      verified: shop.isVerified,
      badge: shop.isVerified ? 'Verified' : null,
    };
  },

  /**
   * API 1: Tìm shop gần vị trí người dùng
   * @param lat - Vĩ độ vị trí người dùng
   * @param lng - Kinh độ vị trí người dùng
   * @param radius - Bán kính tìm kiếm (km), mặc định = 10
   */
  getNearbyShops: async (lat: number, lng: number, radius: number = 10): Promise<NearbyShopResponse[]> => {
    try {
      const response = await apiClient.get<{ result: NearbyShopResponse[] }>(
        `/shops/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
      );
      return response.data.result;
    } catch (error) {
      console.error('Failed to fetch nearby shops:', error);
      return [];
    }
  },

  /**
   * API 2: Lấy chỉ đường đến shop
   * @param shopId - ID của shop
   * @param fromLat - Vĩ độ vị trí xuất phát
   * @param fromLng - Kinh độ vị trí xuất phát
   */
  getDirectionsToShop: async (shopId: number, fromLat: number, fromLng: number): Promise<DirectionsResponse | null> => {
    try {
      const response = await apiClient.get<{ result: DirectionsResponse }>(
        `/shops/${shopId}/directions?fromLat=${fromLat}&fromLng=${fromLng}`
      );
      return response.data.result;
    } catch (error) {
      console.error('Failed to fetch directions:', error);
      return null;
    }
  },
};
