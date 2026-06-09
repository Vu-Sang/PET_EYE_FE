import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6';

export default function Footer() {
    return (
        <footer className="bg-[#0b1b36] text-white pt-16 pb-6 mt-auto">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Cột 1: Brand & Socials */}
                    <div className="space-y-6">
                        <Link to="/" className="inline-block mb-3"><Logo lightText /></Link>
                        <p className="text-sm text-slate-300 leading-relaxed pr-4">
                            Nền tảng kết nối chủ nuôi với các dịch vụ chăm sóc thú cưng đáng tin cậy
                        </p>
                        <div className="flex items-center gap-3">
                            <a href="https://web.facebook.com/profile.php?id=61590306674838" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors text-slate-300 hover:text-white">
                                <FaFacebookF size={16} />
                            </a>
                            <a href="#" className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors text-slate-300 hover:text-white">
                                <FaInstagram size={18} />
                            </a>
                            <a href="#" className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors text-slate-300 hover:text-white">
                                <FaTiktok size={16} />
                            </a>
                        </div>
                    </div>

                    {/* Cột 2: Dịch vụ */}
                    <div className="lg:pl-8">
                        <h5 className="font-bold mb-6 text-base tracking-wide">Dịch vụ</h5>
                        <ul className="space-y-3.5 text-sm text-slate-300">
                            <li><Link className="hover:text-white transition-colors" to="/search?type=CLINIC">Khám chữa bệnh</Link></li>
                            <li><Link className="hover:text-white transition-colors" to="/search?type=HOTEL">Dịch vụ lưu trú</Link></li>
                            <li><Link className="hover:text-white transition-colors" to="/search?type=SPA">Spa &amp; Grooming</Link></li>
                        </ul>
                    </div>

                    {/* Cột 3: Về PetEye */}
                    <div>
                        <h5 className="font-bold mb-6 text-base tracking-wide">Về PetEye</h5>
                        <ul className="space-y-3.5 text-sm text-slate-300">
                            <li><Link className="hover:text-white transition-colors" to="/about#story">Câu chuyện thương hiệu</Link></li>
                            <li><Link className="hover:text-white transition-colors" to="/about#partner">Trở thành đối tác</Link></li>
                            <li><Link className="hover:text-white transition-colors" to="/about#news">Tin tức &amp; Sự kiện</Link></li>
                        </ul>
                    </div>

                    {/* Cột 4: Liên hệ */}
                    <div>
                        <h5 className="font-bold mb-6 text-base tracking-wide">Liên hệ</h5>
                        <ul className="space-y-4 text-sm text-slate-300">
                            <li className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">location_on</span>
                                <span className="leading-snug">Tầng 12, Tòa nhà Innovation, Quận 1, TP. Hồ Chí Minh</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[20px] shrink-0">call</span>
                                <span>1900 1234 (8:00 - 22:00)</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[20px] shrink-0">mail</span>
                                <span>peteye.contact26@gmail.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-slate-800/80 mt-16 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[13px] text-slate-400">
                    <p>© 2026 PetEye Platform. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link className="hover:text-white transition-colors" to="/terms">Điều khoản sử dụng</Link>
                        <Link className="hover:text-white transition-colors" to="/privacy">Chính sách bảo mật</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

