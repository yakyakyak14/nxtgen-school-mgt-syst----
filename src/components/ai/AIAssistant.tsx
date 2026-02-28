import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, Send, Mic, MicOff, Volume2, VolumeX, 
  Sparkles, User, Loader2, RefreshCw, Globe
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  context: 'parents' | 'staff' | 'alumni' | 'reports' | 'general';
  systemPrompt?: string;
}

const contextPrompts = {
  parents: `You are a helpful AI assistant for parents/guardians at a Nigerian school. Help them with:
- Information about their child's academic progress, attendance, and behavior
- Understanding school policies and procedures
- Parental guidance and advice for supporting their child's education
- Communication with teachers and school administration
- Fee payment queries and schedules
- School events and activities
Be warm, supportive, and culturally aware. Use simple language that parents can understand.`,
  
  staff: `You are an intelligent AI assistant for school staff. Help with:
- Summarizing student reports and identifying trends
- Providing teaching tips and pedagogical advice
- Curriculum planning and lesson ideas
- Classroom management strategies
- Administrative tasks and documentation
- Student performance analysis
Be professional, knowledgeable, and supportive of educational best practices.`,
  
  alumni: `You are an AI assistant for school alumni. Help with:
- Information about the school, its history, and current developments
- Alumni network connections and events
- Donation processes and fundraising projects
- Ways to give back to the school
- Career mentorship opportunities
Be friendly, appreciative, and encourage alumni engagement.`,
  
  reports: `You are an AI assistant specialized in analyzing and summarizing student reports. Help with:
- Summarizing multiple weekly reports into concise parent-friendly formats
- Identifying students who need attention or are excelling
- Highlighting behavioral or academic trends
- Creating professional summaries for parent communication
- Suggesting interventions for struggling students
Be analytical, concise, and focused on actionable insights.`,
  
  general: `You are a helpful AI assistant for a school management system in Nigeria. Help users with any questions about the school, education, or the platform.`
};

const AIAssistant: React.FC<AIAssistantProps> = ({ context, systemPrompt }) => {
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'male' | 'female'>('female');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const effectiveSystemPrompt = systemPrompt || contextPrompts[context];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          variant: 'destructive',
          title: 'Voice recognition error',
          description: 'Please try again or type your message.',
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({
        variant: 'destructive',
        title: 'Not supported',
        description: 'Voice recognition is not supported in your browser.',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    
    // Find appropriate voice based on selection
    const targetVoice = voices.find(voice => 
      selectedVoice === 'female' 
        ? voice.name.toLowerCase().includes('female') || voice.name.includes('Samantha') || voice.name.includes('Victoria')
        : voice.name.toLowerCase().includes('male') || voice.name.includes('Daniel') || voice.name.includes('Alex')
    );
    
    if (targetVoice) {
      utterance.voice = targetVoice;
    }
    
    utterance.rate = 1;
    utterance.pitch = selectedVoice === 'female' ? 1.1 : 0.9;
    speechSynthesis.speak(utterance);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: effectiveSystemPrompt },
            ...messages,
            { role: 'user', content: userMessage }
          ],
          context,
          userRole: role,
          userName: `${profile?.first_name} ${profile?.last_name}`
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (response.status === 402) {
          throw new Error('AI service quota exceeded. Please contact support.');
        }
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const assistantMessage = data.content || data.message || 'I apologize, but I couldn\'t generate a response. Please try again.';
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      
      if (voiceEnabled) {
        speakText(assistantMessage);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = {
    parents: [
      "How is my child performing academically?",
      "What are effective study techniques for my child?",
      "How can I help with homework?",
      "What extracurricular activities are available?"
    ],
    staff: [
      "How can I improve student engagement?",
      "Summarize this week's student reports",
      "Suggest classroom management strategies",
      "Help me plan a lesson on..."
    ],
    alumni: [
      "How can I contribute to the school?",
      "What are the current fundraising projects?",
      "How can I mentor current students?",
      "What are upcoming alumni events?"
    ],
    reports: [
      "Summarize these reports for parents",
      "Which students need immediate attention?",
      "What are the common behavioral trends?",
      "Create a parent-friendly summary"
    ],
    general: [
      "How can I help you today?",
      "Tell me about the school",
      "What features are available?",
      "How do I navigate the system?"
    ]
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                WYN-Tech AI
                <Badge variant="secondary" className="ml-2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Whatever You Need
                </Badge>
              </CardTitle>
              <CardDescription>
                Your intelligent helper for {context === 'parents' ? 'parental guidance' : context === 'staff' ? 'teaching support' : context === 'alumni' ? 'alumni services' : 'school tasks'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedVoice(v => v === 'male' ? 'female' : 'male')}
              className="text-xs"
            >
              {selectedVoice === 'male' ? '♂ Male' : '♀ Female'}
            </Button>
            <Button
              variant={voiceEnabled ? 'default' : 'outline'}
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1 px-6" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-6">
                  Hello! I'm WYN-Tech AI — Whatever You Need. How can I help you today?
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions[context].map((question, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => setInputMessage(question)}
                      className="text-xs"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button
              variant={isListening ? 'default' : 'outline'}
              size="icon"
              onClick={toggleVoiceInput}
              disabled={isLoading}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {isListening && (
            <p className="text-xs text-center text-muted-foreground mt-2 animate-pulse">
              Listening... Speak now
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AIAssistant;