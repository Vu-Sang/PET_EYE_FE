import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/public/LandingPage';
import HomePage from './pages/public/HomePage';
import About from './pages/public/About';
import Legal from './pages/public/Legal';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ShopRegister from './pages/ShopRegister';
import ShopRegisterSuccess from './pages/ShopRegisterSuccess';
import ShopLayout from './pages/shop/ShopLayout';
import ShopDashboard from './pages/shop/ShopDashboard';
import ShopBookings from './pages/shop/ShopBookings';
import ShopServices from './pages/shop/ShopServices';
import ShopCustomers from './pages/shop/ShopCustomers';
import ShopProfile from './pages/shop/ShopProfile';
import ShopCamera from './pages/shop/ShopCamera';
import ShopMessages from './pages/shop/ShopMessages';
import ShopStaff from './pages/shop/ShopStaff';
import ShopReviews from './pages/shop/ShopReviews';
import ShopNotifications from './pages/shop/ShopNotifications';
import ShopAIAssistant from './pages/shop/ShopAIAssistant';

import StaffLayout from './pages/staff/StaffLayout';
import StaffDashboard from './pages/staff/StaffDashboard';

import StaffProfile from './pages/staff/StaffProfile';
import StaffMessages from './pages/staff/StaffMessages';

import Profile, { ProfileLayout } from './pages/customer/Profile';
import OrderHistory from './pages/customer/OrderHistory';
import BookingHistory from './pages/customer/BookingHistory';
import TransactionHistory from './pages/customer/TransactionHistory';
import ClinicDetail from './pages/public/ClinicDetail';
import PetProfile from './pages/customer/PetProfile';
import Messaging from './pages/public/Messaging';
import VetSearch from './pages/public/VetSearch';
import Payment from './pages/payment/Payment';
import ProfilePets from './pages/customer/ProfilePets';
import ProfileSecurity from './pages/customer/ProfileSecurity';
import ProfileNotifications from './pages/customer/ProfileNotifications';
import CameraView from './pages/public/CameraView';
import ZaloCallback from './pages/auth/ZaloCallback';
import FacebookCallback from './pages/auth/FacebookCallback';
import BookingSuccess from './pages/customer/BookingSuccess';
import PaymentFailure from './pages/payment/PaymentFailure';
import PaymentResult from './pages/payment/PaymentResult';
import CompleteProfile from './pages/auth/CompleteProfile';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminShops from './pages/admin/AdminShops';
import AdminMembers from './pages/admin/AdminMembers';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminMessages from './pages/admin/AdminMessages';
import AdminAIAssistant from './pages/admin/AdminAIAssistant';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import ShopWallet from './pages/shop/ShopWallet';
import AdminVouchers from './pages/admin/AdminVouchers';
import Chatbot from './components/Chatbot';
import GiftBoxCelebration from './components/GiftBoxCelebration';

// Routes where the global Navbar + Footer should be hidden
const SHOP_ROUTES_PREFIX = '/shop';
const STAFF_ROUTES_PREFIX = '/staff';
const ADMIN_ROUTES_PREFIX = '/admin';
const NO_NAVBAR_ROUTES = ['/login', '/register', '/login/zalo/callback', '/login/facebook/callback', '/complete-profile', '/verify-email', '/forgot-password', '/shop/login'];

