export interface ApiResponse<T> {
  code: number;
  message?: string;
  result?: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AuthenticationResponse {
  authenticated: boolean;
  token: string;
  requiresEmailUpdate: boolean;
}

export interface RoleResponse {
  id: number;
  name: string;
  description: string;
}

export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  avatar: string;
  roles: RoleResponse[];
  totalSpending?: number;
  justUpgraded?: boolean;
  currentTier?: MembershipTierResponse;
  vouchers?: VoucherResponse[];
}

export interface MembershipTierResponse {
  id: number;
  name: string;
  requiredSpending: number;
  benefits?: string;
}

export interface VoucherResponse {
  id: number;
  code: string;
  targetTierName?: string;
  requiredSpending?: number;
  discountType: string;
  discountValue: number;
  validDays: number;
  issueQuantity: number;
  expiresAt?: string;
}

export interface ServiceResponse {
  id: number;
  shopId: number;
  shopName: string;
  serviceName: string;
  category: string;
  price: number;
  durationMinutes: number;
  description: string;
  imageUrl: string;
  active: boolean;
  createdAt: string;
  // BOARDING-only
  cameraEnabled: boolean;
  /** Tier IDs the shop supports, e.g. ["BASIC","HD","AI"] */
  cameraTiers?: string[];
  /** Custom prices per tier (extra VND/day), e.g. {"BASIC":0,"HD":60000} */
  cameraTierPrices?: Record<string, number>;
  /** Custom display labels per tier, e.g. {"BASIC":"Tiêu chuẩn","HD":"Nét cao"} */
  cameraTierLabels?: Record<string, string>;
  cameraDescription?: string;
  cageSize?: string[];
  roomType?: string[];
}

export interface ServiceCreationRequest {
  serviceName: string;
  category: string;
  price: number;
  durationMinutes: number;
  description: string;
  imageUrl?: string;
  // BOARDING-only
  cameraEnabled?: boolean;
  cameraTiers?: string[];
  cameraTierPrices?: Record<string, number>;
  cameraTierLabels?: Record<string, string>;
  cameraDescription?: string;
  cageSize?: string[];
  roomType?: string[];
}

export interface ServiceUpdateRequest {
  serviceName?: string;
  category?: string;
  price?: number;
  durationMinutes?: number;
  description?: string;
  imageUrl?: string;
  active?: boolean;
  // BOARDING-only
  cameraEnabled?: boolean;
  cameraTiers?: string[];
  cameraTierPrices?: Record<string, number>;
  cameraTierLabels?: Record<string, string>;
  cameraDescription?: string;
  cageSize?: string[];
  roomType?: string[];
}

export interface StaffResponse {
  id: number;
  shopId: number;
  fullName: string;
  role: string;
  phone: string;
  specialization: string;
  isActive: boolean;
  /** true = rảnh tại khung giờ được query, false = bận, undefined = chưa query */
  available?: boolean;
  certificates?: {
    id: number;
    certificateName: string;
    imageUrl?: string;
    issueDate?: string;
    expiryDate?: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  }[];
}

export interface BookingRequest {
  shopId: number;
  serviceId: number;
  serviceIds?: number[];
  petId: number;
  staffId?: number;
  appointmentDatetime: string;
  checkIn?: string;
  checkOut?: string;
  note?: string;
  paymentMethod?: 'PAYOS' | 'CASH';
  cageSize?: string;
  roomType?: string;
}

export interface BookingResponse {
  id: number;
  userId: number;
  shopId: number;
  shopName: string;
  shopAddress?: string;
  serviceId: number;
  serviceName: string;
  servicePrice: number;
  services?: {
      serviceId: number;
      serviceName: string;
      servicePrice: number;
      category?: string;
      durationMinutes?: number;
  }[];
  petId: number;
  petName: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  staffId?: number;
  staffName?: string;
  appointmentDatetime: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  note?: string;
  cancellationReason?: string;
  bankName?: string;
  bankAccount?: string;
  accountHolder?: string;
  payosOrderCode: number;
  createdAt: string;
  updatedAt?: string;
  checkoutUrl?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  paidAmount?: number;
  cameraRtspUrl?: string;
  cameraStreamUrl?: string;
  cameraEnabled?: boolean;
  cameraConfiguredAt?: string;
  serviceStartDatetime?: string;
  serviceEndDatetime?: string;
  cageSize?: string;
  roomType?: string;
  category?: string;
}

export interface TransactionResponse {
    id: number;
    type: string;
    amount: number;
    paymentMethod: string;
    status: string;
    payosOrderCode?: number;
    gatewayTransactionId?: string;
    description: string;
    createdAt: string;
    bookingId?: number;
    shopName?: string;
    serviceName?: string;
}

export interface CustomerItemResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  pets: number;
  totalBookings: number;
  totalSpent: string;
  lastVisit: string;
  tier: string;
}

export interface ShopCustomerResponse {
  totalCustomers: number;
  newCustomersThisMonth: number;
  loyalCustomers: number;
  customers: CustomerItemResponse[];
}

export interface PetResponse {
  id: number;
  name: string;
  species: string;
  breed: string;
  gender: string;
  birthDate: string;
  weight: number;
  avatar: string;
  ownerId: number;
}

export interface CustomerDetailResponse {
  customerInfo: CustomerItemResponse;
  pets: PetResponse[];
  bookingHistory: BookingResponse[];
}

export interface RevenueChartData {
  date: string;
  amount: number;
}

export interface ServiceStat {
  name: string;
  count: number;
}

export interface BookingStatusStats {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export interface ShopDashboardResponse {
  totalRevenue: number;
  periodRevenue: number;
  totalBookings: number;
  pendingBookings: number;
  totalCustomers: number;
  totalPets: number;
  periodBookings: number;
  periodNewCustomers: number;
  revenueChart: RevenueChartData[];
  topServices: ServiceStat[];
  bookingStatusStats: BookingStatusStats;
  growthPercentage: number;
  growthDescription: string;
}
