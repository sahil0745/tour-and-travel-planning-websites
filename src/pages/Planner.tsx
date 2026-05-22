import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { showToast } from "../components/Toast";

gsap.registerPlugin(ScrollTrigger);

function AnimatedPrice({ value, className = "", prefix = "₹" }: { value: number; className?: string; prefix?: string }) {
  const numRef = React.useRef<HTMLSpanElement>(null);
  const valRef = React.useRef({ val: value });

  useGSAP(() => {
    gsap.to(valRef.current, {
      val: value,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        if (numRef.current) {
          numRef.current.innerText = prefix + Math.round(valRef.current.val).toLocaleString();
        }
      }
    });
  }, [value]);

  return <span ref={numRef} className={className}>{prefix}{value.toLocaleString()}</span>;
}
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plane, MapPin, Calendar, Users, Wallet, Loader2, Navigation,
  Hotel, Utensils, Ticket, GripVertical, TrendingDown, AlertTriangle,
  Lightbulb, Leaf, BadgeIndianRupee, ArrowRightLeft, UtensilsCrossed, Save, Check, ChevronDown, Bus, Footprints, CloudRain, Car
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import MapView from "../components/MapView";
import type { OptimizedTripPlan, TravelMood } from "../types";
import AntigravityScoreCard from "../components/AntigravityScore";
import MoodSelector from "../components/MoodSelector";
import { calculateTripScore } from "../lib/antigravityEngine";
import { useAuthStore, useTripStore } from "../store";

const formSchema = z.object({
  budget: z.number().min(5000, "Minimum ₹5,000"),
  days: z.number().min(1).max(30),
  travelers: z.number().min(1).max(20),
  travelType: z.enum(["Luxury", "Budget", "Adventure", "Family"]),
  fromLocation: z.string().min(3, "Required"),
  destination: z.string().min(3, "Required"),
  transport: z.enum(["Flight", "Train", "Bus", "Car"]),
});

type FormData = z.infer<typeof formSchema>;
const CHART_COLORS = ["#06B6D4", "#F97316", "#1E3A8A", "#8b5cf6", "#EF4444", "#10B981"];

