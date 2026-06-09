import React, { useState, useRef, useEffect } from 'react';
import { 
    X, Send, Paperclip, Shield, Wifi, WifiOff, 
    MessageCircle, Smile, Image as ImageIcon, Loader2, Users, ChevronLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useShopChat } from '../../hooks/useShopChat';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import ConversationThread from './shared/ConversationThread';
import { shopService } from '../../services/shop.service';

interface ChatWindowProps {
    shopId: number;
    title?: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ChatWindow({ shopId, title = 'Hỗ trợ & Quản trị', isOpen, onClose }: ChatWindowProps) {
    const { user } = useAuth();
    const isStaff = user?.role === 'STAFF';
    const [channelType, setChannelType] = useState<'ADMIN_SUPPORT' | 'INTERNAL_STAFF' | 'CUSTOMER_CHAT' | 'DIRECT'>('INTERNAL_STAFF');
    const [selectedCustomerEmail, setSelectedCustomerEmail] = useState<string | null>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);

    const { data: shopData } = useQuery({
        queryKey: ['chat-shop-info', shopId],
        queryFn: () => shopService.getPublicById(shopId),
        enabled: isOpen && !!user && isStaff
    });

    const { data: customers = [] } = useQuery({
        queryKey: ['my-shop-customers-mini', shopId],
        queryFn: () => shopService.getShopCustomers(shopId),
        enabled: isOpen && !!user && !!shopId
    });

    useEffect(() => {
        if (user) {
            setChannelType(isStaff ? 'INTERNAL_STAFF' : 'ADMIN_SUPPORT');
        }
    }, [user, isStaff, isOpen]);
    
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // For DIRECT chat (Staff <-> Owner), recipient is the ownerEmail
    const recipientEmail = channelType === 'CUSTOMER_CHAT' 
        ? selectedCustomerEmail ?? undefined 
        : (channelType === 'DIRECT' ? shopData?.email : undefined);

    const { messages, connected, sendMessage } = useShopChat(
        shopId, 
        user?.token, 
        channelType,
        recipientEmail
    );

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] pointer-events-none flex items-end justify-end p-4 md:p-8">
                    <motion.div 
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.95 }}
                        className="pointer-events-auto w-full max-w-[420px] h-[600px] max-h-[85vh] bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-primary dark:bg-primary-dark text-white shadow-lg relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                            
                            <div className="p-6 flex items-center gap-4 relative z-10">
                                {channelType === 'CUSTOMER_CHAT' && selectedCustomerEmail && (
                                    <button 
                                        onClick={() => {
                                            setSelectedCustomerEmail(null);
                                            setSelectedCustomerName(null);
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-xl text-white/80 transition-all -ml-2"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                )}
                                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                                    {channelType === 'ADMIN_SUPPORT' ? <Shield size={22} className="text-white" /> : <Users size={22} className="text-white" />}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-bold text-sm tracking-tight">
                                        {channelType === 'ADMIN_SUPPORT' ? 'Hỗ trợ Admin' : 
                                         channelType === 'INTERNAL_STAFF' ? 'Nhóm Nội bộ Shop' :
                                         channelType === 'DIRECT' ? 'Chủ Shop' :
                                         (selectedCustomerName || 'Chọn khách hàng')}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                                        <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                                            {channelType === 'CUSTOMER_CHAT' && !selectedCustomerEmail ? 'Danh sách' : (connected ? 'Trực tuyến' : 'Ngoại tuyến')}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-xl text-white/80 transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Channel Tabs */}
                            <div className="flex px-3 pb-2 gap-1">
                                {!isStaff && (
                                    <button 
                                        onClick={() => setChannelType('ADMIN_SUPPORT')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                            channelType === 'ADMIN_SUPPORT' 
                                            ? 'bg-white text-primary shadow-sm' 
                                            : 'text-white/60 hover:bg-white/5'
                                        }`}
                                    >
                                        Hỗ trợ
                                    </button>
                                )}
                                <button 
                                    onClick={() => setChannelType('INTERNAL_STAFF')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                        channelType === 'INTERNAL_STAFF' 
                                        ? 'bg-white text-primary shadow-sm' 
                                        : 'text-white/60 hover:bg-white/5'
                                    }`}
                                >
                                    Nội bộ
                                </button>
                                <button 
                                    onClick={() => setChannelType('CUSTOMER_CHAT')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                        channelType === 'CUSTOMER_CHAT' 
                                        ? 'bg-white text-primary shadow-sm' 
                                        : 'text-white/60 hover:bg-white/5'
                                    }`}
                                >
                                    Khách hàng
                                </button>
                                {isStaff && (
                                    <button 
                                        onClick={() => setChannelType('DIRECT')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                            channelType === 'DIRECT' 
                                            ? 'bg-white text-primary shadow-sm' 
                                            : 'text-white/60 hover:bg-white/5'
                                        }`}
                                    >
                                        Chủ Shop
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 flex flex-col min-h-0">
                            {channelType === 'CUSTOMER_CHAT' && !selectedCustomerEmail ? (
                                <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-slate-50/50 dark:bg-slate-900/50 scrollbar-hide">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Danh sách khách hàng</p>
                                    {customers.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic text-center py-10">
                                            {isStaff ? "Chưa có khách hàng được phân công" : "Chưa có khách hàng nào"}
                                        </p>
                                    ) : customers.map(c => (
                                        <button 
                                            key={c.email}
                                            onClick={() => {
                                                setSelectedCustomerEmail(c.email);
                                                setSelectedCustomerName(c.fullName);
                                            }}
                                            className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <MessageCircle size={20} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{c.fullName}</p>
                                                <p className="text-[10px] text-slate-500">{c.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <ConversationThread
                                    messages={messages}
                                    currentUserEmail={user?.email}
                                    connected={connected}
                                    input={input}
                                    setInput={setInput}
                                    onSendMessage={(msg, attachment) => sendMessage(msg, attachment)}
                                    hideHeader={true}
                                    disableInput={channelType === 'DIRECT' && !shopData?.email}
                                />
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
