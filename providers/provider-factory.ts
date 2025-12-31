import { IVoiceProvider, VoiceProvider } from '../types';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';
import type { DatabaseAdapter } from '../database/db-interface';
import { logFeatureFlags } from '../config/feature-flags';

export function createVoiceProvider(
  provider: VoiceProvider,
  dbAdapter?: DatabaseAdapter
): IVoiceProvider {
  console.log('🏭 FACTORY: createVoiceProvider called');
  console.log('🏭 FACTORY: provider type:', provider);
  console.log('🏭 FACTORY: dbAdapter:', dbAdapter ? 'PROVIDED ✅' : 'NULL ❌');

  // Log feature flags on provider creation
  logFeatureFlags();

  switch (provider) {
    case 'openai':
      // OpenAI provider - database adapter is optional (used for conversation logging)
      console.log('🏭 FACTORY: Creating OpenAIProvider with dbAdapter');
      const openaiProvider = new OpenAIProvider(dbAdapter);
      console.log('🏭 FACTORY: OpenAIProvider created successfully');
      return openaiProvider;
    case 'gemini':
      // Gemini provider doesn't require database adapter (legacy support)
      console.log('🏭 FACTORY: Creating GeminiProvider');
      return new GeminiProvider();
    default:
      throw new Error(`Unknown voice provider: ${provider}`);
  }
}
