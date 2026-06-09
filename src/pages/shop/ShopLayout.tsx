import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ShopSidebar from '../../components/shop/ShopSidebar';
import ShopHeader from '../../components/shop/ShopHeader';
import { MessageCircle, X } from 'lucide-react';
import { motion } from 'motion/react';
import ChatWindow from '../../components/chat/ChatWindow';
import ShopRealtimeNotification from '../../components/shop/ShopRealtimeNotification';
import { shopService } from '../../services/shop.service';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';

function ShopLayoutInner() {
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [shopId, setShopId] = useState<number | null>(null);
  
  const isMessagePage = location.pathname === '/shop/messages';

  useEffect(() => {
    if (user && !shopId) {
      shopService.getMyShop()
        .then(shop => setShopId(shop.id))
        .catch(() => {});
    }
  }, [user, shopId]);

  const themeClasses = isDark
    ? 'admin-bg-mesh text-slate-200'
    : 'bg-[#f8fafc] text-slate-900';

  return (
    <div className={`flex h-screen max-w-[1920px] mx-auto w-full relative overflow-hidden ${themeClasses}`}>
      {/* Fixed Sidebar */}
      <ShopSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ShopHeader />
        
        <main className="flex-1 flex flex-col min-h-0 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating Chat Button (For Admin Support) */}
      {!isMessagePage && (
        <div className="fixed bottom-8 right-8 z-[100]">
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`flex items-center justify-center w-16 h-16 rounded-[2rem] shadow-2xl transition-all relative group ${
                isChatOpen ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-primary text-white shadow-primary/30 glow-blue'
            }`}
          >
            {isChatOpen ? <X size={28} /> : <MessageCircle size={28} />}
            
            {!isChatOpen && (
              <span className="absolute right-full mr-4 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Chat với Admin
              </span>
            )}

            {!isChatOpen && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-950" />
            )}
          </motion.button>
        </div>
      )}

      {shopId && (
        <>
          <ChatWindow 
            shopId={shopId} 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)}
            title="Hỗ trợ Shop Owner"
          />
          <ShopRealtimeNotification shopId={shopId} />
        </>
      )}
    </div>
  );
}

export default function ShopLayout() {
  return (
    <ThemeProvider>
      <ShopLayoutInner />
    </ThemeProvider>
  );
}
