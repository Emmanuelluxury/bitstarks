'use client';

import { useEffect } from 'react';

interface NotificationProps {
  message: string;
  type: 'error' | 'success';
  isVisible: boolean;
  onHide: () => void;
}

export default function Notification({ message, type, isVisible, onHide }: NotificationProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div className={`notification ${type === 'error' ? 'error' : ''} ${isVisible ? 'show' : ''}`}>
      <i className={`fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
      <span>{message}</span>
    </div>
  );
}