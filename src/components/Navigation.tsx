import { Home, FileText, CheckSquare, Target, BookOpen, Sparkles } from "lucide-react";
import { NavLink } from "./NavLink";

const Navigation = () => {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/notes", icon: FileText, label: "Notes" },
    { to: "/tasks", icon: CheckSquare, label: "Tasks" },
    { to: "/habits", icon: Target, label: "Habits" },
    { to: "/journal", icon: BookOpen, label: "Journal" },
    { to: "/quotes", icon: Sparkles, label: "Quotes" },
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
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
