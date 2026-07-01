import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
export const NotificationToast = () => {
    const [toasts, setToasts] = useState([]);
    // Toast Ekleme Fonksiyonu
    const addToast = (type, title, message) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, title, message }]);
        // 5 Saniye sonra otomatik kaldır
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    };
    // Toast Kaldırma
    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };
    useEffect(() => {
        // Global window nesnesine bagla (alert alternatifi olarak cagrilabilmesi icin)
        window.showToast = (type, title, message) => {
            addToast(type, title, message);
        };
        // Custom Event dinleyici (alternatif olarak event dispatch ile tetiklenebilmesi icin)
        const handleToastEvent = (e) => {
            const customEvent = e;
            if (customEvent.detail) {
                addToast(customEvent.detail.type, customEvent.detail.title, customEvent.detail.message);
            }
        };
        window.addEventListener('show-toast', handleToastEvent);
        // SSE ile Sunucu Canlı Bildirimlerini Dinleme
        let eventSource = null;
        const connectSSE = () => {
            eventSource = new EventSource('/api/v1/notifications/stream');
            eventSource.onmessage = (event) => {
                try {
                    const notification = JSON.parse(event.data);
                    if (notification && notification.title) {
                        addToast(notification.type || 'info', notification.title, notification.message || '');
                    }
                }
                catch (err) {
                    console.error('[SSE Notification] JSON parse error:', err);
                }
            };
            eventSource.onerror = (err) => {
                console.warn('[SSE Notification] Connection error, reconnecting in 5s...', err);
                if (eventSource) {
                    eventSource.close();
                }
                setTimeout(connectSSE, 5000);
            };
        };
        connectSSE();
        return () => {
            window.removeEventListener('show-toast', handleToastEvent);
            if (eventSource) {
                eventSource.close();
            }
        };
    }, []);
    // Icon maps for Toast
    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return (_jsx("svg", { className: "w-6 h-6 text-emerald-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }));
            case 'error':
                return (_jsx("svg", { className: "w-6 h-6 text-rose-500", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" }) }));
            case 'warning':
                return (_jsx("svg", { className: "w-6 h-6 text-amber-500", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }));
            default:
                return (_jsx("svg", { className: "w-6 h-6 text-cyan-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }));
        }
    };
    // Border and Shadow maps for premium neon / glassmorphic theme
    const getStyle = (type) => {
        switch (type) {
            case 'success':
                return 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-950/20';
            case 'error':
                return 'border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-rose-950/20';
            case 'warning':
                return 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-amber-950/20';
            default:
                return 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-cyan-950/20';
        }
    };
    return (_jsxs("div", { className: "fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none", children: [toasts.map((toast) => (_jsxs("div", { className: `flex items-start gap-4 p-4 rounded-xl border backdrop-blur-md pointer-events-auto transition-all duration-300 transform translate-y-0 animate-slide-in ${getStyle(toast.type)}`, style: {
                    animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }, children: [_jsx("div", { className: "flex-shrink-0 mt-0.5", children: getIcon(toast.type) }), _jsxs("div", { className: "flex-grow", children: [_jsx("h4", { className: "text-sm font-semibold text-white tracking-wide", children: toast.title }), _jsx("p", { className: "text-xs text-gray-300/80 mt-1 leading-relaxed", children: toast.message })] }), _jsx("button", { onClick: () => removeToast(toast.id), className: "flex-shrink-0 text-gray-400 hover:text-white transition-colors duration-200", children: _jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }, toast.id))), _jsx("style", { children: `
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateX(100px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      ` })] }));
};
