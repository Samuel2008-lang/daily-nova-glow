import { useState } from "react";
import { Home, FileText, CheckSquare, Target, Clock, MoreHorizontal, BookOpen, BookMarked, Sparkles, Settings, MessageSquare, X } from "lucide-react";
import { NavLink } from "./NavLink";

const Navigation = () => {
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/notes", icon: FileText, label: "Notes" },
    { to: "/tasks", icon: CheckSquare, label: "Tasks" },
    { to: "/habits", icon: Target, label: "Habits" },
    { to: "/timeline", icon: Clock, label: "Timeline" },
  ];

  const moreItems = [
    { to: "/diary", icon: BookOpen, label: "Diary" },
    { to: "/journal", icon: BookMarked, label: "Journal" },
    { to: "/quotes", icon: Sparkles, label: "Quotes" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-50 md:top-0 md:bottom-auto">
        <div className="container mx-auto px-2 md:px-4">
          <div className="flex items-center justify-around md:justify-center md:gap-4 py-2 md:py-3">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col md:flex-row items-center gap-0.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg transition-all duration-300 text-muted-foreground hover:text-primary flex-shrink-0"
                  activeClassName="text-primary glow"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] md:text-sm font-medium">{item.label}</span>
                </NavLink>
              );
            })}
            {/* More button */}
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg transition-all duration-300 flex-shrink-0 ${
                moreOpen ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {moreOpen ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
              <span className="text-[10px] md:text-sm font-medium">More</span>
            </button>
          </div>
        </div>
      </nav>

      {/* More menu overlay */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-16 md:top-16 md:bottom-auto left-0 right-0 z-50 flex justify-center px-4 animate-fade-in">
            <div className="glass border border-border/50 rounded-2xl p-3 w-full max-w-sm grid grid-cols-4 gap-2"
              style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.1)" }}
            >
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className="flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all duration-200 text-muted-foreground hover:text-primary hover:bg-muted/50"
                    activeClassName="text-primary bg-muted/50"
                    onClick={() => setMoreOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
              {/* Feedback in More */}
              <a
                href="mailto:hopeegbon28@gmail.com?subject=DailyNova%20Feedback"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all duration-200 text-muted-foreground hover:text-primary hover:bg-muted/50"
                onClick={() => setMoreOpen(false)}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-[11px] font-medium">Feedback</span>
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navigation;