function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  
  const isShopRoute = location.pathname.startsWith(SHOP_ROUTES_PREFIX);
  const isStaffRoute = location.pathname.startsWith(STAFF_ROUTES_PREFIX);
  const isAdminRoute = location.pathname.startsWith(ADMIN_ROUTES_PREFIX);
  const isNoNavbarRoute = NO_NAVBAR_ROUTES.includes(location.pathname);
  const isHomePage = location.pathname === '/user/dashboard';
  const isCameraPage = location.pathname === '/camera';
  const isMessagingPage = location.pathname === '/messages';
  
  // Show customer navbar for:
  // - Landing page (/) when not logged in
  // - Customer pages when logged in (including /home)
  // Hide for: shop routes, login/register pages, camera page
  const shouldShowCustomerNav = !isShopRoute && !isStaffRoute && !isAdminRoute && !isNoNavbarRoute && !isCameraPage;

  const getRedirectPath = () => {
    if (!user) return "/";
    if (user.requiresEmailUpdate) return "/complete-profile";
    switch (user.role) {
      case 'SHOP_OWNER': return "/shop/dashboard";
      case 'STAFF': return "/staff/dashboard";
      case 'ADMIN': return "/admin/dashboard";
      default: return "/";
    }
  };

  return (
    <div className={`${isMessagingPage ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300`}>
      {shouldShowCustomerNav && <Navbar />}

      <main className={`flex-1 flex flex-col grow relative ${shouldShowCustomerNav && !isMessagingPage ? 'overflow-x-hidden' : ''} ${isMessagingPage ? 'overflow-hidden' : ''}`}>
        {shouldShowCustomerNav && (
          <>
            <div className="decoration-blob w-96 h-96 bg-primary/20 top-0 left-0 rounded-full translate-x-[-30%] translate-y-[-30%]" />
            <div className="decoration-blob w-96 h-96 bg-secondary/10 top-1/2 right-0 rounded-full translate-x-[30%]" />
          </>
        )}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/user/dashboard" element={user ? <HomePage /> : <Navigate to="/" replace />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Legal />} />
          <Route path="/privacy" element={<Legal />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/zalo/callback" element={<ZaloCallback />} />
          <Route path="/login/facebook/callback" element={<FacebookCallback />} />
          <Route path="/register" element={<Register />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/shop/login" element={<Login />} />
          <Route path="/shop/register" element={<ShopRegister />} />
          <Route path="/shop/register/success" element={<ShopRegisterSuccess />} />
          
          {/* Admin Routes with Layout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="shops" element={<AdminShops />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="vouchers" element={<AdminVouchers />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="ai-assistant" element={<AdminAIAssistant />} />
          </Route>

          {/* Shop Routes with Layout */}
          <Route path="/shop" element={<ShopLayout />}>
            <Route path="dashboard" element={<ShopDashboard />} />
            <Route path="bookings" element={<ShopBookings />} />
            <Route path="services" element={<ShopServices />} />
            <Route path="customers" element={<ShopCustomers />} />
            <Route path="camera" element={<ShopCamera />} />
            <Route path="messages" element={<ShopMessages />} />
            <Route path="staff" element={<ShopStaff />} />
            <Route path="reviews" element={<ShopReviews />} />
            <Route path="profile" element={<ShopProfile />} />
            <Route path="wallet" element={<ShopWallet />} />
            <Route path="notifications" element={<ShopNotifications />} />
            <Route path="ai-assistant" element={<ShopAIAssistant />} />
          </Route>

          {/* Staff Routes with Layout */}
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="tasks" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="profile" element={<StaffProfile />} />
            <Route path="messages" element={<StaffMessages />} />
            <Route path="camera" element={<ShopCamera />} />
          </Route>

          {/* profile area with persistent sidebar */}
          <Route path="/profile" element={user ? <ProfileLayout /> : <Navigate to="/" replace />}>
            <Route index element={<Profile />} />
            <Route path="pets" element={<ProfilePets />} />
            <Route path="bookings" element={<BookingHistory />} />
            <Route path="transactions" element={<TransactionHistory />} />
            <Route path="orders" element={<OrderHistory />} />
            <Route path="security" element={<ProfileSecurity />} />
            <Route path="notifications" element={<ProfileNotifications />} />
          </Route>
          <Route path="/clinic/:id" element={<ClinicDetail />} />
          <Route path="/pet/:id" element={user ? <PetProfile /> : <Navigate to="/" replace />} />
          <Route path="/messages" element={user ? <Messaging /> : <Navigate to="/" replace />} />
          <Route path="/camera" element={user ? <CameraView /> : <Navigate to="/" replace />} />
          <Route path="/search" element={<VetSearch />} />
          <Route path="/payment" element={user ? <Payment /> : <Navigate to="/" replace />} />
          <Route path="/payment/result" element={user ? <PaymentResult /> : <Navigate to="/" replace />} />
          <Route path="/booking/success" element={user ? <BookingSuccess /> : <Navigate to="/" replace />} />
          <Route path="/payment/failure" element={user ? <PaymentFailure /> : <Navigate to="/" replace />} />
          <Route path="/bookings/my" element={user ? <BookingHistory /> : <Navigate to="/" replace />} />
        </Routes>
      </main>

      {shouldShowCustomerNav && !isMessagingPage && <Footer />}

      {/* Gift Box Celebration — hiển thị khi user thăng hạng */}
      {user && !isShopRoute && !isStaffRoute && !isAdminRoute && !isNoNavbarRoute && <GiftBoxCelebration />}

      {/* Chatbot – hiển thị cho tất cả customer pages (kể cả /home), trừ Camera và Messages. Ẩn nếu chưa đăng nhập */}
      {user && !isShopRoute && !isStaffRoute && !isAdminRoute && !isNoNavbarRoute && !isCameraPage && !isMessagingPage && <Chatbot />}
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster 
          position="bottom-right" 
          reverseOrder={false} 
          toastOptions={{
            style: {
              background: '#1e293b', // bg-slate-800
              color: '#fff',
              borderRadius: '16px',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
              padding: '12px 24px',
              fontSize: '13px',
              fontWeight: '600',
              letterSpacing: '0.02em',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Router>
          <ScrollToTop />
          <AppLayout />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
