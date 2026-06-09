import React from 'react';
import logo from '../assets/landing/logo.png';
export default function Logo({ className = '', lightText = false, forceWhite =false }: { className?: string, lightText?: boolean, forceWhite?: boolean }) {
    return (
        <div className={`flex items-center gap-3 group ${className}`}>
            <div className="w-10 h-10 md:w-11 md:h-11 overflow-hidden rounded-full flex items-center justify-center bg-white border border-slate-100 shadow-sm shrink-0">
                <img
                    src={logo}
                    alt="Peteye Logo Icon"
                    className="w-[120%] max-w-none object-contain translate-y-[8%]"
                />
            </div>
            <span className={`text-xl md:text-2xl font-black tracking-tight ${forceWhite ? 'text-white':( lightText ? 'bg-gradient-to-r from-white to-secondary bg-clip-text text-transparent' : 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent dark:from-white dark:to-secondary')}`}>
                PetEye
            </span>
        </div>
    );
}
