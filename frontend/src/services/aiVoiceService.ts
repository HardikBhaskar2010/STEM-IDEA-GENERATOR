/**
 * AI Voice Service - Integrates voice commands with AI backend
 * Provides intelligent voice-to-text and text-to-voice with AI processing
 */

import { projectService } from './projectServiceSupabase';
import { elevenLabsTTS } from './elevenLabsTTS';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

// Debug logging to verify the URL is correct
console.log('🔍 AI Voice Service - API_BASE_URL:', API_BASE_URL);
console.log('🔍 Environment Variable VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

export interface VoiceTranscription {
  text: string;
  confidence: number;
  timestamp: Date;
}

export interface AIVoiceResponse {
  text: string;
  action?: string;
  parameters?: Record<string, any>;
  needs_more_info?: boolean;
  conversation_context?: Record<string, any>;
}

class AIVoiceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private conversationContext: Record<string, any> = {};

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }

  /**
   * Initialize Web Speech Recognition API
   */
  private initializeSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 3;
    } else {
      console.warn('Speech Recognition API not supported');
    }
  }

  /**
   * Initialize Text-to-Speech API
   */
  private initializeSpeechSynthesis(): void {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else {
      console.warn('Speech Synthesis API not supported');
    }
  }

  /**
   * Check if voice services are supported
   */
  isSupported(): boolean {
    return this.recognition !== null && this.synthesis !== null;
  }

  /**
   * Start listening for voice input
   */
  startListening(onTranscript: (text: string, isFinal: boolean) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      if (this.isListening) {
        resolve();
        return;
      }

      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('🎤 Voice recognition started');
        resolve();
      };

      this.recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        const isFinal = event.results[current].isFinal;
        
        onTranscript(transcript, isFinal);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        this.isListening = false;
        reject(new Error(event.error));
      };

      this.recognition.onend = () => {
        this.isListening = false;
        console.log('🎤 Voice recognition ended');
      };

      try {
        this.recognition.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Process voice command with AI backend
   */
  async processWithAI(transcript: string, context?: Record<string, any>): Promise<AIVoiceResponse> {
    try {
      // Merge with stored conversation context
      const fullContext = { ...this.conversationContext, ...context };
      
      const apiUrl = `${API_BASE_URL}/ai-guidance/process-voice`;
      console.log('🔍 AI Voice Service - Making API call to:', apiUrl);
      console.log('🔍 Request payload:', { transcript, context: fullContext });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          timestamp: new Date().toISOString(),
          context: fullContext,
        }),
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 API Error Response:', errorText);
        throw new Error(`AI processing failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ AI Response received:', data);
      
      // Update conversation context if provided
      if (data.conversation_context) {
        this.conversationContext = data.conversation_context;
      }
      
      return data;
    } catch (error: any) {
      console.error('🚨 AI voice processing error:', error);
      console.error('🚨 Error details:', {
        message: error?.message,
        stack: error?.stack,
        transcript,
        apiUrl: `${API_BASE_URL}/ai-guidance/process-voice`
      });
      
      // Return the fallback response directly without error message prefix
      const fallbackResponse = await this.basicProcessing(transcript);
      console.log('🔄 Using fallback processing due to API connection issue');
      return fallbackResponse;
    }
  }

  /**
   * Clear conversation context
   */
  clearContext(): void {
    this.conversationContext = {};
  }

  /**
   * Get current conversation context
   */
  getContext(): Record<string, any> {
    return { ...this.conversationContext };
  }

  /**
   * Basic fallback processing without AI
   */
  private async basicProcessing(transcript: string): Promise<AIVoiceResponse> {
    const lowerTranscript = transcript.toLowerCase();
    
    // Project listing queries
    if (lowerTranscript.includes('list projects') || lowerTranscript.includes('show projects') || 
        lowerTranscript.includes('my projects') || lowerTranscript.includes('saved projects') ||
        lowerTranscript.includes('list my') || lowerTranscript.includes('show my')) {
      
      try {
        const projects = await projectService.getProjects();
        const connectionStatus = projectService.getConnectionStatus();
        
        if (projects.length === 0) {
          return {
            text: "Aww, looks like you haven't created any projects yet! But that's totally okay - everyone starts somewhere! 🌱\n\n✨ **Let's build something AMAZING together!** I can help you make:\n• 🤖 **Super cool robots** - they can move and think!\n• 🏠 **Smart home gadgets** - like magic for your house!\n• ⚡ **Electronic wizardry** - lights, sounds, and circuits!\n• 🤖 **Automation magic** - making things work by themselves!\n\nJust say something like 'Create a fun robotics project!' and we'll start our adventure! This is gonna be epic! 🎊",
            action: 'suggest_navigation',
            parameters: { path: '/generator' }
          };
        }

        // Format projects list
        let projectsList = `🎉 **Your Amazing Project Collection!** (${projects.length} awesome creations!)\n\nWow, look at all these incredible projects you've been working on! I'm so proud! ✨\n\n`;
        
        projects.slice(0, 10).forEach((project, index) => {
          const statusEmoji = {
            'planning': '🎯',
            'in-progress': '🚀',
            'completed': '🏆',
            'abandoned': '😴'
          }[project.status] || '🎯';
          
          const skillLevel = project.generated_from_params?.skillLevel || project.difficulty;
          const projectType = project.generated_from_params?.projectType || 'General';
          
          projectsList += `**${index + 1}. ${project.title}** ✨\n`;
          projectsList += `   ${statusEmoji} *${project.status}* • ${skillLevel} level • ${projectType}\n`;
          projectsList += `   ⏰ ${project.estimatedTime} • 💰 ${project.estimatedCost}\n\n`;
        });

        if (projects.length > 10) {
          projectsList += `*...and ${projects.length - 10} more fantastic projects!* 🌟\n\n`;
        }

        projectsList += `📊 **Your Super Stats:**\n`;
        projectsList += `• 🏆 Completed: ${projects.filter(p => p.status === 'completed').length} (You're amazing!)\n`;
        projectsList += `• 🚀 In Progress: ${projects.filter(p => p.status === 'in-progress').length} (Keep going!)\n`;
        projectsList += `• 🎯 Planning: ${projects.filter(p => p.status === 'planning').length} (Great ideas!)\n\n`;

        projectsList += `Want to see more details? Visit your awesome [Library](/library) or ask me about any specific project! I love talking about your creations! 💫`;

        // Add storage info
        if (connectionStatus.fallback) {
          projectsList += `\n\n💾 *Note: Your projects are safely stored locally right now! 🏠*`;
        }

        return {
          text: projectsList,
          action: 'project_list',
          parameters: { 
            projects: projects.slice(0, 10),
            total: projects.length,
            storage: connectionStatus.fallback ? 'localStorage' : 'supabase'
          }
        };
      } catch (error) {
        console.error('Error fetching projects:', error);
        return {
          text: "I'm having trouble accessing your projects right now. This might be a temporary issue.\n\nYou can try:\n• Visiting your [Library](/library) directly\n• Refreshing the page\n• Checking your internet connection\n\nOr ask me to create a new project instead!",
          action: 'error',
          parameters: { error: 'project_fetch_failed' }
        };
      }
    }

    // Project statistics queries
    if (lowerTranscript.includes('project stats') || lowerTranscript.includes('project statistics') ||
        lowerTranscript.includes('how many projects') || lowerTranscript.includes('project count')) {
      
      try {
        const stats = await projectService.getProjectStats();
        const connectionStatus = projectService.getConnectionStatus();
        
        if (!stats) {
          throw new Error('Failed to get project statistics');
        }

        let statsText = `📊 **Your Project Statistics**\n\n`;
        statsText += `🎯 **Total Projects:** ${stats.total}\n\n`;
        statsText += `**Status Breakdown:**\n`;
        statsText += `• ✅ **Completed:** ${stats.completed} projects\n`;
        statsText += `• 🔄 **In Progress:** ${stats.inProgress} projects\n`;
        statsText += `• 📝 **Planning:** ${stats.planning} projects\n\n`;

        if (stats.total > 0) {
          const completionRate = Math.round((stats.completed / stats.total) * 100);
          statsText += `🏆 **Completion Rate:** ${completionRate}%\n\n`;
          
          if (completionRate >= 80) {
            statsText += `Amazing work! You're crushing your projects! 🚀`;
          } else if (completionRate >= 50) {
            statsText += `Great progress! Keep up the momentum! 💪`;
          } else if (stats.inProgress > 0) {
            statsText += `You've got projects in progress - time to finish them! 🔥`;
          } else {
            statsText += `Ready to start working on those planned projects? 🎯`;
          }
        } else {
          statsText += `Ready to create your first project? Let's build something amazing! 🚀`;
        }

        if (connectionStatus.fallback) {
          statsText += `\n\n💾 *Note: Stats from local storage (Supabase offline)*`;
        }

        return {
          text: statsText,
          action: 'project_stats',
          parameters: { stats, storage: connectionStatus.fallback ? 'localStorage' : 'supabase' }
        };
      } catch (error) {
        console.error('Error fetching project stats:', error);
        return {
          text: "I couldn't retrieve your project statistics right now. You can check your [Library](/library) to see your projects manually.",
          action: 'error',
          parameters: { error: 'stats_fetch_failed' }
        };
      }
    }
    
    // Greeting responses
    if (lowerTranscript.includes('hello') || lowerTranscript.includes('hi') || lowerTranscript.includes('hey')) {
      return {
        text: "Hi there! 🌟 I'm your super excited STEM buddy! I'm like, REALLY good at helping with cool projects! ✨\n\n🎯 **What we can do together:**\n• 🤖 Build awesome robots (they're SO cool!)\n• 💡 Create smart gadgets that'll blow your mind\n• 🔧 Find the perfect components for your ideas\n• 📋 Check out your amazing project collection\n• 🎓 Learn super fun STEM stuff!\n\nOoh, ooh! What exciting thing should we work on today? I'm practically bouncing with excitement! 🎉",
        action: 'greeting'
      };
    }
    
    // Help responses
    if (lowerTranscript.includes('help') || lowerTranscript.includes('what can you do')) {
      return {
        text: "Yay! You want to know what I can do? This is gonna be FUN! 🎊\n\n✨ **My Super Powers:**\n🚀 **Project Magic**: 'Make me a robot!' or 'Create something amazing!'\n🗺️ **Adventure Guide**: 'Take me to the lab!' or 'Show me my dashboard!'\n📋 **Project Detective**: 'What projects do I have?' or 'Show my creations!'\n🎓 **Knowledge Buddy**: 'Teach me about Arduino!' or 'How do sensors work?'\n💬 **Chat Friend**: Ask me ANYTHING about STEM - I love talking about it!\n\nI'm like a super smart friend who knows ALL about building cool stuff! What should we explore first? 🌈",
        action: 'help'
      };
    }
    
    // Extract intent and parameters for project generation
    if (lowerTranscript.includes('generate') || lowerTranscript.includes('create project') || lowerTranscript.includes('make a project') || lowerTranscript.includes('build a project') || 
        lowerTranscript.includes('create a') || lowerTranscript.includes('make a') || lowerTranscript.includes('build a') ||
        lowerTranscript.includes('expert') || lowerTranscript.includes('advanced') || lowerTranscript.includes('beginner') || lowerTranscript.includes('intermediate')) {
      
      // Extract project parameters using the same logic as UniversalChat
      let projectType = 'robotics'; // default
      if (lowerTranscript.includes('robot')) {
        projectType = 'robotics';
      } else if (lowerTranscript.includes('iot') || lowerTranscript.includes('smart home')) {
        projectType = 'iot';
      } else if (lowerTranscript.includes('electronic') || lowerTranscript.includes('circuit')) {
        projectType = 'electronics';
      } else if (lowerTranscript.includes('automation') || lowerTranscript.includes('automat')) {
        projectType = 'automation';
      } else if (lowerTranscript.includes('sensor') || lowerTranscript.includes('monitor')) {
        projectType = 'sensors';
      }
      
      // Extract skill level
      let skillLevel = 'intermediate'; // default
      if (lowerTranscript.includes('expert')) {
        skillLevel = 'expert';
      } else if (lowerTranscript.includes('advanced')) {
        skillLevel = 'advanced';
      } else if (lowerTranscript.includes('beginner') || lowerTranscript.includes('start')) {
        skillLevel = 'beginner';
      } else if (lowerTranscript.includes('intermediate') || lowerTranscript.includes('medium')) {
        skillLevel = 'intermediate';
      }
      
      console.log('🔍 AI Service Basic Processing - Extracted parameters:', { projectType, skillLevel });
      
      return {
        text: "OMG YES! 🎉 Building projects is like, the BEST thing ever! I'm so excited to help you create something absolutely amazing! ✨\n\nLet's zoom over to our super cool Project Lab where we can design the most incredible STEM project together! This is gonna be SO much fun! 🚀",
        action: 'navigate',
        parameters: { 
          path: '/generator',
          formData: {
            projectType: projectType,
            skillLevel: skillLevel,
            interests: transcript,
            budget: '',
            duration: ''
          }
        }
      };
    }
    
    if (lowerTranscript.includes('open') || lowerTranscript.includes('go to') || lowerTranscript.includes('show me')) {
      if (lowerTranscript.includes('dashboard') || lowerTranscript.includes('home')) {
        return {
          text: "Opening your dashboard where you can see all your projects and activity.",
          action: 'navigate',
          parameters: { path: '/dashboard' }
        };
      }
      if (lowerTranscript.includes('library') || lowerTranscript.includes('my projects') || lowerTranscript.includes('saved projects')) {
        return {
          text: "Opening your Library where you can view and manage all your saved projects.",
          action: 'navigate',
          parameters: { path: '/library' }
        };
      }
      if (lowerTranscript.includes('components') || lowerTranscript.includes('parts') || lowerTranscript.includes('catalog')) {
        return {
          text: "Opening the Components Catalog where you can browse and search for electronic parts.",
          action: 'navigate',
          parameters: { path: '/components' }
        };
      }
      if (lowerTranscript.includes('learn') || lowerTranscript.includes('tutorial') || lowerTranscript.includes('education')) {
        return {
          text: "Opening the Learning Hub with tutorials and educational content.",
          action: 'navigate',
          parameters: { path: '/learn' }
        };
      }
      if (lowerTranscript.includes('generator') || lowerTranscript.includes('project lab') || lowerTranscript.includes('lab')) {
        return {
          text: "Opening the Project Lab where you can generate new STEM project ideas.",
          action: 'navigate',
          parameters: { path: '/generator' }
        };
      }
    }

    // Project-related queries
    if (lowerTranscript.includes('robot') || lowerTranscript.includes('robotics')) {
      return {
        text: "Robotics projects are exciting! I can help you create anything from simple line-following robots to advanced autonomous systems. Would you like me to take you to the Project Lab to generate a custom robotics project?",
        action: 'suggest_navigation',
        parameters: { path: '/generator', type: 'robotics' }
      };
    }

    if (lowerTranscript.includes('iot') || lowerTranscript.includes('smart home') || lowerTranscript.includes('internet of things')) {
      return {
        text: "IoT projects are great for connecting devices and creating smart systems! I can help you design projects like smart home automation, environmental monitoring, or connected sensors. Want to create an IoT project?",
        action: 'suggest_navigation',
        parameters: { path: '/generator', type: 'iot' }
      };
    }

    if (lowerTranscript.includes('arduino') || lowerTranscript.includes('microcontroller')) {
      return {
        text: "Arduino is perfect for STEM projects! I can help you find Arduino boards, compatible components, or create projects that use Arduino. Would you like to browse Arduino components or create an Arduino-based project?",
        action: 'suggest_options'
      };
    }

    // Default response for unrecognized input
    return {
      text: "Ooh, that sounds interesting! I'm not quite sure what you mean, but I'm super excited to help anyway! 🌟\n\n✨ **Here's what I LOVE helping with:**\n• 🎯 'Show me my awesome projects!' \n• 🤖 'Let's build a cool robot!'\n• 🏠 'Take me on a tour!' (dashboard, library, etc.)\n• 🎓 'Teach me something amazing!'\n\nI'm like a really enthusiastic friend who knows tons about building cool stuff! What adventure should we go on together? 🚀💫",
      action: 'unknown'
    };
  }

  /**
   * Speak text using ElevenLabs TTS or fallback to browser TTS
   */
  async speak(text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
    useElevenLabs?: boolean;
  }): Promise<void> {
    try {
      // Use ElevenLabs TTS by default for better quality
      if (options?.useElevenLabs !== false) {
        console.log('🎵 Using ElevenLabs TTS for cheerful voice');
        await elevenLabsTTS.textToSpeech(text, {
          stability: 0.8, // More stable for professional sound
          similarityBoost: 0.7,
          style: 0.6, // Slightly more expressive for childish tone
          useSpeakerBoost: true
        });
        return;
      }
    } catch (error) {
      console.warn('ElevenLabs TTS failed, falling back to browser TTS:', error);
    }

    // Fallback to browser TTS
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure for cheerful, childish tone
      utterance.rate = options?.rate || 1.2; // Faster for enthusiasm
      utterance.pitch = options?.pitch || 1.3; // Higher for childish tone
      utterance.volume = options?.volume || 0.8;
      
      if (options?.voice) {
        utterance.voice = options.voice;
      } else {
        // Try to find a cheerful female voice
        const voices = this.synthesis.getVoices();
        const cheerfulVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.lang.includes('en-US')
        );
        if (cheerfulVoice) {
          utterance.voice = cheerfulVoice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Convert voice to project parameters
   */
  async voiceToProjectParams(transcript: string): Promise<{
    projectType?: string;
    skillLevel?: string;
    interests?: string;
    budget?: string;
    duration?: string;
  }> {
    const params: any = {};
    const lowerTranscript = transcript.toLowerCase();

    // Extract project type
    if (lowerTranscript.includes('robot')) params.projectType = 'robotics';
    else if (lowerTranscript.includes('iot') || lowerTranscript.includes('smart home')) params.projectType = 'iot';
    else if (lowerTranscript.includes('electronic') || lowerTranscript.includes('circuit')) params.projectType = 'electronics';
    else if (lowerTranscript.includes('automation') || lowerTranscript.includes('automat')) params.projectType = 'automation';
    else if (lowerTranscript.includes('sensor') || lowerTranscript.includes('monitor')) params.projectType = 'sensors';

    // Extract skill level
    if (lowerTranscript.includes('beginner') || lowerTranscript.includes('start')) params.skillLevel = 'beginner';
    else if (lowerTranscript.includes('intermediate') || lowerTranscript.includes('medium')) params.skillLevel = 'intermediate';
    else if (lowerTranscript.includes('advanced')) params.skillLevel = 'advanced';
    else if (lowerTranscript.includes('expert')) params.skillLevel = 'expert';

    // Extract budget
    const budgetMatch = transcript.match(/\$\s*(\d+)/);
    if (budgetMatch) {
      params.budget = `$${budgetMatch[1]}`;
    }

    // Extract duration
    const durationMatch = transcript.match(/(\d+)\s*(week|month|day)/i);
    if (durationMatch) {
      params.duration = `${durationMatch[1]} ${durationMatch[2]}${durationMatch[1] !== '1' ? 's' : ''}`;
    }

    // Use the rest as interests
    params.interests = transcript;

    return params;
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}

// Export singleton instance
export const aiVoiceService = new AIVoiceService();
export default aiVoiceService;
