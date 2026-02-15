import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Wifi, WifiOff, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BannerAd } from "@/components/BannerAd";
import { RewardedAdButton } from "@/components/RewardedAdButton";
import { useQuoteShareImage } from "@/components/QuoteShareImage";
import { supabase } from "@/integrations/supabase/client";

interface Quote {
  text: string;
  author: string;
}

const fallbackQuotes: Quote[] = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
];

const QUOTES_DATE_KEY = "daily-quotes-date";
const QUOTE_INDEX_KEY = "daily-quote-index";
const ALL_QUOTES_KEY = "daily-quotes-all";

const Quotes = () => {
  const [allQuotes, setAllQuotes] = useState<Quote[]>(fallbackQuotes);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const { toast } = useToast();
  const { shareAsImage } = useQuoteShareImage();

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
        if (Array.isArray(parsed) && parsed.length > 0) setAllQuotes(parsed);
      }
      if (savedIndex) setCurrentIndex(parseInt(savedIndex, 10));
    } catch (error) {
      console.error("Error loading quotes:", error);
    }
  };

  const checkAndFetchDailyQuotes = async () => {
    const today = new Date().toDateString();
    const lastFetchDate = localStorage.getItem(QUOTES_DATE_KEY);
    if (lastFetchDate !== today) {
      await fetchNewQuotes();
      localStorage.setItem(QUOTES_DATE_KEY, today);
      setCurrentIndex(0);
      localStorage.setItem(QUOTE_INDEX_KEY, "0");
    }
  };

  const fetchNewQuotes = async () => {
    if (!isOnline) {
      toast({ title: "Offline", description: "Connect to the internet to get new quotes.", variant: "destructive" });
      return false;
    }

    setIsLoading(true);
    try {
      // Use edge function to avoid CORS issues
      const { data, error } = await supabase.functions.invoke("fetch-quotes");

      if (error) throw error;

      if (data?.quotes && Array.isArray(data.quotes) && data.quotes.length > 0) {
        const newQuotes: Quote[] = data.quotes.map((q: any) => ({
          text: q.text || q.q || "",
          author: q.author || q.a || "Unknown",
        })).filter((q: Quote) => q.text);

        if (newQuotes.length > 0) {
          setAllQuotes(newQuotes);
          localStorage.setItem(ALL_QUOTES_KEY, JSON.stringify(newQuotes));
          toast({ title: "New quotes loaded!", description: `${newQuotes.length} fresh quotes ready.` });
          return true;
        }
      }

      throw new Error("No quotes returned");
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast({ title: "Couldn't fetch new quotes", description: "Using cached quotes instead.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const seeMoreQuotes = () => setShowNavigation(true);

  const nextQuote = async () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= allQuotes.length) {
      if (isOnline) {
        const success = await fetchNewQuotes();
        if (success) {
          setCurrentIndex(0);
          localStorage.setItem(QUOTE_INDEX_KEY, "0");
        }
      } else {
        setCurrentIndex(0);
        localStorage.setItem(QUOTE_INDEX_KEY, "0");
        toast({ title: "Starting from beginning", description: "Connect to internet for new quotes." });
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

  const handleShare = async () => {
    const currentQuote = allQuotes[currentIndex] || allQuotes[0];
    await shareAsImage(currentQuote.text, currentQuote.author);
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
          <Button onClick={handleShare} size="lg" variant="outline" disabled={isLoading}>
            <Share2 className="w-5 h-5 mr-2" />
            Share Quote
          </Button>
          
          {!showNavigation ? (
            <Button onClick={seeMoreQuotes} size="lg" className="glow-pink" disabled={isLoading}>
              <Sparkles className="w-5 h-5 mr-2" />
              See More Quotes
            </Button>
          ) : (
            <>
              <Button onClick={prevQuote} size="lg" variant="outline" disabled={currentIndex === 0 || isLoading}>
                <ChevronLeft className="w-5 h-5 mr-1" />
                Previous
              </Button>
              <Button onClick={nextQuote} size="lg" className="glow-pink group" disabled={isLoading}>
                {currentIndex >= allQuotes.length - 1 ? "Load New" : "Next"}
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </>
          )}
        </div>

        <div className="flex justify-center mt-4">
          <RewardedAdButton onReward={() => fetchNewQuotes()} label="Watch Ad for Bonus Quotes" />
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
