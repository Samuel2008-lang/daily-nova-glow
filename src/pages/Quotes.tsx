import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const quotes = [
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
  },
  {
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
  },
  {
    text: "Everything you've ever wanted is on the other side of fear.",
    author: "George Addair",
  },
  {
    text: "Success is not how high you have climbed, but how you make a positive difference to the world.",
    author: "Roy T. Bennett",
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
  },
  {
    text: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins",
  },
  {
    text: "Your time is limited, don't waste it living someone else's life.",
    author: "Steve Jobs",
  },
];

const Quotes = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

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
        </div>

        <Card className="glass glow-pink p-12 text-center mb-8 min-h-[300px] flex flex-col justify-center">
          <p className="text-2xl md:text-3xl italic text-foreground mb-6 leading-relaxed">
            "{currentQuote.text}"
          </p>
          <p className="text-lg text-accent font-medium">— {currentQuote.author}</p>
        </Card>

        <div className="flex justify-center">
          <Button
            onClick={nextQuote}
            size="lg"
            className="glow-pink group"
          >
            <RefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
            Next Quote
          </Button>
        </div>

        {/* Quote Counter */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Quote {currentIndex + 1} of {quotes.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Quotes;
