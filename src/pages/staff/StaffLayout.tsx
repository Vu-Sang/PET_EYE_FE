import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import StaffNavbar from '../../components/StaffNavbar';
import { MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ChatWindow from '../../components/chat/ChatWindow';
import { staffService } from '../../services/staff.service';
import { useAuth } from '../../contexts/AuthContext';

export default function StaffLayout() {
  const { user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [shopId, setShopId] = useState<number | null>(null);

  useEffect(() => {
    if (user && !shopId) {
      staffService.getMyProfile()
        .then(profile => setShopId(profile.shopId))
        .catch(() => {});
    }

    const handleToggleChat = () => setIsChatOpen(prev => !prev);
    window.addEventListener('toggle-chat', handleToggleChat);
    return () => window.removeEventListener('toggle-chat', handleToggleChat);
  }, [user, shopId]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-background-dark">
      <StaffNavbar />
      <div className="relative">
        <Outlet />
      </div>


    </div>
  );
}
