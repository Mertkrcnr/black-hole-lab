import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

export function LabShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={180}>
      <div className="lab-shell">
        <header className="lab-header">
          <Link to="/" search={{ object: undefined }} className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-text">
              <span className="brand-kicker">ASTROPHYSICS LABORATORY</span>
              BLACK HOLE LAB
            </span>
          </Link>
          <nav className="top-nav" aria-label="Main navigation">
            <Link to="/" search={{ object: undefined }} activeOptions={{ exact: true }}>
              SIMULATION
            </Link>
            <Link to="/real-objects">REAL OBJECTS</Link>
            <Link to="/nasa-live">NASA LIVE</Link>
            <Link to="/about">ABOUT</Link>
          </nav>
          <div className="technical header-status flex items-center gap-3 text-muted-foreground">
            <span className="status-dot" />
            LAB ONLINE
            <span className="ml-4 text-muted-foreground/50">V 0.2.1</span>
          </div>
        </header>
        {children}
      </div>
    </TooltipProvider>
  );
}
