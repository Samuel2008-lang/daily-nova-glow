import { useState } from "react";
import { Sparkles, BookOpen, CheckCircle2, Target, PenLine, MessageSquare, Quote, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface WelcomeScreenProps {
  onComplete: () => void;
}

const features = [
  { icon: BookOpen, title: "Notes", description: "Capture thoughts with voice or text", color: "text-primary" },
  { icon: CheckCircle2, title: "Tasks", description: "Stay organized and productive", color: "text-accent" },
  { icon: Target, title: "Habits", description: "Build streaks and track progress", color: "text-accent" },
  { icon: PenLine, title: "Diary", description: "Reflect on your daily experiences", color: "text-success" },
  { icon: MessageSquare, title: "Journal", description: "Deep self-exploration with AI", color: "text-secondary" },
  { icon: Quote, title: "Quotes", description: "Daily inspiration to motivate you", color: "text-accent" },
];

const WelcomeScreen = ({ onComplete }: WelcomeScreenProps) => {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    // Page 1: Welcome
    <div key="welcome" className="flex flex-col items-center text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center mb-6 animate-pulse-glow">
        <Sparkles className="w-10 h-10 text-background" />
      </div>
      <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
        Welcome to DailyNova
      </h1>
      <p className="text-lg text-muted-foreground max-w-md">
        Your all-in-one personal productivity companion for notes, tasks, habits, journaling, and daily inspiration.
      </p>
    </div>,

    // Page 2: Features
    <div key="features" className="px-6 w-full max-w-lg">
      <h2 className="text-2xl font-bold text-center mb-6 text-primary">What you can do</h2>
      <div className="grid grid-cols-2 gap-3">
        {features.map((feature) => (
          <Card key={feature.title} className="glass p-4 flex flex-col items-center text-center">
            <feature.icon className={`w-8 h-8 mb-2 ${feature.color}`} />
            <h3 className="font-semibold text-sm">{feature.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
          </Card>
        ))}
      </div>
    </div>,

    // Page 3: AI Features
    <div key="ai" className="flex flex-col items-center text-center px-6">
      <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-secondary animate-pulse" />
      </div>
      <h2 className="text-2xl font-bold mb-4 text-secondary">AI-Powered Assistance</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Get personalized guidance, encouragement, and insights from your AI companion in your Diary and Journal. 
        Share your thoughts and receive thoughtful responses, prayers, and wisdom.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {["Emotional Support", "Reflective Questions", "Creative Prompts", "Spiritual Guidance"].map((tag) => (
          <span key={tag} className="px-3 py-1 bg-secondary/20 rounded-full text-xs text-secondary">
            {tag}
          </span>
        ))}
      </div>
    </div>,

    // Page 4: Get Started
    <div key="start" className="flex flex-col items-center text-center px-6">
      <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-success" />
      </div>
      <h2 className="text-2xl font-bold mb-4 text-success">You're all set!</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Start your journey to better productivity and self-reflection. 
        All your data stays private on your device.
      </p>
      <Button onClick={onComplete} size="lg" className="glow px-8">
        Get Started
        <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        {pages[currentPage]}
      </div>

      {/* Navigation */}
      <div className="pb-12 px-6">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {pages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentPage 
                  ? 'w-8 bg-primary' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        {currentPage < pages.length - 1 && (
          <div className="flex justify-between items-center max-w-lg mx-auto">
            <Button 
              variant="ghost" 
              onClick={onComplete}
              className="text-muted-foreground"
            >
              Skip
            </Button>
            <Button 
              onClick={() => setCurrentPage(currentPage + 1)}
              className="glow"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;