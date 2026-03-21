import { Home, FileText, CheckSquare, Target, BookOpen, Sparkles, BookMarked, Settings, MessageSquare } from "lucide-react";
import { NavLink } from "./NavLink";

const Navigation = () => {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/notes", icon: FileText, label: "Notes" },
    { to: "/tasks", icon: CheckSquare, label: "Tasks" },
    { to: "/habits", icon: Target, label: "Habits" },
    { to: "/diary", icon: BookOpen, label: "Diary" },
    { to: "/journal", icon: BookMarked, label: "Journal" },
    { to: "/quotes", icon: Sparkles, label: "Quotes" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-50 md:top-0 md:bottom-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around md:justify-center md:gap-8 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg transition-all duration-300 text-muted-foreground hover:text-primary"
                activeClassName="text-primary glow"
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs md:text-sm font-medium">{item.label}</span>
              </NavLink>
            );
          })}
          {/* Feedback - small, non-dominant */}
          <a
            href="mailto:hopeegbon28@gmail.com?subject=DailyNova%20Feedback"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-2 py-2 rounded-lg transition-all duration-300 text-muted-foreground/60 hover:text-primary opacity-70 hover:opacity-100"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px] md:text-xs font-medium">Feedback</span>
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
