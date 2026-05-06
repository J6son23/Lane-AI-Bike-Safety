import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BadgeLogo } from "@/components/BadgeLogo";
import { WatchApp } from "@/components/WatchApp";

const queryClient = new QueryClient();

function Home() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Back to City Services */}
      <div className="px-6 pt-5">
        <button
          onClick={() => { window.location.href = "/"; }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          City Services
        </button>
      </div>
      <div className="flex-1 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-12 items-center">
        
        {/* Left Column: Branding */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6">
          <BadgeLogo className="w-24 h-24 text-foreground mb-4" />
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            Pedal Patrol
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-md">
            Report bike lane hazards, right from your wrist.
          </p>
          
          <div className="space-y-4 mt-8 text-sm md:text-base text-foreground/80 max-w-md bg-secondary/30 p-6 rounded-2xl border border-border/50">
            <div className="flex items-start gap-3">
              <div className="bg-primary/20 p-1.5 rounded text-primary mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <p><strong>Official but lightweight.</strong> Acts like a city inspector tool, without the bureaucracy.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/20 p-1.5 rounded text-primary mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              </div>
              <p><strong>Designed for motion.</strong> Big tap targets, voice input, one-touch submission.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Watch Frame */}
        <div id="watch-preview" className="flex justify-center items-center py-12">
          {/* Apple Watch Hardware Frame */}
          <div className="relative w-[230px] h-[280px] bg-[#111] rounded-[50px] shadow-[0_20px_40px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.5)] border-4 border-[#222] flex items-center justify-center p-1">
            
            {/* Digital Crown */}
            <div className="absolute -right-[12px] top-[60px] w-[10px] h-[30px] bg-[#222] rounded-r-md border-y border-r border-[#444] shadow-sm"></div>
            {/* Side Button */}
            <div className="absolute -right-[8px] top-[110px] w-[6px] h-[40px] bg-[#222] rounded-r-sm border-y border-r border-[#444] shadow-sm"></div>

            {/* Screen Glass */}
            <div className="relative w-full h-full bg-black rounded-[42px] overflow-hidden flex items-center justify-center border border-white/5 shadow-inner">
              
              {/* Gloss / Reflection effect */}
              <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-50"></div>

              {/* Actual Watch App UI */}
              <WatchApp />

            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
