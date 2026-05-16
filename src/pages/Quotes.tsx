import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Wifi, WifiOff, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RewardedAdButton } from "@/components/RewardedAdButton";
import { BannerAd } from "@/components/BannerAd";
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

const ALL_QUOTES_KEY = "daily-quotes-all";
const QUOTES_DATE_KEY = "daily-quotes-date";
const QUOTE_INDEX_KEY = "daily-quote-index";
const SEEN_QUOTES_KEY = "daily-quotes-seen"; // tracks deleted quote texts to prevent re-appearance
const DAILY_QUOTE_LIMIT = 1;
const REWARDED_QUOTE_COUNT = 2; // ad gives 2 bonus quotes
const SESSION_CAP = 5;          // max quotes per day (1 daily + up to 4 from ads)
const MAX_STORED_QUOTES = 21;
const CLEANUP_COUNT = 9;
const CLEANUP_INTERVAL_DAYS = 7;
const QUOTES_CLEANUP_KEY = "daily-quotes-cleanup-date";

const Quotes = () => {
  const [allQuotes, setAllQuotes] = useState<Quote[]>(fallbackQuotes);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [dailyQuotesFetched, setDailyQuotesFetched] = useState(false);
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
    if (isOnline && !dailyQuotesFetched) {
      checkAndFetchDailyQuotes();
    }
  }, [isOnline]);

  const loadQuotes = () => {
    try {
      const today = new Date().toDateString();
      const savedAllQuotes = localStorage.getItem(ALL_QUOTES_KEY);
      const savedIndex = localStorage.getItem(QUOTE_INDEX_KEY);
      const lastFetchDate = localStorage.getItem(QUOTES_DATE_KEY);
      let loadedQuotes = [fallbackQuotes[new Date().getDate() % fallbackQuotes.length]];
      if (savedAllQuotes) {
        const parsed = JSON.parse(savedAllQuotes);
        if (Array.isArray(parsed) && parsed.length > 0 && lastFetchDate === today) loadedQuotes = parsed;
      }
      setAllQuotes(loadedQuotes);
      if (savedIndex) setCurrentIndex(Math.min(parseInt(savedIndex, 10), loadedQuotes.length - 1));
      if (lastFetchDate === today) setDailyQuotesFetched(true);
    } catch (error) {
      console.error("Error loading quotes:", error);
    }
  };

  /** Get set of previously-deleted quote texts */
  const getSeenQuotes = (): Set<string> => {
    try {
      const raw = localStorage.getItem(SEEN_QUOTES_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  };

  const addToSeen = (texts: string[]) => {
    const seen = getSeenQuotes();
    texts.forEach(t => seen.add(t));
    // Keep seen list manageable (max 200)
    const arr = Array.from(seen);
    if (arr.length > 200) arr.splice(0, arr.length - 200);
    localStorage.setItem(SEEN_QUOTES_KEY, JSON.stringify(arr));
  };

  /** Enforce max stored quotes + weekly auto-cleanup of oldest 9 */
  const enforceStorageLimit = (quotes: Quote[]): Quote[] => {
    let result = quotes;

    const lastCleanup = localStorage.getItem(QUOTES_CLEANUP_KEY);
    const now = Date.now();
    const lastCleanupTime = lastCleanup ? parseInt(lastCleanup, 10) : 0;
    const daysSinceCleanup = (now - lastCleanupTime) / (1000 * 60 * 60 * 24);

    if (daysSinceCleanup >= CLEANUP_INTERVAL_DAYS && result.length > CLEANUP_COUNT) {
      const removed = result.slice(0, CLEANUP_COUNT);
      addToSeen(removed.map(q => q.text));
      result = result.slice(CLEANUP_COUNT);
      localStorage.setItem(QUOTES_CLEANUP_KEY, String(now));
    }

    // Hard cap at 21
    if (result.length > MAX_STORED_QUOTES) {
      const removed = result.slice(0, result.length - MAX_STORED_QUOTES);
      addToSeen(removed.map(q => q.text));
      result = result.slice(result.length - MAX_STORED_QUOTES);
    }

    localStorage.setItem(ALL_QUOTES_KEY, JSON.stringify(result));
    return result;
  };

  const checkAndFetchDailyQuotes = async () => {
    const today = new Date().toDateString();
    const lastFetchDate = localStorage.getItem(QUOTES_DATE_KEY);
    if (lastFetchDate !== today) {
      const success = await fetchNewQuotes(DAILY_QUOTE_LIMIT, true);
      if (success) {
        localStorage.setItem(QUOTES_DATE_KEY, today);
        setDailyQuotesFetched(true);
        setCurrentIndex(0);
        localStorage.setItem(QUOTE_INDEX_KEY, "0");
      }
    }
  };

  const fetchNewQuotes = async (count = DAILY_QUOTE_LIMIT, replaceToday = false, retries = 3): Promise<boolean> => {
    if (!isOnline) {
      toast({ title: "Offline", description: "Connect to the internet to get new quotes.", variant: "destructive" });
      return false;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-quotes");

      if (error) {
        if (retries > 0) {
          console.log(`Retrying fetch-quotes... (${retries} left)`);
          await new Promise(r => setTimeout(r, 2000));
          setIsLoading(false);
          return fetchNewQuotes(count, replaceToday, retries - 1);
        }
        throw error;
      }

      if (data?.quotes && Array.isArray(data.quotes) && data.quotes.length > 0) {
        const seen = getSeenQuotes();
        const newQuotes: Quote[] = data.quotes.map((q: any) => ({
          text: q.text || q.q || "",
          author: q.author || q.a || "Unknown",
        })).filter((q: Quote) => q.text && !seen.has(q.text)); // filter out previously-seen quotes

        const pickedQuotes = newQuotes.slice(0, count);

        if (pickedQuotes.length > 0) {
          const existing = replaceToday ? [] : allQuotes;
          const merged = [...existing, ...pickedQuotes];
          const unique = merged.filter((q, i, arr) => arr.findIndex(x => x.text === q.text) === i);
          const final = enforceStorageLimit(unique);
          setAllQuotes(final);
          localStorage.setItem(ALL_QUOTES_KEY, JSON.stringify(final));
          const nextIndex = replaceToday ? 0 : Math.max(0, final.length - pickedQuotes.length);
          setCurrentIndex(nextIndex);
          localStorage.setItem(QUOTE_INDEX_KEY, String(nextIndex));
          toast({ title: "New quotes loaded!", description: `${pickedQuotes.length} fresh quote${pickedQuotes.length === 1 ? "" : "s"} ready.` });
          return true;
        }
      }

      // If we got here, no new unique quotes — try again
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 2000));
        setIsLoading(false);
        return fetchNewQuotes(count, replaceToday, retries - 1);
      }
      throw new Error("No new quotes available");
    } catch (error) {
      console.error("Error fetching quotes:", error);
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 2000));
        setIsLoading(false);
        return fetchNewQuotes(count, replaceToday, retries - 1);
      }
      toast({ title: "Couldn't fetch new quotes", description: "Using cached quotes instead.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const handleBonusQuoteReward = async () => {
    if (allQuotes.length >= SESSION_CAP) {
      toast({ title: "Daily limit reached", description: `You've unlocked all ${SESSION_CAP} quotes for today. Come back tomorrow!` });
      return;
    }
    const remaining = SESSION_CAP - allQuotes.length;
    const want = Math.min(REWARDED_QUOTE_COUNT, remaining);
    const success = await fetchNewQuotes(want, false);
    if (!success) {
      toast({ title: "Using cached quotes", description: "New quotes will load when connection is available." });
    }
  };

  const seeMoreQuotes = () => setShowNavigation(true);

  const nextQuote = async () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= allQuotes.length) {
      if (allQuotes.length >= SESSION_CAP) {
        toast({ title: "Daily limit reached", description: `Come back tomorrow for fresh quotes.` });
      } else {
        toast({ title: "Watch an ad to unlock more quotes", description: `You have ${allQuotes.length}/${SESSION_CAP} today.` });
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
              {isOnline ? "Online" : "Offline — browsing cached quotes"}
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
                Next
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </>
          )}
        </div>

        {isOnline ? (
          <div className="flex justify-center mt-4">
            <RewardedAdButton
              onReward={handleBonusQuoteReward}
              label={
                allQuotes.length >= SESSION_CAP
                  ? `Daily limit reached (${SESSION_CAP}/${SESSION_CAP})`
                  : `Watch Ad for More Quotes (${allQuotes.length}/${SESSION_CAP})`
              }
            />
          </div>
        ) : (
          <div className="flex justify-center mt-4">
            <p className="text-xs text-muted-foreground italic">
              You're offline — ads paused. Browsing cached quotes.
            </p>
          </div>
        )}

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
