import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Wifi, WifiOff, Share2, ChevronLeft, ChevronRight } from "lucide-react";
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

const QUOTES_DATE_KEY = "daily-quotes-date";
const QUOTE_INDEX_KEY = "daily-quote-index";
const ALL_QUOTES_KEY = "daily-quotes-all";
const FETCH_COUNT_KEY = "daily-quotes-fetch-count";

const Quotes = () => {
  const [allQuotes, setAllQuotes] = useState<Quote[]>(fallbackQuotes);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
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
      const savedAllQuotes = localStorage.getItem(ALL_QUOTES_KEY);
      const savedIndex = localStorage.getItem(QUOTE_INDEX_KEY);
      
      if (savedAllQuotes) {
        const parsed = JSON.parse(savedAllQuotes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllQuotes(parsed);
        }
      }
      
      if (savedIndex) {
        setCurrentIndex(parseInt(savedIndex, 10));
      }
    } catch (error) {
      console.error("Error loading quotes:", error);
    }
  };

  const checkAndFetchDailyQuotes = async () => {
    const today = new Date().toDateString();
    const lastFetchDate = localStorage.getItem(QUOTES_DATE_KEY);
    
    // Fetch new quotes if it's a new day
    if (lastFetchDate !== today) {
      await fetchNewQuotes();
      localStorage.setItem(QUOTES_DATE_KEY, today);
      // Reset index for new day
      setCurrentIndex(0);
      localStorage.setItem(QUOTE_INDEX_KEY, "0");
    }
  };

  const fetchNewQuotes = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Connect to the internet to get new quotes.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      // Use random parameter to get different quotes each time
      const randomSeed = Date.now();
      const response = await fetch(`https://zenquotes.io/api/quotes?random=${randomSeed}`);
      
      if (!response.ok) throw new Error("Failed to fetch quotes");
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const newQuotes: Quote[] = data.map((q: any) => ({
          text: q.q || q.quote || q.text,
          author: q.a || q.author || "Unknown",
        }));
        
        setAllQuotes(newQuotes);
        localStorage.setItem(ALL_QUOTES_KEY, JSON.stringify(newQuotes));
        
        toast({
          title: "New quotes loaded!",
          description: `${newQuotes.length} fresh quotes ready for you.`,
        });
        
        return true;
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      
      // Try alternative API
      try {
        const altResponse = await fetch(`https://api.quotable.io/quotes/random?limit=10&seed=${Date.now()}`);
        if (altResponse.ok) {
          const altData = await altResponse.json();
          if (Array.isArray(altData) && altData.length > 0) {
            const newQuotes: Quote[] = altData.map((q: any) => ({
              text: q.content,
              author: q.author,
            }));
            setAllQuotes(newQuotes);
            localStorage.setItem(ALL_QUOTES_KEY, JSON.stringify(newQuotes));
            
            toast({
              title: "New quotes loaded!",
              description: `${newQuotes.length} fresh quotes ready.`,
            });
            return true;
          }
        }
      } catch {
        console.error("Alternative API also failed");
      }
      
      toast({
        title: "Couldn't fetch new quotes",
        description: "Using cached quotes instead.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const seeMoreQuotes = () => {
    setShowNavigation(true);
  };

  const nextQuote = async () => {
    const nextIdx = currentIndex + 1;
    
    if (nextIdx >= allQuotes.length) {
      // All quotes exhausted - fetch new ones
      if (isOnline) {
        toast({
          title: "Loading new quotes...",
          description: "Fetching a fresh set of quotes for you.",
        });
        
        const success = await fetchNewQuotes();
        if (success) {
          setCurrentIndex(0);
          localStorage.setItem(QUOTE_INDEX_KEY, "0");
        }
      } else {
        // Offline - loop back to start
        setCurrentIndex(0);
        localStorage.setItem(QUOTE_INDEX_KEY, "0");
        toast({
          title: "Starting from beginning",
          description: "Connect to internet for new quotes.",
        });
      }
    } else {
      setCurrentIndex(nextIdx);
      localStorage.setItem(QUOTE_INDEX_KEY, nextIdx.toString());
    }
  };

  const prevQuote = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      localStorage.setItem(QUOTE_INDEX_KEY, newIndex.toString());
    }
  };

  const shareQuote = async () => {
    const currentQuote = allQuotes[currentIndex] || allQuotes[0];
    const shareText = `"${currentQuote.text}" — ${currentQuote.author}\n\nShared from DailyNova`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Quote of the Day",
          text: shareText,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    
    try {
      await navigator.clipboard.writeText(shareText);
      toast({ title: "Copied!", description: "Quote copied to clipboard." });
    } catch {
      toast({ title: "Error", description: "Could not share quote.", variant: "destructive" });
    }
  };

  const currentQuote = allQuotes[currentIndex] || allQuotes[0];

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <Sparkles className="w-16 h-16 text-accent animate-pulse-glow" />
          </div>
          <h1 className="text-4xl font-bold text-accent">Quote of the Day</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-success" />
            ) : (
              <WifiOff className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        <Card className="glass glow-pink p-12 text-center mb-8 min-h-[300px] flex flex-col justify-center">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-accent" />
              <span className="text-muted-foreground">Loading new quotes...</span>
            </div>
          ) : (
            <>
              <p className="text-2xl md:text-3xl italic text-foreground mb-6 leading-relaxed">
                "{currentQuote.text}"
              </p>
              <p className="text-lg text-accent font-medium">— {currentQuote.author}</p>
            </>
          )}
        </Card>

        <div className="flex justify-center gap-4 flex-wrap">
          <Button
            onClick={shareQuote}
            size="lg"
            variant="outline"
            disabled={isLoading}
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share Quote
          </Button>
          
          {!showNavigation ? (
            <Button
              onClick={seeMoreQuotes}
              size="lg"
              className="glow-pink"
              disabled={isLoading}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              See More Quotes
            </Button>
          ) : (
            <>
              <Button
                onClick={prevQuote}
                size="lg"
                variant="outline"
                disabled={currentIndex === 0 || isLoading}
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Previous
              </Button>
              <Button
                onClick={nextQuote}
                size="lg"
                className="glow-pink group"
                disabled={isLoading}
              >
                {currentIndex >= allQuotes.length - 1 ? "Load New" : "Next"}
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </>
          )}
        </div>

        {showNavigation && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Quote {currentIndex + 1} of {allQuotes.length}
            </p>
          </div>
        )}
      </div>
      <BannerAd position="bottom" />
    </div>
  );
};

export default Quotes;