const SmartRouteMap = ({ from, destination }: { from: string, destination: string }) => {
  useGSAP(() => {
    gsap.fromTo(".step", 
      { y: 80, opacity: 0 }, 
      { y: 0, opacity: 1, stagger: 0.15, duration: 0.7, ease: "power4.out" }
    );
  }, []);

  const steps = [
    { type: "Flight", route: `${from} → Hub`, icon: <Plane className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />, provider: "IndiGo AI-602", time: "08:30 AM (2h)", seats: "4 Seats Available", textCol: "text-blue-400", bgCol: "bg-blue-500/10", badge: "Fastest ⚡" },
    { type: "Car", route: "Airport → Station", icon: <Car className="w-8 h-8 text-yellow-400 group-hover:scale-110 transition-transform" />, provider: "Uber Premier", time: "Est: 45m travel time", seats: "High Availability", textCol: "text-[var(--color-success)]", bgCol: "bg-[var(--color-success)]/10", badge: "" },
    { type: "Train", route: "Hub → Central", icon: <TrendingDown className="w-8 h-8 text-orange-400 group-hover:scale-110 transition-transform" />, provider: "Vande Bharat", time: "12:15 PM (6h)", seats: "WL-2 (High)", textCol: "text-yellow-500", bgCol: "bg-yellow-500/10", badge: "Eco 🌱" },
    { type: "Bus", route: "Central → Local Area", icon: <Bus className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />, provider: "Volvo AC", time: "19:00 PM (1h)", seats: "12 Seats Available", textCol: "text-[var(--color-teal)]", bgCol: "bg-[var(--color-teal)]/10", badge: "Cheapest 💰" },
    { type: "Walk", route: "Local Area → Hotel", icon: <Footprints className="w-8 h-8 text-gray-300 group-hover:scale-110 transition-transform" />, provider: "Self", time: "15 mins walk", seats: "Direct Walk", textCol: "text-gray-300", bgCol: "bg-white/10", badge: "" }
  ];

  return (
    <motion.div id="route-panel" key="transport" initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="result-card glass-card p-6 md:p-8 rounded-3xl overflow-hidden mt-6">
      <h2 className="text-2xl font-semibold mb-2 font-display text-[var(--color-teal)] relative z-10 bg-inherit">Smart Route Plan</h2>
      <p className="mt-2 mb-8 text-sm text-[var(--color-cyan-glow)]">
        AI created this route because no direct train exists. This reduces cost by ₹6500 and saves 3 hours.
      </p>
      
      {/* Scrollable Container */}
      <div className="w-full overflow-x-auto pb-16 pt-4 scrollbar-hide snap-x relative mask-fade-edges">
        <div className="flex items-center min-w-max gap-6 px-4 route-container relative">
          
          {/* Animated Flow Line Container */}
          <div className="absolute top-1/2 left-8 right-8 h-[3px] -translate-y-1/2 z-0 route-flow hidden md:block" />

          {steps.map((step, i) => (
            <div key={i} className="step group relative flex flex-col items-center justify-center p-6 glass rounded-2xl w-[170px] shrink-0 snap-center bg-[var(--color-navy)]/90 backdrop-blur-md border border-[var(--color-border)] hover:-translate-y-2 hover:border-[var(--color-teal)] hover:shadow-[0_10px_30px_rgba(6,182,212,0.3)] transition-all duration-300 cursor-pointer z-10">
              {step.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full bg-[var(--color-navy)] border border-white/20 whitespace-nowrap shadow-lg backdrop-blur-md z-20">{step.badge}</span>
              )}
              <span className="text-3xl mb-4 flex">{step.icon}</span>
              <span className="font-semibold text-base mb-1.5">{step.type}</span>
              <span className="text-[11px] text-[var(--color-text-secondary)] font-medium bg-white/5 px-3 py-1.5 rounded-full text-center tracking-wide">{step.route}</span>
              
              {/* Hover Details Card */}
              <div className="absolute top-[108%] left-1/2 -translate-x-1/2 w-[220px] p-4 rounded-xl bg-[var(--color-ocean)] border border-[var(--color-teal)]/40 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 z-50 shadow-2xl scale-95 group-hover:scale-100 origin-top">
                 <div className="flex items-center justify-center mb-2 pb-2 border-b border-white/10"><p className="text-sm font-bold text-white tracking-wide uppercase">{step.provider}</p></div>
                 <p className="text-xs text-[var(--color-text-secondary)] text-center">{step.time}</p>
                 <p className={`text-xs font-semibold mt-3 px-2 py-1.5 rounded-md text-center ${step.bgCol} ${step.textCol}`}>{step.seats}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 pt-5 border-t border-[var(--color-border)] flex flex-wrap gap-4">
        <span className="px-5 py-2 text-xs rounded-full bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/40 font-semibold tracking-wide flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse"><AlertTriangle className="w-3.5 h-3.5"/> Delay risk: Medium</span>
        <span className="px-5 py-2 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 font-semibold tracking-wide flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]"><CloudRain className="w-3.5 h-3.5"/> Weather impact: Low</span>
      </div>
    </motion.div>
  );
};

const SmartTickets = () => {
  const [activeTab, setActiveTab] = useState("Transport Tickets");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [booking, setBooking] = useState<string | null>(null);
  
  const ticketsMap: Record<string, any[]> = {
    "Transport Tickets": [
      { name: "IndiGo AI-602 Flight", route: "Mumbai → Goa", price: 4200, time: "08:30 AM", provider: "MakeMyTrip", seats: "4 Left", trend: "up", refund: "Non-Refundable", seatType: "Economy / Window", bgTime: "bg-blue-500/10 text-blue-400" },
      { name: "Vande Bharat Express", route: "Hub → Station", price: 1540, time: "12:15 PM", provider: "IRCTC", seats: "WL-2", trend: "down", refund: "Free Cancellation", seatType: "AC CC", bgTime: "bg-[var(--color-teal)]/10 text-[var(--color-teal)]" }
    ],
    "Activity Tickets": [
      { name: "Fort Exploration Guided Tour", route: "Historical Site", price: 200, time: "Flexible", provider: "Goa Tourism", seats: "Available", trend: "stable", refund: "Free Cancellation 24h", seatType: "General Admission", bgTime: "bg-orange-500/10 text-orange-400" },
      { name: "Scuba Diving Pass", route: "Grande Island", price: 2500, time: "07:00 AM", provider: "OceanAdventures", seats: "12 Left", trend: "up", refund: "Partial Refund", seatType: "Premium Gear Included", bgTime: "bg-purple-500/10 text-purple-400" }
    ],
    "Combo Passes": [
      { name: "South Goa Explorer Pass", route: "Includes Travel + Entry", price: 1200, time: "Valid 3 Days", provider: "Goa Miles", seats: "Unlimited", trend: "stable", refund: "Non-Refundable", seatType: "All-Access Wristband", bgTime: "bg-yellow-500/10 text-yellow-500" }
    ]
  };

  const tickets = ticketsMap[activeTab] || [];

  const handleBook = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setBooking(name);
    setTimeout(() => setBooking(null), 3000);
  };

  return (
    <motion.div id="tickets-panel" key="entry" initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="result-card glass-card p-6 md:p-8 rounded-3xl mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h2 className="text-2xl font-semibold flex items-center gap-3 font-display text-[var(--color-teal)]">
          <Ticket className="w-6 h-6" /> Tickets & Booking Hub
        </h2>
        <motion.button whileTap={{ scale: 0.95 }} className="bg-gradient-to-r from-[var(--color-grad-1)] to-[var(--color-teal)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-[0_4px_20px_rgba(6,182,212,0.4)] transition-all hover:-translate-y-0.5 whitespace-nowrap">
          <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Book Complete Journey</span>
        </motion.button>
      </div>
      
      {/* Segmented Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl w-full sm:w-fit border border-[var(--color-border)] shrink-0">
        {["Transport Tickets", "Activity Tickets", "Combo Passes"].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setExpandedTicket(null); }}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === tab ? "bg-[var(--color-teal)] text-white shadow-[0_4px_15px_rgba(13,148,136,0.3)] scale-[1.02]" : "text-[var(--color-text-secondary)] hover:text-white"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {tickets.map((t, i) => {
            const isExpanded = expandedTicket === t.name;
            const isBooking = booking === t.name;
            return (
            <motion.div key={t.name}
              layout
              onClick={() => setExpandedTicket(isExpanded ? null : t.name)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.1, ease: "easeOut" }}
              className={`ticket-card flex flex-col p-5 md:p-6 rounded-2xl transition-all duration-300 border bg-white/5 cursor-pointer group hover:-translate-y-1 hover:shadow-2xl hover:bg-white/10 ${isExpanded ? 'border-[var(--color-teal)]/50 shadow-[0_10px_30px_rgba(6,182,212,0.15)] bg-white/10' : 'border-[var(--color-border)] hover:border-[var(--color-teal)]/40'}`}>
              
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-lg text-[var(--color-text)] tracking-wide group-hover:text-[var(--color-teal)] transition-colors">{t.name}</h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-white/10 text-[var(--color-text-secondary)]">{t.provider}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[var(--color-teal)]" /> {t.route}</span>
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${t.bgTime}`}><Calendar className="w-3 h-3" /> {t.time}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap md:flex-nowrap items-center gap-6 mt-4 md:mt-0">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t.seats}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.refund.includes("Free") ? "text-[var(--color-success)] bg-[var(--color-success)]/10" : "text-[var(--color-error)] bg-[var(--color-error)]/10"}`}>{t.refund}</span>
                  </div>
                  
                  <div className="flex items-center gap-5 border-l border-[var(--color-border)] pl-6 relative">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-2xl tracking-tight flex items-center gap-1.5">
                         ₹{t.price} 
                         {t.trend === "up" && <TrendingDown className="w-4 h-4 text-[var(--color-error)] rotate-180" />}
                         {t.trend === "down" && <TrendingDown className="w-4 h-4 text-[var(--color-success)]" />}
                         {t.trend === "stable" && <span className="w-1.5 h-1.5 rounded-full bg-gray-400 opacity-60 ml-1" />}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] mt-0.5">per ticket</span>
                    </div>
                    <motion.button 
                      whileTap={{ scale: 0.95 }} 
                      onClick={(e) => handleBook(e, t.name)}
                      disabled={isBooking}
                      className="btn-premium relative overflow-hidden bg-white/5 border border-[var(--color-border)] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[var(--color-teal)] hover:border-[var(--color-teal)] transition-all min-w-[120px] flex items-center justify-center">
                      {isBooking ? (
                        <span className="flex items-center gap-2 text-xs font-bold text-white"><Loader2 className="w-4 h-4 animate-spin" /> Securing...</span>
                      ) : (
                        "Book Now"
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Expandable Details Accordion */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="overflow-hidden border-t border-[var(--color-border)]/50 pt-4 flex flex-wrap gap-4"
                  >
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex-1 min-w-[150px]">
                      <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold mb-1">Seat Type</p>
                      <p className="text-sm font-medium text-white">{t.seatType}</p>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex-1 min-w-[150px]">
                      <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold mb-1">Cancellation Policy</p>
                      <p className={`text-sm font-medium ${t.refund.includes("Free") ? "text-[var(--color-success)]" : "text-[var(--color-error)]"}`}>{t.refund}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )})}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default function Planner() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiResult, setApiResult] = useState<OptimizedTripPlan | null>(null);
  const [mood, setMood] = useState<TravelMood>("chill");
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [activeExpenseCard, setActiveExpenseCard] = useState("Transport");
  const [loadingText, setLoadingText] = useState("Analyzing best routes...");
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!isGenerating) return;
    const texts = ["Analyzing best routes...", "Checking traffic conditions...", "Optimizing budget...", "Generating smartest itinerary..."];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLoadingText(texts[i]);
    }, 1500);
    return () => clearInterval(interval);
  }, [isGenerating]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { user } = useAuthStore();

  const { register, handleSubmit, formState: { errors }, getValues, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { budget: 50000, days: 5, travelers: 2, travelType: "Budget", fromLocation: "Mumbai", destination: "Goa", transport: "Train" },
  });
  const selectedTransport = watch("transport");
  const formBudget = watch("budget") || 50000;
  const formDays = watch("days") || 5;
  const formLocation = watch("fromLocation") || "Mumbai";
  const dataDestination = watch("destination") || "Goa";

  // Map data now handled natively by MapView component

  const handleCardClick = (type: string) => {
    if (type === "Transport" || type === "Entry Fees") {
      setActiveExpenseCard(type);
      setTimeout(() => {
        const id = type === "Transport" ? "route-panel" : "tickets-panel";
        const el = document.getElementById(id);
        if (el) {
          const topStr = el.getBoundingClientRect().top + window.pageYOffset - 100;
          window.scrollTo({ top: topStr, behavior: "smooth" });
        }
      }, 50);
    } else if (type === "Hotel") {
      navigate("/hotels");
    } else if (type === "Food") {
      navigate("/food");
    } else if (type === "Activities") {
      navigate("/activities");
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsGenerating(true);
    setSaved(false);
    try {
      const r = await fetch("/api/plan-trip", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, mood }),
      });
      if (!r.ok) throw new Error();
      const res = await r.json();

      // Compute Antigravity Score on client
      const agScore = calculateTripScore(
        res.expenses?.total || 0, data.budget, data.days,
        70, res.carbonKg || 150, mood
      );
      res.antigravityScore = agScore;
      setApiResult(res);

      // Auto-fetch Safety, Food, Activities for the same destination
      const tripStore = useTripStore.getState();
      tripStore.setTripPlan(data.destination, res);
      tripStore.fetchAll(data.destination, data.days, mood);
    } catch { showToast("Failed to generate trip plan.", "error"); }
    finally { setIsGenerating(false); }
  };

  const result = React.useMemo(() => {
    if (!apiResult) return null;
    let res = JSON.parse(JSON.stringify(apiResult));

    const alt = res.bestRoute?.alternatives?.find((a: any) => a.type.toLowerCase() === selectedTransport.toLowerCase());
    if (alt && res.expenses.transport !== alt.cost) {
      const diff = alt.cost - res.expenses.transport;
      res.expenses.transport = alt.cost;
      res.expenses.total += diff;
      
      res.antigravityScore = calculateTripScore(res.expenses.total, formBudget, formDays, 70, res.carbonKg || 150, mood);
      
      if (res.bestRoute.recommended.toLowerCase() !== selectedTransport.toLowerCase() && res.bestRoute.savings > 0) {
        res.warnings = [
          { type: 'savings-tip', severity: 'info', message: `Smart Suggestion: You can save ₹${res.bestRoute.savings.toLocaleString()} by choosing ${res.bestRoute.recommended} instead of ${selectedTransport}.` },
          ...(res.warnings || [])
        ];
      }
    }
    
    return res;
  }, [apiResult, selectedTransport, formBudget, formDays, mood]);

  useGSAP(() => {
    if (result && !isGenerating) {
      gsap.fromTo(
        ".result-card",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: { trigger: ".result-card", start: "top 85%", toggleActions: "play none none none" }
        }
      );
    }
    
    // Super Premium animations triggered on transport switch
    if (result) {
      gsap.to(".score-circle", { rotation: "+=360", duration: 1, ease: "power2.inOut", transformOrigin: "50% 50%" });
      gsap.fromTo(".route-card", { scale: 0.95, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 0.4, stagger: 0.05, ease: "back.out(1.5)" });
    }
  }, [result, isGenerating, selectedTransport]);

  const saveTrip = async () => {
    if (!result || !user) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    try {
      const vals = getValues();
      await fetch("/api/trips", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          destination: result.destination, mood, budget: vals.budget, days: vals.days,
          travelers: vals.travelers, data: result,
          antigravityScore: result.antigravityScore?.overall || 0, carbonKg: result.carbonKg || 0,
        }),
      });
      setSaved(true);
    } catch { showToast("Failed to save trip.", "error"); }
    finally { setSaving(false); }
  };

  const pieData = result ? [
    { name: "Transport", value: result.expenses.transport },
    { name: "Hotel", value: result.expenses.hotel.budget },
    { name: "Food", value: result.expenses.food.street },
    { name: "Entry Fees", value: result.expenses.entryFees },
    { name: "Activities", value: result.expenses.activities },
  ].filter(d => d.value > 0) : [];

  const barData = result ? [
    { name: "Transport", budget: result.expenses.transport, premium: result.expenses.transport },
    { name: "Hotel", budget: result.expenses.hotel.budget, premium: result.expenses.hotel.premium },
    { name: "Food", budget: result.expenses.food.street, premium: result.expenses.food.restaurants },
    { name: "Entry", budget: result.expenses.entryFees, premium: result.expenses.entryFees },
    { name: "Activities", budget: result.expenses.activities, premium: result.expenses.activities },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 font-display">
          Smart Budget <span className="text-gradient">Optimizer</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg">AI-powered trip planning with Antigravity Intelligence Engine.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Form ──────────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-4 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="glass-card p-8 rounded-3xl space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[var(--color-teal)]" /> Budget (₹)
              </label>
              <input type="number" {...register("budget", { valueAsNumber: true })}
                className="w-full bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] focus:ring-1 focus:ring-[var(--color-teal)] transition-all" />
              {errors.budget && <p className="text-[var(--color-error)] text-xs">{errors.budget.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--color-teal)]" /> Days
                </label>
                <input type="number" {...register("days", { valueAsNumber: true })}
                  className="w-full bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--color-teal)]" /> Travelers
                </label>
                <input type="number" {...register("travelers", { valueAsNumber: true })}
                  className="w-full bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--color-teal)]" /> From
                </label>
                <input type="text" {...register("fromLocation")} placeholder="e.g., Mumbai"
                  className="w-full bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all" />
                {errors.fromLocation && <p className="text-[var(--color-error)] text-xs">{errors.fromLocation.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--color-teal)]" /> To
                </label>
                <input type="text" {...register("destination")} placeholder="e.g., Goa"
                  className="w-full bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all" />
                {errors.destination && <p className="text-[var(--color-error)] text-xs">{errors.destination.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Travel Type</label>
                <select {...register("travelType")}
                  className="w-full bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all appearance-none">
                  {["Luxury", "Budget", "Adventure", "Family"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-3 lg:col-span-2">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Transport</label>
                <div className="flex flex-wrap gap-2 bg-white/5 p-1.5 rounded-2xl backdrop-blur-md w-full sm:w-fit border border-[var(--color-border)]">
                  {["Flight", "Train", "Bus", "Car", "Ship"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setValue("transport", t as any)}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        selectedTransport === t
                          ? "bg-gradient-to-r from-[var(--color-grad-1)] to-[var(--color-teal)] text-white shadow-[0_4px_15px_rgba(6,182,212,0.4)] scale-105"
                          : "text-[var(--color-text-secondary)] hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {t === "Flight" && <Plane className="w-4 h-4" />}
                      {t === "Train" && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h0"/><path d="M16 15h0"/></svg>}
                      {t === "Bus" && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>}
                      {t === "Car" && <Car className="w-4 h-4" />}
                      {t === "Ship" && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 2v3"/></svg>}
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <MoodSelector value={mood} onChange={setMood} />

            <button type="submit" disabled={isGenerating}
              className="glow-button w-full bg-[var(--color-ocean)] text-[var(--color-text)] font-semibold rounded-xl py-4 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors disabled:opacity-50 border border-[var(--color-teal)]/30">
              {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Optimizing…</> : <><Plane className="w-5 h-5" /> Generate Smart Plan</>}
            </button>
          </form>
        </motion.div>

        {/* ── Results ───────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!result && !isGenerating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full min-h-[500px] flex flex-col items-center justify-center glass-card rounded-3xl">
                <div className="w-20 h-20 rounded-full bg-[var(--color-ocean)] border border-[var(--color-border)] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(30,58,138,0.3)]">
                  <MapPin className="w-8 h-8 text-[var(--color-teal)] opacity-50" />
                </div>
                <p className="text-lg font-light text-[var(--color-text-secondary)]">Your AI-optimized travel plan will appear here.</p>
              </motion.div>
            )}

            {isGenerating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full min-h-[500px] flex flex-col items-center justify-center glass-card rounded-3xl relative overflow-hidden">
                
                {/* Background pulse loop */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                  <motion.div 
                    animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} 
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
                    className="absolute w-40 h-40 rounded-full border border-[var(--color-teal)] bg-[var(--color-teal)]/5"
                  />
                  <motion.div 
                    animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} 
                    transition={{ repeat: Infinity, duration: 2.5, delay: 1.25, ease: "easeOut" }}
                    className="absolute w-40 h-40 rounded-full border border-[var(--color-teal)] bg-[var(--color-teal)]/5"
                  />
                </div>

                <div className="relative w-32 h-32 mb-8 z-10 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-[var(--color-teal)]/10 rounded-full" />
                  {/* Rotating rings */}
                  <div className="absolute inset-0 border-4 border-transparent border-t-[var(--color-cyan-glow)] border-r-[var(--color-cyan-glow)] rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
                  <div className="absolute inset-2 border-4 border-transparent border-b-[var(--color-teal)] border-l-[var(--color-teal)] rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                  
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    className="w-full h-full flex items-center justify-center absolute inset-0 text-[var(--color-cyan-glow)] drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  >
                    <Plane strokeWidth={1.5} className="w-8 h-8 -translate-y-6" />
                  </motion.div>
                </div>
                
                <h3 className="text-2xl font-bold font-display z-10 bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-teal)] to-blue-400 mb-2 drop-shadow-sm">
                  Antigravity Engine
                </h3>
                
                <div className="h-6 z-10 flex items-center justify-center relative w-full overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingText}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="text-[var(--color-text-secondary)] font-medium tracking-wide text-sm absolute"
                    >
                      {loadingText}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {result && !isGenerating && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Warnings & Smart Insights */}
                {result.warnings?.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {result.warnings.map((w, i) => (
                      <motion.div key={i} 
                        initial={{ opacity: 0, x: -30, scale: 0.95 }} 
                        animate={{ opacity: 1, x: 0, scale: 1 }} 
                        transition={{ delay: i * 0.15, type: "spring", stiffness: 200, damping: 20 }}
                        className={`relative p-5 rounded-2xl border overflow-hidden flex items-start gap-4 text-sm group ${
                          w.severity === "critical" ? "bg-[var(--color-error)]/10 border-[var(--color-error)]/40 text-[var(--color-error)]" :
                          w.severity === "warning" ? "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/40 text-[var(--color-warning)]" :
                          "bg-[var(--color-teal)]/10 border-[var(--color-teal)]/40 text-[var(--color-teal)]"
                        }`}>
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-xl ${
                          w.severity === "critical" ? "bg-[var(--color-error)]" :
                          w.severity === "warning" ? "bg-[var(--color-warning)]" :
                          "bg-[var(--color-teal)]"
                        }`} />
                        <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white/5 border border-white/10 shadow-sm">
                          {w.severity === "critical" ? <AlertTriangle className="w-4 h-4 text-[var(--color-error)] animate-pulse" /> : 
                           w.severity === "warning" ? <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" /> : 
                           <Lightbulb className="w-4 h-4 text-[var(--color-teal)]" />}
                        </div>
                        <div className="relative z-10 flex-1 pt-1.5 font-medium tracking-wide leading-relaxed">
                          {w.message}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Antigravity Score Card */}
                {result.antigravityScore && <AntigravityScoreCard score={result.antigravityScore} />}

                {/* Header Stats + Save */}
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                    <div className="glass-card p-4 rounded-2xl">
                      <p className="text-[var(--color-text-secondary)] text-xs mb-1">Destination</p>
                      <p className="font-semibold text-sm truncate">{result.destination}</p>
                    </div>
                    <div className="result-card glass-card p-4 rounded-2xl">
                      <p className="text-[var(--color-text-secondary)] text-xs mb-1">Min. Cost</p>
                      <AnimatedPrice value={result.expenses.total} className="font-semibold text-sm text-[var(--color-success)]" />
                    </div>
                    <div className="result-card glass-card p-4 rounded-2xl">
                      <p className="text-[var(--color-text-secondary)] text-xs mb-1">Savings</p>
                      {result.bestRoute?.savings ? (
                        <AnimatedPrice value={result.bestRoute.savings} className="font-semibold text-sm text-[var(--color-cyan-glow)]" />
                      ) : (
                        <p className="font-semibold text-sm text-[var(--color-cyan-glow)]">—</p>
                      )}
                    </div>
                    <div className="glass-card p-4 rounded-2xl flex items-center justify-center">
                      {user ? (
                        <button onClick={saveTrip} disabled={saving || saved}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-xs font-medium disabled:opacity-60 w-full justify-center">
                          {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Trip</>}
                        </button>
                      ) : (
                        <p className="text-[10px] text-[var(--color-text-secondary)] text-center">Sign in to save</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Route Optimization */}
                {result.bestRoute && result.bestRoute.alternatives.length > 0 && (
                  <div className="result-card glass-card p-6 rounded-3xl">
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 font-display">
                      <ArrowRightLeft className="w-5 h-5 text-[var(--color-teal)]" /> Route Optimization
                    </h3>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 bg-[var(--color-teal)]/10 border border-[var(--color-teal)]/30 rounded-2xl p-5 text-center">
                        <p className="text-xs uppercase tracking-wider text-[var(--color-teal)] mb-2 font-semibold">Recommended</p>
                        <p className="text-3xl font-bold capitalize font-display">{result.bestRoute.recommended}</p>
                        {result.bestRoute.savings > 0 && (
                          <div className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--color-success)]/20 border border-[var(--color-success)]/30 rounded-full text-[var(--color-success)] text-sm font-medium">
                            <TrendingDown className="w-4 h-4" /> Save ₹{result.bestRoute.savings.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col gap-3 mt-4 md:mt-0">
                        {result.bestRoute.alternatives.map((alt: any, i: number) => (
                          <div
                            key={i}
                            onClick={() => setValue("transport", alt.type)}
                            className={`route-card flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                              selectedTransport.toLowerCase() === alt.type.toLowerCase()
                                ? "bg-[var(--color-teal)]/20 border-[var(--color-teal)]/50 scale-[1.03] shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                                : "bg-white/5 border-[var(--color-border)] hover:bg-white/10 hover:border-[var(--color-teal)]/30 hover:scale-[1.01]"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-0">
                              <span className="capitalize font-semibold text-base flex items-center gap-2">
                                {alt.type === result.bestRoute.recommended && <span className="w-2 h-2 rounded-full bg-[var(--color-teal)] shadow-[0_0_8px_var(--color-teal)]" />}
                                {alt.type}
                              </span>
                              <div className="flex gap-1">
                                {alt.type === result.bestRoute.recommended && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-teal)]/20 text-[var(--color-teal)] border border-[var(--color-teal)]/30">Best Value</span>
                                )}
                                {alt.type.toLowerCase() === 'flight' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Fastest</span>
                                )}
                                {alt.type.toLowerCase() === 'train' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30">Eco Friendly</span>
                                )}
                              </div>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                              <span className="font-bold text-[var(--color-text)]"><AnimatedPrice value={alt.cost} /></span>
                              <span className="text-xs text-[var(--color-text-secondary)] bg-white/5 px-2 py-0.5 rounded-sm">{alt.duration || "—"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insight Panel */}
                {result.bestRoute && (
                  <div className="result-card glass-card p-6 rounded-3xl bg-gradient-to-br from-[var(--color-teal)]/10 to-transparent border border-[var(--color-teal)]/20 relative overflow-hidden group">
                    <div className="absolute -inset-10 bg-[var(--color-cyan-glow)]/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                    <div className="relative z-10">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 font-display text-[var(--color-cyan-glow)] pb-3 border-b border-[var(--color-teal)]/20">
                        <Lightbulb className="w-5 h-5" /> AI Insight
                      </h3>
                      <motion.div initial={{ clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0 0 0)" }} transition={{ duration: 3, ease: "linear", delay: 0.5 }}>
                        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                          <strong className="text-[var(--color-text)] capitalize">{result.bestRoute.recommended}</strong> is recommended because it perfectly balances cost and comfort while saving <AnimatedPrice value={result.bestRoute.savings} className="text-[var(--color-success)] font-semibold" /> compared to alternative transports. It maintains a high Antigravity Score, optimizing for both experience and budget.
                        </p>
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="result-card glass-card p-6 rounded-3xl">
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 font-display">
                      <Wallet className="w-5 h-5 text-[var(--color-teal)]" /> Budget Breakdown
                    </h3>
                    <motion.div initial={{ scale: 0.8, opacity: 0, rotate: -15 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 1, ease: "easeOut", delay: 0.2 }} className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                            {pieData.map((_e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <RechartsTooltip formatter={(v: number) => `₹${v.toLocaleString()}`}
                            contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </motion.div>
                  </div>
                  <div className="result-card glass-card p-6 rounded-3xl">
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 font-display">
                      <BadgeIndianRupee className="w-5 h-5 text-[var(--color-teal)]" /> Budget vs Premium
                    </h3>
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }} className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} />
                          <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                          <RechartsTooltip formatter={(v: number) => `₹${v.toLocaleString()}`}
                            contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                          <Bar dataKey="budget" name="Budget" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="premium" name="Premium" fill="#F97316" radius={[4, 4, 0, 0]} />
                          <Legend />
                        </BarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  </div>
                </div>

                {/* Expense Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { icon: Plane, label: "Transport", value: result.expenses.transport, color: "var(--color-teal)" },
                    { icon: Hotel, label: "Hotel", value: result.expenses.hotel.budget, sub: `Premium: ₹${result.expenses.hotel.premium.toLocaleString()}`, color: "#F97316" },
                    { icon: Utensils, label: "Food", value: result.expenses.food.street, sub: `Restaurant: ₹${result.expenses.food.restaurants.toLocaleString()}`, color: "#8b5cf6" },
                    { icon: Ticket, label: "Entry Fees", value: result.expenses.entryFees, color: "#1E3A8A" },
                    { icon: MapPin, label: "Activities", value: result.expenses.activities, color: "var(--color-success)" },
                  ].map((item, i) => (
                    <motion.div key={i} onClick={() => handleCardClick(item.label)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      className={`result-card glass-card p-5 rounded-2xl cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:bg-white/10 active:scale-95 ${
                        activeExpenseCard === item.label ? 'bg-gradient-to-br from-[var(--color-teal)]/20 to-[var(--color-ocean)] border-[var(--color-teal)]/50 shadow-[0_10px_30px_rgba(6,182,212,0.2)]' : 'border-[var(--color-border)]'
                      }`}>
                      <item.icon className="w-5 h-5 mb-2 transition-transform duration-300 group-hover:scale-110" style={{ color: item.color }} />
                      <p className="text-[var(--color-text-secondary)] text-xs">{item.label}</p>
                      <AnimatedPrice value={item.value} className="font-bold text-lg" />
                      {item.sub && <p className="text-[var(--color-text-secondary)] text-[11px] mt-1">{item.sub}</p>}
                    </motion.div>
                  ))}
                </div>

                {/* Dynamic Details Panel */}
                <AnimatePresence mode="wait">
                  {activeExpenseCard === "Transport" && result && <SmartRouteMap from={formLocation} destination={dataDestination} />}
                  {activeExpenseCard === "Entry Fees" && result && <SmartTickets />}
                </AnimatePresence>

                {/* Map */}
                <div className="glass-card p-6 rounded-3xl overflow-hidden relative h-[320px]">
                  <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 relative z-10 font-display">
                    <Navigation className="w-5 h-5 text-[var(--color-teal)]" /> Location
                  </h3>
                  <div className="absolute inset-0 top-16 rounded-b-3xl overflow-hidden border-t border-[var(--color-border)]">
                    <MapView fromStr={formLocation} toStr={dataDestination} transport={selectedTransport} onTransportChange={(t) => setValue("transport", t as any)} />
                  </div>
                </div>

                {/* Itinerary */}
                {result.itinerary?.length > 0 && (
                  <div className="result-card glass-card p-8 rounded-3xl">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-semibold font-display">Day-by-Day Itinerary</h3>
                      <span className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-[var(--color-border)]">
                        <GripVertical className="w-4 h-4" /> Reorder
                      </span>
                    </div>
                    <Reorder.Group axis="y" values={result.itinerary} onReorder={(ni) => setApiResult(prev => prev ? { ...prev, itinerary: ni as any } : null)}
                      className="space-y-6">
                      {result.itinerary.map((day, index) => (
                        <Reorder.Item key={day.day} value={day} className="cursor-grab active:cursor-grabbing">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full border-2 border-[var(--color-teal)] bg-[var(--color-navy)] text-[var(--color-cyan-glow)] font-bold flex items-center justify-center shrink-0 text-sm shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                              {index + 1}
                            </div>
                            <div className="flex-1 p-5 rounded-2xl bg-[var(--color-ocean)]/80 border border-[var(--color-border)] hover:border-[var(--color-teal)]/30 transition-all">
                              <div 
                                onClick={() => setExpandedDays(prev => ({ ...prev, [index]: !prev[index] }))} 
                                className="cursor-pointer flex items-center justify-between font-bold text-lg font-display group"
                              >
                                <h4 className="group-hover:text-[var(--color-teal)] transition-colors">{day.title}</h4>
                                <motion.div animate={{ rotate: expandedDays[index] ? 180 : 0 }} className="p-1 bg-white/5 rounded-full">
                                    <ChevronDown className="w-5 h-5 text-[var(--color-teal)]" />
                                </motion.div>
                              </div>
                              
                              <AnimatePresence>
                                {expandedDays[index] && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <ul className="space-y-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                                      {day.activities.map((act, j) => (
                                        <li key={j} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-teal)] mt-1.5 shrink-0 shadow-[0_0_5px_var(--color-teal)]" /> {act}
                                        </li>
                                      ))}
                                    </ul>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </div>
                )}

                {/* Tips + Eco */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="glass-card p-6 rounded-3xl">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 font-display">
                      <Lightbulb className="w-5 h-5 text-[var(--color-warning)]" /> Cost-Saving Tips
                    </h3>
                    <ul className="space-y-3">
                      {(result.tips || []).map((tip, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)] bg-[var(--color-ocean)]/50 rounded-xl px-4 py-3 border border-[var(--color-border)]">
                          <TrendingDown className="w-4 h-4 text-[var(--color-success)] shrink-0 mt-0.5" /> {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="glass-card p-6 rounded-3xl">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 font-display">
                      <Leaf className="w-5 h-5 text-[var(--color-success)]" /> Eco Impact
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
                      {result.ecoImpact || "No eco data available."}
                    </p>
                    {result.carbonKg && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)] text-sm font-medium">
                        🌱 {result.carbonKg} kg CO₂ estimated
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky Summary Bar */}
      <AnimatePresence>
        {result && !isGenerating && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none"
          >
            <div className="max-w-4xl mx-auto glass-card rounded-2xl p-4 flex items-center justify-between border-[var(--color-teal)]/40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pointer-events-auto bg-[var(--color-navy)]/90 backdrop-blur-md">
              <div className="flex items-center gap-4 sm:gap-6">
                <div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5">Budget Used</p>
                  <AnimatedPrice value={result.expenses.total} className="font-bold text-lg text-[var(--color-teal)]" />
                </div>
                <div className="hidden sm:block w-px h-8 bg-[var(--color-border)]"></div>
                <div className="hidden sm:block">
                  <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5">Selected Transport</p>
                  <p className="font-bold text-sm capitalize">{selectedTransport}</p>
                </div>
                {result.bestRoute?.savings > 0 && (
                  <>
                    <div className="w-px h-8 bg-[var(--color-border)]"></div>
                    <div>
                      <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5">You Save</p>
                      <AnimatedPrice value={result.bestRoute.savings} className="font-bold text-sm text-[var(--color-success)]" />
                    </div>
                  </>
                )}
              </div>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                Modify Plan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-[100px] right-6 z-50 bg-gradient-to-r from-blue-900/90 to-black/90 backdrop-blur-xl border border-blue-500/30 rounded-full px-5 py-3 shadow-[0_0_20px_rgba(59,130,246,0.3)] flex flex-row items-center gap-3"
          >
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </div>
            <span className="text-sm font-medium text-blue-100">{loadingText}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
