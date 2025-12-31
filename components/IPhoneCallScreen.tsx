import React, { useState } from 'react';
import IPhoneFrame from './IPhoneFrame';
import IOSCallButton from './IOSCallButton';
import Visualizer from './Visualizer';
import IPhoneSMSNotification from './IPhoneSMSNotification';
import {
  KeypadIcon,
  SpeakerIcon,
  SpeakerMutedIcon,
  AddCallIcon,
  FaceTimeIcon,
  ContactsIcon,
  MicIcon,
  MicSlashIcon,
  PhoneXMarkIcon,
} from './ios-icons';

// Phone icon for "Start New Call" button
const PhoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5z" clipRule="evenodd" />
  </svg>
);

interface IPhoneCallScreenProps {
  // Visualizer
  inputVolume: number;
  outputVolume: number;
  isActive: boolean;

  // State
  isConnected: boolean;
  isMuted: boolean;
  isSpeakerOn?: boolean;
  callDuration?: number;
  contactName?: string;
  hasCallEnded?: boolean;

  // SMS Notification
  smsMessage?: string;
  smsVisible?: boolean;
  onSMSDismiss?: () => void;

  // Handlers
  onMute: () => void;
  onEndCall: () => void;
  onSpeaker?: () => void;
  onStartNewCall?: () => void;
}

const IPhoneCallScreen: React.FC<IPhoneCallScreenProps> = ({
  inputVolume,
  outputVolume,
  isActive,
  isConnected,
  isMuted,
  isSpeakerOn: externalSpeakerOn,
  callDuration,
  contactName = 'Outbound Call',
  hasCallEnded = false,
  smsMessage,
  smsVisible = false,
  onSMSDismiss,
  onMute,
  onEndCall,
  onSpeaker,
  onStartNewCall,
}) => {
  // Internal speaker state if not controlled externally
  const [internalSpeakerOn, setInternalSpeakerOn] = useState(false);
  const isSpeakerOn = externalSpeakerOn !== undefined ? externalSpeakerOn : internalSpeakerOn;

  const handleSpeaker = () => {
    if (onSpeaker) {
      onSpeaker();
    } else {
      setInternalSpeakerOn(!internalSpeakerOn);
    }
  };

  // Format call duration (if provided) - rounds up to whole seconds
  const formatDuration = (seconds?: number): string => {
    if (seconds === undefined) return '';
    const totalSeconds = Math.ceil(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <IPhoneFrame>
      {/* iPhone Screen Content */}
      <div className="w-full h-full flex flex-col relative" style={{ background: '#000' }}>

        {/* SMS Notification */}
        {smsVisible && smsMessage && (
          <IPhoneSMSNotification
            message={smsMessage}
            senderName="Jefferson Dental"
            onDismiss={onSMSDismiss}
            autoDismiss={false}
            dismissDelay={0}
          />
        )}

        {/* Call Ended Overlay */}
        {hasCallEnded && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-5 px-7">
            <div className="text-center space-y-4">
              <div className="w-18 h-18 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                <PhoneXMarkIcon className="w-9 h-9 text-red-500" />
              </div>
              <h3 className="text-white text-xl font-semibold">Call Ended</h3>
              <p className="text-gray-400 text-sm">
                {callDuration !== undefined
                  ? `Duration: ${formatDuration(callDuration)}`
                  : 'The call has been disconnected'}
              </p>
            </div>
            {onStartNewCall && (
              <button
                onClick={onStartNewCall}
                className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30"
              >
                <PhoneIcon className="w-5 h-5" />
                <span>Start New Call</span>
              </button>
            )}
          </div>
        )}

        {/* Top Section - Contact Info */}
        <div className="flex flex-col items-center justify-center pt-14 pb-4" style={{ height: '90px' }}>
          <h2 className="text-white text-lg font-medium tracking-wide">
            {contactName}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {callDuration !== undefined ? formatDuration(callDuration) : 'Jefferson Dental'}
          </p>
        </div>

        {/* Middle Section - Visualizer */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div style={{ width: '288px', height: '288px' }}>
            <Visualizer
              inputVolume={inputVolume}
              outputVolume={outputVolume}
              isActive={isActive}
            />
          </div>
        </div>

        {/* Bottom Section - iOS Call Controls */}
        <div className="pb-7 px-7">
          {/* Button Grid - Row 1 */}
          <div className="grid grid-cols-3 gap-5 mb-5 justify-items-center">
            <IOSCallButton
              icon={isMuted ? <MicSlashIcon /> : <MicIcon />}
              label="mute"
              onClick={onMute}
              isActive={isMuted}
            />
            <IOSCallButton
              icon={<KeypadIcon />}
              label="keypad"
              disabled={true}
            />
            <IOSCallButton
              icon={isSpeakerOn ? <SpeakerIcon /> : <SpeakerMutedIcon />}
              label="speaker"
              onClick={handleSpeaker}
              isActive={isSpeakerOn}
            />
          </div>

          {/* Button Grid - Row 2 */}
          <div className="grid grid-cols-3 gap-5 mb-5 justify-items-center">
            <IOSCallButton
              icon={<AddCallIcon />}
              label="add call"
              disabled={true}
            />
            <IOSCallButton
              icon={<FaceTimeIcon />}
              label="FaceTime"
              disabled={true}
            />
            <IOSCallButton
              icon={<ContactsIcon />}
              label="contacts"
              disabled={true}
            />
          </div>

          {/* End Call Button - Full Width */}
          <div className="flex justify-center mt-7">
            <button
              onClick={onEndCall}
              className="flex items-center justify-center gap-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                width: '65px',
                height: '65px',
                background: '#ff3b30',
                boxShadow: '0 4px 12px rgba(255, 59, 48, 0.4)',
              }}
              aria-label="End Call"
            >
              <PhoneXMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    </IPhoneFrame>
  );
};

export default IPhoneCallScreen;
