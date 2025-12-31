import { useState, useRef, useCallback, useEffect } from 'react';
import { VolumeLevel, VoiceProvider, ProviderConfig } from '../types';
import { createVoiceProvider } from '../providers/provider-factory';
import { GEMINI_MODEL, OPENAI_MODEL, GEMINI_VOICE, OPENAI_VOICE } from '../constants';
import { decodeAudioData } from '../utils/audio-utils';
import { PromptBuilder } from '../utils/prompt-builder';
import { CRMService } from '../services/crm-service';
import type { PatientRecord } from '../database/db-interface';
import type { DemoConfig } from '../types/demo-config';

export interface AudioDevice {
  deviceId: string;
  label: string;
  isDefault: boolean;
}

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date; // Last updated time (for UI staleness tracking)
  createdAt: Date; // Immutable creation time (used for ordering)
  sequenceNumber: number; // Monotonic sequence for guaranteed ordering
  isPartial: boolean;
  responseId?: string;
  itemId?: string;
}

export interface FunctionCallItem {
  id: string;
  type: 'function_call';
  callId: string;
  functionName: string;
  arguments: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
  executionTimeMs?: number;
  errorMessage?: string;
  timestamp: Date; // Last updated time
  createdAt: Date; // Immutable creation time (used for ordering)
  sequenceNumber: number; // Monotonic sequence for guaranteed ordering
}

export type TranscriptItem = TranscriptMessage | FunctionCallItem;

