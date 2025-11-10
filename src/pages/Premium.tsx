import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Premium = () => {
  const freeFeatures = [
    "Basic notes and tasks",
    "Voice input",
    "Daily diary entries",
    "Basic AI assistance",
    "5 habits tracking",
  ];

  const premiumFeatures = [
    "Unlimited AI conversations",
    "Advanced AI insights & analysis",
    "Unlimited habits tracking",
    "Export all data",
    "Priority voice processing",
    "Custom themes",
    "Mood analytics & trends",
    "Goal setting & tracking",
    "Cloud backup & sync",
    "No ads",
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-primary to-secondary">
            <Crown className="w-3 h-3 mr-1" />
            Premium
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Unlock Your Full Potential
          </h1>
          <p className="text-lg text-muted-foreground">
            Supercharge your productivity with DailyNova Premium
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Free Plan */}
          <Card className="glass p-8 border-border/50">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">Perfect for getting started</p>
            </div>

            <ul className="space-y-3 mb-8">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full" disabled>
              Current Plan
            </Button>
          </Card>

          {/* Premium Plan */}
          <Card className="glass glow-purple p-8 border-secondary/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-secondary/20 to-transparent rounded-bl-full" />
            
            <div className="mb-6 relative">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-secondary" />
                <h3 className="text-2xl font-bold">Premium</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-secondary">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">Everything you need to thrive</p>
            </div>

            <ul className="space-y-3 mb-8">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button className="w-full glow-purple text-lg h-12">
              <Zap className="w-5 h-5 mr-2" />
              Upgrade to Premium
            </Button>
          </Card>
        </div>

        {/* Why Premium Section */}
        <Card className="glass p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Why Go Premium?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Unlimited AI Power</h3>
              <p className="text-sm text-muted-foreground">
                Get unlimited access to advanced AI features for deeper insights and better productivity
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold mb-2">Enhanced Features</h3>
              <p className="text-sm text-muted-foreground">
                Unlock powerful tools like mood analytics, goal tracking, and cloud sync
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Priority Support</h3>
              <p className="text-sm text-muted-foreground">
                Get priority processing for voice commands and dedicated customer support
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Premium;
