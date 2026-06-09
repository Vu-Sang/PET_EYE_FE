import apiClient from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CameraDevice {
  deviceId: string;
  name: string;
  status: 'online' | 'offline';
  deviceModel: string;
  online: boolean;
  channelId: string;
  coverUrl?: string;
}

export interface CameraStream {
  deviceId: string;
  streamUrl: string;
  protocol: string;
  liveToken?: string;
  status: number;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Liên kết tài khoản Imou Life của chủ shop với hệ thống Pet Eye.
 * Sau khi bind, các camera share trên Imou Life sẽ xuất hiện trong getDevices().
 */
export const bindImouAccount = async (phone: string): Promise<string> => {
  const res = await apiClient.post('/cameras/bind-account', { phone });
  return res.data.message as string;
};

/**
 * Lấy danh sách tất cả camera đã được share về Developer App.
 * Nếu Imou Cloud chưa liên kết, BE trả về mock data để FE không bị crash.
 */
export const getDevices = async (): Promise<CameraDevice[]> => {
  const res = await apiClient.get('/cameras/devices');
  return res.data.result as CameraDevice[];
};

/**
 * Lấy URL HLS live stream cho một camera cụ thể.
 * @param deviceId  Device ID thực từ Imou Cloud (ví dụ: "9HB423PAG74...")
 */
export const getLiveStream = async (deviceId: string): Promise<CameraStream> => {
  const res = await apiClient.get(`/cameras/stream/${deviceId}`);
  return res.data.result as CameraStream;
};