export const useLiveSession = (
  provider: VoiceProvider = 'openai',
  selectedPatientId?: string | null,
  dbAdapter?: any,
  onToolSystemMode?: (mode: string) => void,
  demoConfig?: DemoConfig | null
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState<VolumeLevel>({ input: 0, output: 0 });
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);
  const [toolSystemMode, setToolSystemMode] = useState<string>('unknown');
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isSecureContext, setIsSecureContext] = useState<boolean>(true);

  // Use ref to keep dbAdapter current (fixes stale closure issue)
  const dbAdapterRef = useRef(dbAdapter);
  useEffect(() => {
    dbAdapterRef.current = dbAdapter;
  }, [dbAdapter]);

  // Audio Contexts and Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);

  // Background Noise Element
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Queue Management
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Track audio buffer lead time for transcript sync
  const audioLeadTimeRef = useRef<number>(0);

  // Track delta counts per response for spreading out display timing
  const deltaCounterRef = useRef<Map<string, number>>(new Map());

  // Provider Management
  const voiceProviderRef = useRef<any>(null);
  const isMutedRef = useRef(false);

  // Sequence Counter for guaranteed ordering (monotonic, never resets during session)
  const sequenceCounterRef = useRef<number>(0);
  const getNextSequence = useCallback(() => {
    sequenceCounterRef.current += 1;
    return sequenceCounterRef.current;
  }, []);

  const toggleMute = useCallback(() => {
    const newState = !isMutedRef.current;
    isMutedRef.current = newState;
    setIsMuted(newState);
  }, []);

  // Enumerate available audio input devices
  const enumerateAudioDevices = useCallback(async () => {
    try {
      // Check if mediaDevices is available (requires secure context: HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('🎤 Media devices not available - requires HTTPS or localhost');
        setIsSecureContext(false);
        return [];
      }

      // First request permission to get device labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
          isDefault: device.deviceId === 'default' || index === 0
        }));

      console.log('🎤 Available audio devices:', audioInputs);
      setAudioDevices(audioInputs);

      // Auto-select first device if none selected
      if (!selectedDeviceId && audioInputs.length > 0) {
        // Try to find a non-default device (often the actual hardware mic)
        const nonDefaultDevice = audioInputs.find(d => d.deviceId !== 'default');
        const deviceToSelect = nonDefaultDevice || audioInputs[0];
        setSelectedDeviceId(deviceToSelect.deviceId);
        console.log('🎤 Auto-selected device:', deviceToSelect.label);
      }

      return audioInputs;
    } catch (err) {
      console.error('Failed to enumerate audio devices:', err);
      return [];
    }
  }, [selectedDeviceId]);

  // Enumerate devices on mount
  useEffect(() => {
    enumerateAudioDevices();
  }, []);

  const stopBackgroundNoise = useCallback(() => {
    if (backgroundAudioRef.current) {
        console.log("Stopping background ambience");
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current.currentTime = 0;
        backgroundAudioRef.current = null;
    }
  }, []);

  const playOfficeAmbience = useCallback(() => {
    try {
        console.log("Initializing background ambience...");
        // Disable background audio for now to avoid CORS/loading issues
        // You can add a local audio file later if needed
        console.log("⏭️  Background audio skipped (not required for voice agent)");
        return;

        // Commented out external audio source
        // const audio = new Audio('https://actions.google.com/sounds/v1/ambiences/office_setting.ogg');
        // backgroundAudioRef.current = audio;
        // audio.loop = true;
        // audio.volume = 0.5;
        // audio.preload = 'auto';
        // const playPromise = audio.play();
    } catch (e) {
        console.error("Failed to setup background noise", e);
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    stopBackgroundNoise();

    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    sourcesRef.current.clear();

    // Close contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Reset refs
    inputSourceRef.current = null;
    processorRef.current = null;
    outputNodeRef.current = null;
    nextStartTimeRef.current = 0;
  }, [stopBackgroundNoise]);

  const disconnect = useCallback(async () => {
    if (voiceProviderRef.current) {
      await voiceProviderRef.current.disconnect();
      voiceProviderRef.current = null;
    }

    cleanupAudio();
    setIsConnected(false);
    setIsMuted(false);
    isMutedRef.current = false;
    setVolumeLevel({ input: 0, output: 0 });
  }, [cleanupAudio]);

  const handleTranscript = useCallback((role: 'user' | 'assistant', text: string, speechStartTime?: Date, responseId?: string) => {
    // Clear the delta counter for this response since we're finalizing it
    if (responseId) {
      const deltaCount = deltaCounterRef.current.get(responseId) || 0;
      deltaCounterRef.current.delete(responseId);
      console.log(`📝 handleTranscript: cleared ${deltaCount} deltas for responseId=${responseId}`);
    }

    // Capture the current audio lead time to delay transcript completion
    // This ensures the "complete" marker only appears after audio finishes
    const delayMs = Math.round(audioLeadTimeRef.current * 1000);
    console.log(`📝 handleTranscript called: role=${role}, responseId=${responseId}, delay=${delayMs}ms, textLength=${text.length}`);

    const updateTranscript = () => {
      setTranscriptItems(prev => {
        // First: Check if we already have a complete entry with this responseId (avoid duplicates)
        if (responseId) {
          const existingComplete = prev.find(
            item =>
              !('type' in item) &&
              (item as TranscriptMessage).responseId === responseId &&
              !(item as TranscriptMessage).isPartial
          );
          if (existingComplete) {
            console.log(`📝 Skipping duplicate complete transcript for responseId=${responseId}`);
            return prev; // Already have complete entry, skip
          }
        }

        // Second: Find partial transcript by responseId (preferred) or role (fallback)
        let partialIndex = -1;
        if (responseId) {
          partialIndex = prev.findIndex(
            item =>
              !('type' in item) &&
              (item as TranscriptMessage).responseId === responseId &&
              (item as TranscriptMessage).isPartial
          );
        }
        // Fallback: find by role only (for backwards compatibility)
        if (partialIndex === -1) {
          partialIndex = prev.findIndex(
            item =>
              !('type' in item) &&
              (item as TranscriptMessage).role === role &&
              (item as TranscriptMessage).isPartial
          );
        }

        if (partialIndex !== -1) {
          // Replace partial with complete version
          // CRITICAL: Preserve original createdAt and sequenceNumber to maintain ordering
          const updated = [...prev];
          const partial = updated[partialIndex] as TranscriptMessage;
          updated[partialIndex] = {
            ...partial,
            text, // Use complete text from API
            isPartial: false,
            timestamp: new Date(), // Update "last modified" time
            responseId: responseId || partial.responseId, // Ensure responseId is set
            // createdAt and sequenceNumber are preserved from partial
          };
          console.log(`📝 Partial transcript updated to complete for responseId=${responseId}`);
          return updated;
        } else {
          // No partial exists, create new complete message
          const now = new Date();
          const actualSpeechTime = speechStartTime || now; // Use provider's timestamp if available
          const message: TranscriptMessage = {
            id: responseId || Date.now().toString() + Math.random(),
            role,
            text,
            timestamp: now, // Display timestamp (when we received it)
            createdAt: actualSpeechTime, // CRITICAL: Use actual speech start time for ordering
            sequenceNumber: getNextSequence(), // Monotonic sequence for ordering (fallback only)
            isPartial: false,
            responseId
          };
          console.log(`📝 Complete transcript created: ${role} at ${actualSpeechTime.toISOString()}, seq=${message.sequenceNumber}`);
          return [...prev, message];
        }
      });
    };

    // Delay the complete transcript update to sync with audio playback
    if (delayMs > 0) {
      setTimeout(updateTranscript, delayMs);
    } else {
      updateTranscript();
    }
  }, [getNextSequence]);

  const handleTranscriptDelta = useCallback((
    role: 'user' | 'assistant',
    delta: string,
    responseId: string,
    itemId?: string,
    speechStartTime?: Date
  ) => {
    // Track delta count for this response to spread out display timing
    const currentCount = deltaCounterRef.current.get(responseId) || 0;
    deltaCounterRef.current.set(responseId, currentCount + 1);

    // Base delay from audio lead time + incremental delay per delta (60ms per word)
    // This spreads out word display even when multiple deltas arrive at the same time
    const baseDelayMs = Math.round(audioLeadTimeRef.current * 1000);
    const incrementalDelayMs = currentCount * 60; // 60ms per word for natural pacing
    const delayMs = baseDelayMs + incrementalDelayMs;
    console.log(`📝 handleTranscriptDelta called: role=${role}, delta="${delta}", responseId=${responseId}, baseDelay=${baseDelayMs}ms, increment=${incrementalDelayMs}ms, totalDelay=${delayMs}ms`);

    const updateTranscript = () => {
      setTranscriptItems(prev => {
        // First: Check if we already have a COMPLETE entry for this responseId
        // This can happen if the complete callback arrived before this delayed delta
        const existingComplete = prev.find(
          item =>
            !('type' in item) &&
            (item as TranscriptMessage).responseId === responseId &&
            !(item as TranscriptMessage).isPartial
        );
        if (existingComplete) {
          // Already have complete entry, skip this delayed delta
          return prev;
        }

        // Find existing partial transcript with matching responseId
        const existingIndex = prev.findIndex(
          item =>
            !('type' in item) &&
            (item as TranscriptMessage).responseId === responseId &&
            (item as TranscriptMessage).isPartial
        );

        if (existingIndex !== -1) {
          // Update existing partial transcript
          const updated = [...prev];
          const existing = updated[existingIndex] as TranscriptMessage;
          updated[existingIndex] = {
            ...existing,
            text: existing.text + delta,
            timestamp: new Date(), // Update "last modified" time for UI staleness tracking
            // CRITICAL: Do NOT modify createdAt or sequenceNumber - they must remain immutable
          };
          return updated;
        } else {
          // Create new partial transcript
          const now = new Date();
          const actualSpeechTime = speechStartTime || now; // Use provider's timestamp if available
          const newMessage: TranscriptMessage = {
            id: responseId,
            role,
            text: delta,
            timestamp: now, // Display timestamp (when we received it)
            createdAt: actualSpeechTime, // CRITICAL: Use actual speech start time for ordering
            sequenceNumber: getNextSequence(), // Monotonic sequence - locked at creation (fallback only)
            isPartial: true,
            responseId,
            itemId
          };
          console.log(`📝 Partial transcript created: ${role} at ${actualSpeechTime.toISOString()}, seq=${newMessage.sequenceNumber}`);
          return [...prev, newMessage];
        }
      });
    };

    // Delay transcript update to sync with audio playback
    if (delayMs > 0) {
      setTimeout(updateTranscript, delayMs);
    } else {
      updateTranscript();
    }
  }, [getNextSequence]);

  const handleFunctionCall = useCallback((callId: string, functionName: string, args: any) => {
    console.log('🎯 handleFunctionCall CALLED:', { callId, functionName, args });
    const now = new Date();
    const item: FunctionCallItem = {
      id: callId,
      type: 'function_call',
      callId,
      functionName,
      arguments: args,
      status: 'pending',
      timestamp: now,
      createdAt: now, // Immutable creation time
      sequenceNumber: getNextSequence() // Monotonic sequence for ordering
    };
    console.log('🎯 Adding function call item to transcript:', item);
    setTranscriptItems(prev => {
      console.log('🎯 Previous transcript items:', prev.length);
      const updated = [...prev, item];
      console.log('🎯 Updated transcript items:', updated.length);
      return updated;
    });
  }, [getNextSequence]);

  const handleFunctionResult = useCallback((
    callId: string,
    functionName: string,
    result: any,
    executionTimeMs: number,
    status: 'success' | 'error',
    errorMessage?: string
  ) => {
    console.log('🎯 handleFunctionResult CALLED:', { callId, functionName, status, result });
    setTranscriptItems(prev => {
      console.log('🎯 Updating function result in', prev.length, 'items');
      const updated = prev.map(item => {
        if ('type' in item && item.type === 'function_call' && item.callId === callId) {
          console.log('🎯 Found matching function call item, updating with result');
          return {
            ...item,
            result,
            status,
            executionTimeMs,
            errorMessage,
            timestamp: new Date(), // Update "last modified" time
            // CRITICAL: createdAt and sequenceNumber are preserved from original
          };
        }
        return item;
      });
      console.log('🎯 Updated transcript with result:', updated.length);
      return updated;
    });
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscriptItems([]);
    sequenceCounterRef.current = 0; // Reset sequence counter for new session
  }, []);

  const connect = useCallback(async () => {
    console.log('🔌 CONNECT CALLBACK CALLED');
    console.log('📊 dbAdapter status:', dbAdapter ? 'AVAILABLE ✅' : 'NULL ❌');

    // Start Background Noise IMMEDIATELY to capture user gesture
    playOfficeAmbience();
    setError(null);
    setIsLoadingPatient(true);

    try {
      // Fetch patient data from browser database
      let patientData: PatientRecord | null = null;
      if (selectedPatientId) {
        console.log(`🔍 Loading patient data for ID: ${selectedPatientId}`);
        console.log('📊 Creating CRMService with dbAdapter:', dbAdapter ? 'AVAILABLE' : 'NULL');
        const crmService = new CRMService(dbAdapter);
        patientData = await crmService.getPatientById(selectedPatientId);

        if (patientData) {
          console.log(`✅ Patient loaded: ${patientData.parentName}`);
          setPatient(patientData);
        } else {
          console.log(`⚠️  No patient found for ID: ${selectedPatientId}`);
        }
      } else {
        // No patient selected - use generic/fallback prompt
        console.log('📝 No patient selected, using fallback prompt');
        patientData = null;
      }

      setIsLoadingPatient(false);

      // Get API key based on provider
      const apiKey = provider === 'openai'
        ? process.env.OPENAI_API_KEY
        : process.env.API_KEY;

      console.log(`🔑 API Key check for ${provider}:`, apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'MISSING');

      if (!apiKey) {
        throw new Error(`${provider.toUpperCase()} API Key not found in environment variables`);
      }

      // Initialize Audio Contexts
      // For OpenAI: 24kHz for both input and output (they handle resampling)
      // For Gemini: 16kHz input, 24kHz output
      const inputSampleRate = provider === 'openai' ? 24000 : 16000;
      const outputSampleRate = 24000;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: inputSampleRate
      });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: outputSampleRate
      });

      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      await outputCtx.resume();

      // Output Node
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      outputNodeRef.current = outputNode;

      // Microphone Stream
      console.log('🌐 Current URL:', window.location.href);
      console.log('🔒 Is secure context:', window.isSecureContext);
      console.log('🧭 Navigator exists:', typeof navigator !== 'undefined');
      console.log('📱 MediaDevices exists:', typeof navigator?.mediaDevices !== 'undefined');
      console.log('🎤 getUserMedia exists:', typeof navigator?.mediaDevices?.getUserMedia !== 'undefined');

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error(
          `getUserMedia not available. ` +
          `URL: ${window.location.href}, ` +
          `Secure: ${window.isSecureContext}, ` +
          `MediaDevices: ${typeof navigator?.mediaDevices}`
        );
      }

      console.log('🎤 Requesting microphone access with sample rate:', inputSampleRate);
      console.log('🎤 Using device ID:', selectedDeviceId || 'default');

      // Build audio constraints with device selection
      const audioConstraints: MediaTrackConstraints = {
        sampleRate: inputSampleRate,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

      // Add device constraint if a specific device is selected
      if (selectedDeviceId && selectedDeviceId !== 'default') {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });
      console.log('✅ Microphone access granted, stream tracks:', stream.getAudioTracks().length);

      const audioTrack = stream.getAudioTracks()[0];
      console.log('🎤 Audio track settings:', audioTrack.getSettings());
      console.log('🎤 Audio track status:', {
        enabled: audioTrack.enabled,
        muted: audioTrack.muted,
        readyState: audioTrack.readyState,
        label: audioTrack.label
      });

      // Check if track is muted and try to unmute
      if (audioTrack.muted) {
        console.warn('⚠️  Audio track is MUTED! This may be due to system-level mute or privacy settings.');
        console.warn('💡 Check: Hardware mute button, Windows Sound Settings, or browser permissions');
        // Don't block - continue and let user see if it resolves
      }
      if (!audioTrack.enabled) {
        console.warn('⚠️  Audio track is DISABLED! Enabling...');
        audioTrack.enabled = true;
      }

      // Listen for track unmute event
      audioTrack.onunmute = () => {
        console.log('✅ Audio track unmuted - microphone should work now');
      };
      audioTrack.onmute = () => {
        console.warn('⚠️  Audio track muted - microphone will not capture audio');
      };

      const source = inputCtx.createMediaStreamSource(stream);
      inputSourceRef.current = source;
      console.log('✅ MediaStreamSource created');

      // Build dynamic prompt based on patient data and demo config
      const systemInstruction = patientData
        ? PromptBuilder.buildOutboundCallPrompt(patientData, demoConfig || undefined)
        : PromptBuilder.buildFallbackPrompt(demoConfig || undefined);

      console.log('📝 Using dynamic prompt for:', patientData?.parentName || 'unknown caller');
      console.log('📝 Demo config:', demoConfig?.name || 'default (Jefferson Dental)');

      // Create provider instance with database adapter for function calling
      console.log('🎤 Creating voice provider with dbAdapter:', dbAdapterRef.current ? 'AVAILABLE ✅' : 'NULL ❌');
      const voiceProvider = createVoiceProvider(provider, dbAdapterRef.current);
      voiceProviderRef.current = voiceProvider;
      console.log('✅ Voice provider created');

      // Set patient context on provider if patient data exists
      if (patientData && voiceProvider.setPatientContext) {
        voiceProvider.setPatientContext(
          patientData.id,
          patientData.phoneNumber
        );
        console.log('✅ Patient context set on provider');
      }

      // Configure provider with tool configs from demo
      const config: ProviderConfig = {
        provider,
        apiKey,
        model: provider === 'openai' ? OPENAI_MODEL : GEMINI_MODEL,
        voiceName: provider === 'openai' ? OPENAI_VOICE : GEMINI_VOICE,
        systemInstruction, // Use dynamic prompt instead of static DENTAL_IVA_PROMPT
        toolConfigs: demoConfig?.toolConfigs || [] // Pass tool configs from demo
      };
      console.log('🔧 Tool configs passed to provider:', config.toolConfigs?.length || 0, 'tools configured');

      // Script Processor for Input (4096 buffer size)
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = scriptProcessor;

      scriptProcessor.onaudioprocess = (e) => {
        if (isMutedRef.current) {
          console.log('🔇 Muted - not sending audio');
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        console.log('🎤 Audio process event fired, buffer size:', inputData.length);

        // Calculate input volume for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        console.log('📊 Input RMS volume:', rms.toFixed(4));
        setVolumeLevel(prev => ({ ...prev, input: rms }));

        // Convert Float32Array to Int16 PCM
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16[i] = s < 0 ? s * 32768 : s * 32767;
        }

        const uint8Array = new Uint8Array(int16.buffer);
        console.log('📤 Sending', uint8Array.length, 'bytes to OpenAI');
        voiceProvider.sendAudio(uint8Array);
      };

      console.log('🔌 Connecting audio nodes: MediaStreamSource → ScriptProcessor → Destination');
      source.connect(scriptProcessor);
      scriptProcessor.connect(inputCtx.destination);
      console.log('✅ Audio pipeline connected, should start receiving audio events');

      // Connect to provider with callbacks
      console.log(`🔌 Attempting to connect to ${provider.toUpperCase()} provider...`);
      await voiceProvider.connect(config, {
        onOpen: () => {
          console.log(`✅ ${provider.toUpperCase()} session opened successfully`);
          setIsConnected(true);
        },
        onTranscript: handleTranscript,
        onTranscriptDelta: handleTranscriptDelta,
        onFunctionCall: handleFunctionCall,
        onFunctionResult: handleFunctionResult,
        onMessage: async (message) => {
          if (message.type === 'audio') {
            try {
              const audioBytes = message.data;
              console.log(`🎵 Received audio chunk: ${audioBytes.length} bytes`);

              if (audioBytes.length > 0) {
                setVolumeLevel(prev => ({ ...prev, output: 0.5 }));
                setTimeout(() => setVolumeLevel(prev => ({ ...prev, output: 0 })), 200);
              }

              // Verify AudioContext is running
              if (outputCtx.state === 'suspended') {
                console.warn('⚠️  AudioContext is suspended, attempting to resume...');
                await outputCtx.resume();
              }
              console.log(`🔊 AudioContext state: ${outputCtx.state}`);

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);

              const audioBuffer = await decodeAudioData(audioBytes, outputCtx, outputSampleRate, 1);
              console.log(`✅ Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels`);

              const bufferSource = outputCtx.createBufferSource();
              bufferSource.buffer = audioBuffer;
              bufferSource.connect(outputNode);

              bufferSource.addEventListener('ended', () => {
                console.log('🔇 Audio chunk finished playing');
                sourcesRef.current.delete(bufferSource);
              });

              const startTime = nextStartTimeRef.current;
              bufferSource.start(startTime);
              // Track how far ahead audio is scheduled (for transcript sync)
              audioLeadTimeRef.current = Math.max(0, startTime - outputCtx.currentTime);
              console.log(`▶️  Playing audio at ${startTime.toFixed(2)}s (current: ${outputCtx.currentTime.toFixed(2)}s, lead: ${audioLeadTimeRef.current.toFixed(2)}s)`);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(bufferSource);

            } catch (err) {
              console.error("❌ Error decoding audio:", err);
            }
          } else if (message.type === 'interrupt') {
            console.log("Interrupted by user");
            sourcesRef.current.forEach(src => {
              try { src.stop(); } catch(e) {}
            });
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;

            // Mark any partial assistant transcripts as complete with [interrupted] suffix
            setTranscriptItems(prev =>
              prev.map(item => {
                if (!('type' in item) &&
                    (item as TranscriptMessage).role === 'assistant' &&
                    (item as TranscriptMessage).isPartial) {
                  return {
                    ...item,
                    isPartial: false,
                    text: item.text + ' [interrupted]'
                  };
                }
                return item;
              })
            );
          }
        },
        onClose: () => {
          console.log(`${provider.toUpperCase()} session closed`);
          setIsConnected(false);
          setIsMuted(false);
          isMutedRef.current = false;
          stopBackgroundNoise();
        },
        onError: (err) => {
          console.error(`${provider.toUpperCase()} session error:`, err);
          setError(`Connection failed: ${err.message}`);
          disconnect();
        },
        onToolSystemMode: (mode) => {
          console.log(`🔧 Tool system mode: ${mode}`);
          setToolSystemMode(mode);
          if (onToolSystemMode) {
            onToolSystemMode(mode);
          }
        }
      });

    } catch (err: any) {
      console.error("Connection failed:", err);
      setError(err.message || "Failed to connect");
      setIsLoadingPatient(false);
      cleanupAudio();
    }
  }, [provider, selectedPatientId, dbAdapter, demoConfig, disconnect, cleanupAudio, playOfficeAmbience, stopBackgroundNoise, handleTranscript, handleFunctionCall, handleFunctionResult]);

  return {
    connect,
    disconnect,
    isConnected,
    volumeLevel,
    error,
    isMuted,
    toggleMute,
    patient,
    isLoadingPatient,
    transcriptItems,
    clearTranscripts,
    toolSystemMode,
    // Audio device selection
    audioDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    enumerateAudioDevices,
    // Secure context check (HTTPS required for microphone on non-localhost)
    isSecureContext
  };
};
