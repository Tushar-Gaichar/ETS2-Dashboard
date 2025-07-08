import { Link, useLocation } from "wouter";
import { BarChart3, Map, Gamepad2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNavigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: BarChart3, label: "Dashboard" },
    { href: "/map", icon: Map, label: "Map" },
    { href: "/controls", icon: Gamepad2, label: "Controls" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-light">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}