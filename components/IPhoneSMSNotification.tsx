import React, { useEffect, useState } from 'react';

interface IPhoneSMSNotificationProps {
  message: string;
  senderName?: string;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  dismissDelay?: number;
}

const IPhoneSMSNotification: React.FC<IPhoneSMSNotificationProps> = ({
  message,
  senderName = 'Jefferson Dental',
  onDismiss,
  autoDismiss = true,
  dismissDelay = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset to collapsed state whenever a new message arrives
  useEffect(() => {
    setIsExpanded(false);
    setIsExiting(false);
  }, [message]);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 100);

    // Auto dismiss banner (only if not expanded and autoDismiss is enabled)
    if (autoDismiss && !isExpanded) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, dismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, dismissDelay, isExpanded]);

  const handleBannerClick = () => {
    // Expand to show full message
    setIsExpanded(true);
  };

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExpanded(false);
      onDismiss?.();
    }, 300);
  };

  // Get message preview (first 50 characters)
  const messagePreview = message.length > 50
    ? message.substring(0, 50) + '...'
    : message;

  return (
    <div
      className={`absolute top-0 left-0 right-0 z-[100] px-2 transition-all duration-300 ${
        isVisible && !isExiting
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-full'
      }`}
      style={{ paddingTop: isExpanded ? '12px' : '12px' }}
    >
      {!isExpanded ? (
        /* COMPACT BANNER MODE - iOS Style */
        <div
          className="mx-auto rounded-xl overflow-hidden shadow-lg backdrop-blur-xl cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all"
          style={{
            maxWidth: '360px',
            background: 'rgba(255, 255, 255, 0.92)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          }}
          onClick={handleBannerClick}
        >
          {/* Compact Banner */}
          <div className="flex items-start gap-2.5 px-3 py-2.5">
            {/* Messages App Icon */}
            <div
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
              style={{
                background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
              }}
            >
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>

            {/* Message Info */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-semibold text-xs text-black">Messages</span>
                <span className="text-xs text-gray-500 flex-shrink-0">now</span>
              </div>
              <div className="text-xs text-gray-700 font-medium mb-0.5">{senderName}</div>
              <div className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{messagePreview}</div>
            </div>
          </div>
        </div>
      ) : (
        /* EXPANDED MESSAGE MODE */
        <div
          className="mx-auto rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl"
          style={{
            maxWidth: '360px',
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Expanded Header */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            {/* Messages App Icon */}
            <div
              className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
              }}
            >
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>

            {/* Sender Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="font-semibold text-sm text-black truncate">
                  Messages
                </span>
              </div>
              <div className="text-xs text-gray-500 truncate">{senderName}</div>
            </div>

            {/* Time */}
            <div className="text-xs text-gray-500">
              now
            </div>
          </div>

          {/* Full Message Content */}
          <div className="px-4 pb-3 max-h-96 overflow-y-auto">
            <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
              {message}
            </p>
          </div>

          {/* Bottom accent bar */}
          <div
            className="h-1"
            style={{
              background: 'linear-gradient(to right, rgba(52, 199, 89, 0.3), rgba(48, 209, 88, 0.3))',
            }}
          />

          {/* Dismiss button */}
          <div className="text-center py-2 bg-white/50">
            <button
              onClick={handleDismiss}
              className="text-xs text-blue-600 font-medium hover:text-blue-700 active:text-blue-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default IPhoneSMSNotification;
