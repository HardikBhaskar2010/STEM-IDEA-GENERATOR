import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { aiVoiceService } from '@/services/aiVoiceService';

interface VoiceCommandProps {
  onCommand?: (command: string) => void;
}

export const VoiceCommand: React.FC<VoiceCommandProps> = ({ onCommand }) => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        console.log('🎤 Voice recognition started');
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
        
        // If final result, process command
        if (event.results[current].isFinal) {
          processVoiceCommand(transcriptText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          toast({
            title: 'Microphone Access Denied',
            description: 'Please allow microphone access to use voice commands.',
            variant: 'destructive',
          });
        } else if (event.error === 'no-speech') {
          console.log('No speech detected, retrying...');
          // Don't show error for no-speech, just retry
        } else if (event.error === 'audio-capture') {
          toast({
            title: 'Microphone Error',
            description: 'Could not access microphone. Please check your audio settings.',
            variant: 'destructive',
          });
        } else if (event.error === 'network') {
          toast({
            title: 'Network Error',
            description: 'Speech recognition requires internet connection.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Voice Recognition Error',
            description: `Error: ${event.error}. Please try again.`,
            variant: 'destructive',
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setTranscript('');
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      console.warn('Web Speech API not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const processVoiceCommand = useCallback(async (command: string) => {
    const lowerCommand = command.toLowerCase();
    console.log('🎯 Processing voice command:', command);

    try {
      // Use AI service for intelligent processing
      const aiResponse = await aiVoiceService.processWithAI(command);
      
      // Speak the response
      await aiVoiceService.speak(aiResponse.text);
      
      // Execute action if specified
      if (aiResponse.action === 'navigate' && aiResponse.parameters?.path) {
        // Check if form data needs to be pre-filled
        if (aiResponse.parameters.formData) {
          // Store form data in sessionStorage for the Generator page
          sessionStorage.setItem('generatorFormData', JSON.stringify(aiResponse.parameters.formData));
        }
        
        setTimeout(() => {
          navigate(aiResponse.parameters.path);
        }, 500);
      }

      toast({
        title: '🎤 Voice Command',
        description: `You said: "${command}"`,
      });
      
    } catch (error) {
      console.error('Voice command processing error:', error);
      
      // Fallback to basic navigation commands
      if (lowerCommand.includes('go to') || lowerCommand.includes('open') || lowerCommand.includes('show')) {
        if (lowerCommand.includes('dashboard') || lowerCommand.includes('home')) {
          navigate('/dashboard');
          speak('Opening dashboard');
        } else if (lowerCommand.includes('generator') || lowerCommand.includes('project lab') || lowerCommand.includes('create project')) {
          navigate('/veronica-ai');
          speak('Opening project lab');
        } else if (lowerCommand.includes('component') || lowerCommand.includes('parts')) {
          navigate('/components');
          speak('Opening components catalog');
        } else if (lowerCommand.includes('library') || lowerCommand.includes('saved')) {
          navigate('/library');
          speak('Opening library');
        } else if (lowerCommand.includes('learn') || lowerCommand.includes('tutorial')) {
          navigate('/learn');
          speak('Opening learning hub');
        } else if (lowerCommand.includes('profile') || lowerCommand.includes('account')) {
          navigate('/profile');
          speak('Opening profile');
        }
      }
      // Action commands
      else if (lowerCommand.includes('generate') || lowerCommand.includes('create') || lowerCommand.includes('new project')) {
        navigate('/veronica-ai');
        speak('Let\'s create a new project');
      }
      else if (lowerCommand.includes('search') || lowerCommand.includes('find')) {
        if (lowerCommand.includes('component') || lowerCommand.includes('part')) {
          navigate('/components');
          speak('Searching components');
        }
      }
      // Help command
      else if (lowerCommand.includes('help') || lowerCommand.includes('what can you do')) {
        speak('You can say commands like: Go to dashboard, create new project, open components, or search for Arduino');
        toast({
          title: 'Voice Commands Available',
          description: 'Try: "Go to dashboard", "Create new project", "Open components", "Show library"',
        });
      }
      // Unknown command
      else {
        speak('I didn\'t understand that command. Try saying "help" to see available commands.');
        toast({
          title: 'Command Not Recognized',
          description: 'Say "help" to see available voice commands.',
          variant: 'destructive',
        });
      }

      toast({
        title: 'Voice Command',
        description: `You said: "${command}"`,
      });
    }

    // Call optional callback
    if (onCommand) {
      onCommand(command);
    }
  }, [navigate, onCommand]);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Voice commands are not supported in your browser. Try Chrome or Edge.',
        variant: 'destructive',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  }, [isListening, isSupported]);

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        onClick={toggleListening}
        size="icon"
        variant={isListening ? 'default' : 'outline'}
        className={`relative rounded-full w-12 h-12 transition-all ${
          isListening 
            ? 'bg-gradient-primary text-white shadow-glow animate-pulse' 
            : 'bg-background/50 backdrop-blur-sm border-primary/20'
        }`}
        title="Voice Commands (Click to speak)"
      >
        {isListening ? (
          <Mic className="w-5 h-5 animate-pulse" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
        
        {/* Listening indicator */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
          </>
        )}
      </Button>

      {/* Transcript Display */}
      {transcript && (
        <div className="absolute top-full mt-2 right-0 z-50 min-w-[300px]">
          <div className="glass-effect border-primary/20 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-2">
              <Volume2 className="w-4 h-4 text-primary mt-0.5 animate-pulse" />
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Listening...
                </p>
                <p className="text-sm">{transcript}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Commands Badge */}
      {!isListening && (
        <Badge 
          variant="outline" 
          className="absolute -top-1 -right-1 h-5 px-1.5 text-[10px] bg-gradient-primary text-white border-primary/20 flex items-center gap-1"
        >
          <Sparkles className="h-2.5 w-2.5" />
          AI
        </Badge>
      )}
    </div>
  );
};
