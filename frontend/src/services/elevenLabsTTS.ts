/**
 * ElevenLabs Text-to-Speech Service
 * Provides high-quality voice synthesis for the AI assistant
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_TOKEN;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voice IDs for different personalities
const VOICE_IDS = {
  // Cheerful, childish but professional voices
  BELLA: 'EXAVITQu4vr4xnSDxMaL', // Young, enthusiastic female voice
  ELLI: 'MF3mGyEYCl7XYWbV9V6O', // Playful, energetic voice
  JOSH: 'TxGEqnHWrfWFTfGW9XjX', // Friendly, approachable male voice
  RACHEL: 'pNInz6obpgDQGcFmaJgB', // Warm, encouraging female voice
};

// Default voice for our cheerful AI assistant
const DEFAULT_VOICE_ID = VOICE_IDS.BELLA;

interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

class ElevenLabsTTSService {
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    // Initialize audio context for better audio handling
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Convert text to speech using ElevenLabs API
   */
  async textToSpeech(
    text: string, 
    options: TTSOptions = {}
  ): Promise<void> {
    try {
      // Check if API key is available
      if (!ELEVENLABS_API_KEY) {
        console.warn('ElevenLabs API key not found, falling back to browser TTS');
        this.fallbackTTS(text);
        return;
      }

      const {
        voiceId = DEFAULT_VOICE_ID,
        stability = 0.75, // Slightly more stable for clearer emotion
        similarityBoost = 0.8, // Higher similarity for consistent voice
        style = 0.7, // Higher style for more expressive emotion delivery
        useSpeakerBoost = true
      } = options;

      console.log('🎵 ElevenLabs TTS: Converting text to speech...', { text: text.substring(0, 50) + '...' });

      const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: this.preprocessText(text),
          model_id: 'eleven_turbo_v2_5', // Updated to free tier compatible model
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      await this.playAudio(audioBlob);

      console.log('✅ ElevenLabs TTS: Audio played successfully');
    } catch (error) {
      console.error('❌ ElevenLabs TTS Error:', error);
      // Fallback to browser TTS if ElevenLabs fails
      this.fallbackTTS(text);
    }
  }

  /**
   * Preprocess text for better TTS output
   * - Removes emojis completely (no pronunciation)
   * - Converts emotion markers to natural speech patterns
   * - Cleans markdown formatting
   */
  private preprocessText(text: string): string {
    return text
      // Remove markdown formatting first
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      
      // Handle emotion markers - convert to natural speech patterns instead of saying the word
      .replace(/\*excited\*/gi, '') // Remove *excited* markers - let voice convey excitement
      .replace(/\*sparkle\*/gi, '') // Remove *sparkle* markers
      .replace(/\*rocket\*/gi, '') // Remove *rocket* markers
      .replace(/\*star\*/gi, '') // Remove *star* markers
      .replace(/\*magic\*/gi, '') // Remove *magic* markers
      .replace(/\*celebration\*/gi, '') // Remove *celebration* markers
      .replace(/\*happy\*/gi, '') // Remove *happy* markers
      .replace(/\*cheerful\*/gi, '') // Remove *cheerful* markers
      .replace(/\*enthusiastic\*/gi, '') // Remove *enthusiastic* markers
      .replace(/\*amazed\*/gi, '') // Remove *amazed* markers
      .replace(/\*surprised\*/gi, '') // Remove *surprised* markers
      .replace(/\*delighted\*/gi, '') // Remove *delighted* markers
      
      // Remove ALL emojis completely (Unicode ranges for emojis)
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Regional indicator symbols
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
      
      // Handle specific emotion words in parentheses or brackets - remove them
      .replace(/\(excited\)/gi, '')
      .replace(/\(happy\)/gi, '')
      .replace(/\(cheerful\)/gi, '')
      .replace(/\(enthusiastic\)/gi, '')
      .replace(/\(amazed\)/gi, '')
      .replace(/\(surprised\)/gi, '')
      .replace(/\(delighted\)/gi, '')
      .replace(/\(joyful\)/gi, '')
      .replace(/\(thrilled\)/gi, '')
      .replace(/\(ecstatic\)/gi, '')
      
      // Clean up extra spaces and newlines
      .replace(/\n+/g, '. ') // Convert newlines to periods for natural pauses
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\.\s*\./g, '.') // Remove double periods
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      
      // Add natural pauses for better speech flow
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure space after punctuation
      .replace(/:\s*/g, ': ') // Ensure space after colons
      
      .trim();
  }

  /**
   * Play audio blob
   */
  private async playAudio(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop any currently playing audio
      this.stopCurrentAudio();

      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(audioUrl);

      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      };

      this.currentAudio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        reject(error);
      };

      // Resume audio context if suspended (required by some browsers)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.currentAudio.play().catch(reject);
    });
  }

  /**
   * Stop currently playing audio
   */
  stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Fallback to browser TTS if ElevenLabs fails
   */
  private fallbackTTS(text: string): void {
    console.log('🔄 Falling back to browser TTS');
    
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(this.preprocessText(text));
      
      // Configure for cheerful, childish tone
      utterance.rate = 1.2; // Slightly faster for enthusiasm
      utterance.pitch = 1.3; // Higher pitch for childish tone
      utterance.volume = 0.8;

      // Try to find a female voice for more cheerful sound
      const voices = speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('woman') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('karen')
      );

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      speechSynthesis.speak(utterance);
    }
  }

  /**
   * Check if TTS is supported
   */
  isSupported(): boolean {
    return 'speechSynthesis' in window || !!this.audioContext;
  }

  /**
   * Get available voice options
   */
  getVoiceOptions() {
    return {
      BELLA: { id: VOICE_IDS.BELLA, name: 'Bella', description: 'Cheerful and enthusiastic' },
      ELLI: { id: VOICE_IDS.ELLI, name: 'Elli', description: 'Playful and energetic' },
      JOSH: { id: VOICE_IDS.JOSH, name: 'Josh', description: 'Friendly and approachable' },
      RACHEL: { id: VOICE_IDS.RACHEL, name: 'Rachel', description: 'Warm and encouraging' },
    };
  }

  /**
   * Test TTS with a sample message
   */
  async testTTS(): Promise<void> {
    const testMessage = "Hi there! I'm your super excited STEM buddy! This is a test of my cheerful voice! Isn't this amazing?";
    await this.textToSpeech(testMessage);
  }
}

// Export singleton instance
export const elevenLabsTTS = new ElevenLabsTTSService();
export default elevenLabsTTS;