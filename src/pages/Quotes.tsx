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

const QUOTES_STORAGE_KEY = "daily-quotes";
const QUOTES_DATE_KEY = "daily-quotes-date";
const QUOTE_INDEX_KEY = "daily-quote-index";
const QUOTES_PAGE_KEY = "daily-quotes-page";
const ALL_QUOTES_KEY = "daily-quotes-all";

const Quotes = () => {
  const [allQuotes, setAllQuotes] = useState<Quote[]>(fallbackQuotes);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const { toast } = useToast();

  const PAGE_SIZE = 10;

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
      const savedDate = localStorage.getItem(QUOTES_DATE_KEY);
      const savedIndex = localStorage.getItem(QUOTE_INDEX_KEY);
      const savedPage = localStorage.getItem(QUOTES_PAGE_KEY);
      const today = new Date().toDateString();
      
      if (savedAllQuotes) {
        const parsed = JSON.parse(savedAllQuotes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllQuotes(parsed);
        }
      }
      
      // Check if it's a new day - reset to show first quote of first page
      if (savedDate !== today) {
        setCurrentIndex(0);
        setCurrentPage(0);
        setShowNavigation(false);
        localStorage.setItem(QUOTE_INDEX_KEY, "0");
        localStorage.setItem(QUOTES_PAGE_KEY, "0");
      } else {
        if (savedIndex) setCurrentIndex(parseInt(savedIndex, 10));
        if (savedPage) setCurrentPage(parseInt(savedPage, 10));
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
      const response = await fetch("https://zenquotes.io/api/quotes");
      
      if (!response.ok) throw new Error("Failed to fetch quotes");
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const newQuotes: Quote[] = data.map((q: any) => ({
          text: q.q || q.quote || q.text,
          author: q.a || q.author || "Unknown",
        }));
        
        // Store all fetched quotes (up to 50)
        setAllQuotes(newQuotes);
        setCurrentIndex(0);
        setCurrentPage(0);
        setShowNavigation(false);
        
        localStorage.setItem(ALL_QUOTES_KEY, JSON.stringify(newQuotes));
        localStorage.setItem(QUOTES_DATE_KEY, new Date().toDateString());
        localStorage.setItem(QUOTE_INDEX_KEY, "0");
        localStorage.setItem(QUOTES_PAGE_KEY, "0");
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      try {
        const altResponse = await fetch("https://api.quotable.io/quotes/random?limit=50");
        if (altResponse.ok) {
          const altData = await altResponse.json();
          if (Array.isArray(altData) && altData.length > 0) {
            const newQuotes: Quote[] = altData.map((q: any) => ({
              text: q.content,
              author: q.author,
            }));
            setAllQuotes(newQuotes);
            setCurrentIndex(0);
            setCurrentPage(0);
            setShowNavigation(false);
            
            localStorage.setItem(ALL_QUOTES_KEY, JSON.stringify(newQuotes));
            localStorage.setItem(QUOTES_DATE_KEY, new Date().toDateString());
            localStorage.setItem(QUOTE_INDEX_KEY, "0");
            localStorage.setItem(QUOTES_PAGE_KEY, "0");
            return;
          }
        }
      } catch {
        // Silent fail for alternative
      }
    } finally {
      setIsLoading(false);
    }
  };

  const seeMoreQuotes = () => {
    setShowNavigation(true);
  };

  const getCurrentPageQuotes = () => {
    const startIdx = currentPage * PAGE_SIZE;
    return allQuotes.slice(startIdx, startIdx + PAGE_SIZE);
  };

  const nextQuote = () => {
    const pageQuotes = getCurrentPageQuotes();
    const nextIdx = currentIndex + 1;
    
    if (nextIdx >= pageQuotes.length) {
      // Move to next page if available
      const nextPage = currentPage + 1;
      if (nextPage * PAGE_SIZE < allQuotes.length) {
        setCurrentPage(nextPage);
        setCurrentIndex(0);
        localStorage.setItem(QUOTES_PAGE_KEY, nextPage.toString());
        localStorage.setItem(QUOTE_INDEX_KEY, "0");
      } else {
        // Loop back to first page
        setCurrentPage(0);
        setCurrentIndex(0);
        localStorage.setItem(QUOTES_PAGE_KEY, "0");
        localStorage.setItem(QUOTE_INDEX_KEY, "0");
        toast({
          title: "All quotes viewed",
          description: "Starting from the beginning.",
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
    } else if (currentPage > 0) {
      // Go to previous page
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      const prevPageQuotes = allQuotes.slice(prevPage * PAGE_SIZE, (prevPage + 1) * PAGE_SIZE);
      const lastIdx = prevPageQuotes.length - 1;
      setCurrentIndex(lastIdx);
      localStorage.setItem(QUOTES_PAGE_KEY, prevPage.toString());
      localStorage.setItem(QUOTE_INDEX_KEY, lastIdx.toString());
    }
  };

  const shareQuote = async () => {
    const pageQuotes = getCurrentPageQuotes();
    const currentQuote = pageQuotes[currentIndex] || allQuotes[0];
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

  const pageQuotes = getCurrentPageQuotes();
  const currentQuote = pageQuotes[currentIndex] || allQuotes[0];
  const totalQuotes = allQuotes.length;
  const globalIndex = currentPage * PAGE_SIZE + currentIndex + 1;

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
          <p className="text-2xl md:text-3xl italic text-foreground mb-6 leading-relaxed">
            "{currentQuote.text}"
          </p>
          <p className="text-lg text-accent font-medium">— {currentQuote.author}</p>
        </Card>

        <div className="flex justify-center gap-4 flex-wrap">
          <Button
            onClick={shareQuote}
            size="lg"
            variant="outline"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share Quote
          </Button>
          
          {!showNavigation ? (
            <Button
              onClick={seeMoreQuotes}
              size="lg"
              className="glow-pink"
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
                disabled={currentPage === 0 && currentIndex === 0}
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Previous
              </Button>
              <Button
                onClick={nextQuote}
                size="lg"
                className="glow-pink group"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </>
          )}
        </div>

        {showNavigation && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Quote {globalIndex} of {totalQuotes}
            </p>
            {totalQuotes > PAGE_SIZE && (
              <p className="text-xs text-muted-foreground mt-1">
                Page {currentPage + 1} of {Math.ceil(totalQuotes / PAGE_SIZE)}
              </p>
            )}
          </div>
        )}
      </div>
      <BannerAd position="bottom" />
    </div>
  );
};

export default Quotes;