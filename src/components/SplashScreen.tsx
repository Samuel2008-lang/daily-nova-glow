import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'logo' | 'text' | 'fade'>('logo');

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('text'), 800);
    const timer2 = setTimeout(() => setPhase('fade'), 2200);
    const timer3 = setTimeout(onComplete, 2800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        phase === 'fade' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Logo */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-700 ${
        phase === 'logo' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
      }`}>
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center animate-pulse-glow">
            <Sparkles className="w-12 h-12 text-background" />
          </div>
          <div className="absolute -inset-2 bg-gradient-to-r from-primary via-secondary to-accent rounded-3xl opacity-30 blur-xl animate-pulse" />
        </div>

        <h1 className={`text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent transition-all duration-500 ${
          phase === 'text' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          DailyNova
        </h1>
        
        <p className={`mt-3 text-lg text-muted-foreground transition-all duration-500 delay-200 ${
          phase === 'text' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          Your personal productivity companion
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;