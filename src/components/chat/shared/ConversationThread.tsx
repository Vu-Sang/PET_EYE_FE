import React, { useRef, useEffect, useState } from 'react';
import { Send, Paperclip, MessageCircle, ChevronLeft, X, Image as ImageIcon, FileText, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ChatMessage } from '../../../services/admin.service';
import { fileService } from '../../../services/file.service';

export interface ConversationThreadProps {
    messages: ChatMessage[];
    currentUserEmail?: string;
    connected: boolean;
    onSendMessage: (msg: string, attachment?: { url: string; type: string; name: string }) => void;
    input: string;
    setInput: (val: string) => void;
    headerInfo?: {
        title: string;
        subtitle?: string;
        icon?: React.ReactNode;
        showStatus?: boolean;
    };
    onBack?: () => void;
    placeholder?: string;
    disableInput?: boolean;
    hideHeader?: boolean;
    containerClassName?: string;
    loading?: boolean;
    isDark?: boolean;
    isTyping?: { typing: boolean, senderEmail?: string };
    onTyping?: (typing: boolean) => void;
}

export default function ConversationThread({
    messages,
    currentUserEmail,
    connected,
    onSendMessage,
    input,
    setInput,
    headerInfo,
    onBack,
    placeholder = "Nhập nội dung tin nhắn...",
    disableInput = false,
    hideHeader = false,
    containerClassName = "",
    loading = false,
    isDark = false,
    isTyping,
    onTyping
}: ConversationThreadProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [pendingFile, setPendingFile] = useState<{ file: File; previewUrl?: string } | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        if (containerRef.current) {
            const scrollContainer = containerRef.current;
            if (isFirstLoad.current && messages.length > 0) {
                // Instant scroll for initial history load
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
                isFirstLoad.current = false;
            } else {
                // Smooth scroll for new messages
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, [messages, isTyping?.typing]);

    // Handle typing debounce
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleInputChange = (val: string) => {
        setInput(val);
        if (onTyping) {
            onTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit 10MB
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Dung lượng file tối đa là 10MB');
            e.target.value = '';
            return;
        }

        const isImage = file.type.startsWith('image/');
        const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
        setPendingFile({ file, previewUrl });

        // Reset file input so user can re-select same file
        e.target.value = '';
    };

    const cancelPendingFile = () => {
        if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
        setPendingFile(null);
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (disableInput || !connected) return;

        if (pendingFile) {
            setUploading(true);
            try {
                const url = await fileService.upload(pendingFile.file);
                const isImage = pendingFile.file.type.startsWith('image/');
                const attachmentType = isImage ? 'IMAGE' : 'FILE';
                onSendMessage(input.trim() || '', {
                    url,
                    type: attachmentType,
                    name: pendingFile.file.name,
                });
                setInput('');
                cancelPendingFile();
            } catch {
                // If upload fails, keep the pending file so user can retry
            } finally {
                setUploading(false);
            }
            return;
        }

        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    const getFileExtension = (name: string) => {
        const ext = name.split('.').pop()?.toUpperCase() || '';
        return ext;
    };

    const renderAttachment = (msg: ChatMessage, isMe: boolean) => {
        if (!msg.attachmentUrl) return null;

        if (msg.attachmentType === 'IMAGE') {
            return (
                <div className="mt-2 -mx-1">
                    <img
                        src={msg.attachmentUrl}
                        alt={msg.attachmentName || 'Ảnh đính kèm'}
                        className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity max-h-[240px] object-cover border border-white/10"
                        onClick={() => setLightboxUrl(msg.attachmentUrl!)}
                        loading="lazy"
                    />
                </div>
            );
        }

        // File attachment
        return (
            <a
                href={msg.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md ${
                    isMe
                        ? 'bg-white/10 border-white/20 hover:bg-white/20'
                        : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600/50'
                }`}
            >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isMe ? 'bg-white/20' : 'bg-primary/10'
                }`}>
                    <FileText size={18} className={isMe ? 'text-white' : 'text-primary'} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isMe ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                        {msg.attachmentName || 'Tệp đính kèm'}
                    </p>
                    <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
                        {getFileExtension(msg.attachmentName || '')} File
                    </p>
                </div>
                <Download size={14} className={`shrink-0 ${isMe ? 'text-white/60' : 'text-slate-400'}`} />
            </a>
        );
    };

    return (
        <div className={`flex flex-col h-full relative ${containerClassName}`} style={{ backgroundColor: 'var(--conv-bg, inherit)' }}>
            {/* Header */}
            {!hideHeader && headerInfo && (
                <div className={`flex items-center justify-between px-6 py-4 border-b backdrop-blur-md sticky top-0 z-10 shrink-0 border-slate-100 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80`}>
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        {headerInfo.icon && (
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                {headerInfo.icon}
                            </div>
                        )}
                        <div>
                            <h2 className={`font-bold text-base leading-tight text-slate-900 dark:text-white`}>
                                {headerInfo.title}
                            </h2>
                            {headerInfo.subtitle && (
                                <p className="text-xs text-slate-500 mt-0.5">{headerInfo.subtitle}</p>
                            )}
                            {headerInfo.showStatus !== false && (
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {connected ? 'Trực tuyến' : 'Ngoại tuyến'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div 
                ref={containerRef}
                className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide relative"
            >
                {loading ? (
                    <div className={`absolute inset-0 flex flex-col items-center justify-center backdrop-blur-[2px] z-20 bg-white/50 dark:bg-slate-900/50`}>
                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải tin nhắn...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-slate-50 dark:bg-slate-800/50`}>
                            <MessageCircle size={32} className="opacity-20 text-slate-500" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.1em] opacity-50">Bắt đầu trò chuyện</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.senderEmail === currentUserEmail;
                        const senderNameMap: Record<string, string> = {
                            'ADMIN': 'Hệ thống',
                            'SHOP_OWNER': 'Chủ Shop',
                            'STAFF': 'Nhân viên',
                            'USER': 'Khách hàng'
                        };
                        const senderDisplay = senderNameMap[msg.senderRole] || 'Người dùng';

                        return (
                            <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex flex-col gap-1.5 max-w-[85%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    {!isMe && (
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">
                                            {senderDisplay}
                                        </span>
                                    )}
                                    <div className={`px-4 sm:px-5 py-3 text-sm leading-relaxed shadow-sm break-words
                                        ${isMe
                                            ? 'bg-primary text-white rounded-2xl rounded-br-none shadow-primary/10'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700'
                                        }`}>
                                        {msg.content && <span className="whitespace-pre-wrap block">{msg.content}</span>}
                                        {renderAttachment(msg, isMe)}
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 px-2 uppercase tracking-tight">
                                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Typing Indicator */}
                {isTyping?.typing && (
                    <div className="flex justify-start">
                        <div className="flex flex-col gap-1.5 max-w-[85%] sm:max-w-[70%] items-start">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">
                                Đối phương đang soạn tin nhắn
                            </span>
                            <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Pending File Preview */}
            {pendingFile && (
                <div className={`px-4 sm:px-6 pt-3 pb-1 border-t shrink-0 bg-white dark:bg-slate-900/95 border-slate-100 dark:border-slate-700`}>
                    <div className={`flex items-center gap-3 p-3 rounded-2xl border bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700`}>
                        {pendingFile.previewUrl ? (
                            <img src={pendingFile.previewUrl} alt="Preview" className={`w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-600`} />
                        ) : (
                            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                                <FileText size={22} className="text-primary" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate text-slate-800 dark:text-white`}>{pendingFile.file.name}</p>
                            <p className="text-[10px] text-slate-400">{(pendingFile.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                            onClick={cancelPendingFile}
                            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-700`}
                        >
                            <X size={16} className="text-slate-400" />
                        </button>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className={`p-4 sm:p-6 backdrop-blur-md border-t shrink-0 relative bg-white/80 dark:bg-slate-900/80 border-slate-100 dark:border-slate-700`}>
                {!connected && (
                    <div className="absolute inset-x-0 -top-6 flex justify-center z-20">
                        <span className="px-4 py-1 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg animate-pulse">
                            Mất kết nối - Đang thử lại...
                        </span>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <form onSubmit={handleSend} className={`flex items-center gap-3 rounded-full p-1.5 pl-4 sm:pl-6 shadow-inner focus-within:ring-2 focus-within:ring-primary/10 transition-all bg-slate-50 dark:bg-slate-800`}>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || disableInput}
                        className="text-slate-400 hover:text-primary transition-colors disabled:opacity-40"
                        title="Đính kèm file"
                    >
                        <Paperclip size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (fileInputRef.current) {
                                fileInputRef.current.accept = 'image/*';
                                fileInputRef.current.click();
                                // Reset accept after a tick so subsequent clicks allow all files
                                setTimeout(() => {
                                    if (fileInputRef.current) fileInputRef.current.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt';
                                }, 100);
                            }
                        }}
                        disabled={uploading || disableInput}
                        className="hidden sm:block text-slate-400 hover:text-primary transition-colors disabled:opacity-40"
                        title="Gửi hình ảnh"
                    >
                        <ImageIcon size={20} />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder={pendingFile ? "Thêm ghi chú (tuỳ chọn)..." : placeholder}
                        disabled={disableInput}
                        className={`flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-slate-400 py-2 sm:py-3 outline-none min-w-0 text-slate-900 dark:text-white`}
                    />
                    <button
                        type="submit"
                        disabled={(!input.trim() && !pendingFile) || !connected || disableInput || uploading}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex shrink-0 items-center justify-center transition-all ${
                            (input.trim() || pendingFile) && connected && !disableInput && !uploading
                            ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                        }`}
                    >
                        {uploading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Send size={18} className={(input.trim() || pendingFile) && connected && !disableInput ? 'translate-x-0.5 -translate-y-0.5' : ''} />
                        )}
                    </button>
                </form>
            </div>

            {/* Image Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        onClick={() => setLightboxUrl(null)}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={lightboxUrl}
                        alt="Phóng to"
                        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
