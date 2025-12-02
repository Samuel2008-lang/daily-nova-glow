import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BannerAd } from "@/components/BannerAd";

interface Quote {
  text: string;
  author: string;
}

const fallbackQuotes: Quote[] = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Success is not how high you have climbed, but how you make a positive difference to the world.", author: "Roy T. Bennett" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
];

const QUOTES_STORAGE_KEY = "daily-quotes";
const QUOTES_DATE_KEY = "daily-quotes-date";

const Quotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>(fallbackQuotes);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    if (isOnline) {
      checkAndFetchDailyQuotes();
    }
  }, [isOnline]);

  const loadQuotes = () => {
    try {
      const savedQuotes = localStorage.getItem(QUOTES_STORAGE_KEY);
      if (savedQuotes) {
        const parsed = JSON.parse(savedQuotes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuotes(parsed);
        }
      }
    } catch (error) {
      console.error("Error loading quotes:", error);
    }
  };

  const checkAndFetchDailyQuotes = async () => {
    const today = new Date().toDateString();
    const lastFetchDate = localStorage.getItem(QUOTES_DATE_KEY);
    
    if (lastFetchDate !== today) {
      await fetchNewQuotes();
    }
  };

  const fetchNewQuotes = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Connect to the internet to get new quotes.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Using ZenQuotes API (free, no auth required)
      const response = await fetch("https://zenquotes.io/api/quotes");
      
      if (!response.ok) throw new Error("Failed to fetch quotes");
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const newQuotes: Quote[] = data.slice(0, 10).map((q: any) => ({
          text: q.q || q.quote || q.text,
          author: q.a || q.author || "Unknown",
        }));
        
        setQuotes(newQuotes);
        setCurrentIndex(0);
        localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(newQuotes));
        localStorage.setItem(QUOTES_DATE_KEY, new Date().toDateString());
        
        toast({
          title: "Quotes updated!",
          description: "10 new inspirational quotes loaded.",
        });
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      // Try alternative API
      try {
        const altResponse = await fetch("https://api.quotable.io/quotes/random?limit=10");
        if (altResponse.ok) {
          const altData = await altResponse.json();
          if (Array.isArray(altData) && altData.length > 0) {
            const newQuotes: Quote[] = altData.map((q: any) => ({
              text: q.content,
              author: q.author,
            }));
            setQuotes(newQuotes);
            setCurrentIndex(0);
            localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(newQuotes));
            localStorage.setItem(QUOTES_DATE_KEY, new Date().toDateString());
            toast({
              title: "Quotes updated!",
              description: "10 new inspirational quotes loaded.",
            });
            return;
          }
        }
      } catch {
        // Silent fail for alternative
      }
      
      toast({
        title: "Using saved quotes",
        description: "Couldn't fetch new quotes. Showing saved ones.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextQuote = () => {
    setCurrentIndex((prev) => (prev + 1) % quotes.length);
  };

  const currentQuote = quotes[currentIndex];

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <Sparkles className="w-16 h-16 text-accent animate-pulse-glow" />
          </div>
          <h1 className="text-4xl font-bold text-accent">Daily Inspiration</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        <Card className="glass glow-pink p-12 text-center mb-8 min-h-[300px] flex flex-col justify-center">
          <p className="text-2xl md:text-3xl italic text-foreground mb-6 leading-relaxed">
            "{currentQuote.text}"
          </p>
          <p className="text-lg text-accent font-medium">— {currentQuote.author}</p>
        </Card>

        <div className="flex justify-center gap-4">
          <Button
            onClick={nextQuote}
            size="lg"
            className="glow-pink group"
          >
            <RefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
            Next Quote
          </Button>
          
          {isOnline && (
            <Button
              onClick={fetchNewQuotes}
              size="lg"
              variant="outline"
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              Get New Quotes
            </Button>
          )}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Quote {currentIndex + 1} of {quotes.length}
          </p>
        </div>
      </div>
      <BannerAd position="bottom" />
    </div>
  );
};

export default Quotes;
