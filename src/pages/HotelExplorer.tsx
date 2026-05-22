import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hotel, Loader2, MapPin, Star, Shield, X, Heart, MessageCircle,
  Navigation, IndianRupee, Clock, ExternalLink, Share2, Check,
  Users, Sparkles, Volume2, VolumeX, Wifi, Car, UtensilsCrossed,
  ChevronRight, TrendingDown, BarChart3, Zap, AlertTriangle,
  Lightbulb, Award, Building2
} from "lucide-react";
import { useTripStore } from "../store";
import { showToast } from "../components/Toast";

// ── Helpers ────────────────────────────────────────────────────────────────

const getFallbackImage = (searchTerm: string, index: number) => {
  const query = encodeURIComponent((searchTerm || "hotel room").replace(/\s+/g, ","));
  let hash = 0;
  for (let i = 0; i < (searchTerm || "").length; i++) {
    hash = ((hash << 5) - hash) + (searchTerm || "").charCodeAt(i);
    hash |= 0;
  }
  return `https://loremflickr.com/400/300/${query},hotel?lock=${Math.abs(hash) + index}`;
};

const getMapLink = (name: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " hotel")}`;

// ── Type configs ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
  budget:     { color: "#10B981", emoji: "💰", label: "Budget" },
  "mid-range":{ color: "#06B6D4", emoji: "🏨", label: "Mid-Range" },
  premium:    { color: "#F59E0B", emoji: "👑", label: "Premium" },
  luxury:     { color: "#a855f7", emoji: "💎", label: "Luxury" },
};

const NOISE_CONFIG: Record<string, { color: string; icon: any }> = {
  quiet:    { color: "#10B981", icon: VolumeX },
  moderate: { color: "#F59E0B", icon: Volume2 },
  noisy:    { color: "#EF4444", icon: Volume2 },
};

interface HotelItem {
  name: string;
  category: string;
  pricePerNight: number;
  safetyScore: number;
  cleanlinessScore: number;
  locationScore: number;
  noiseLevel: string;
  nearbyLandmarks: string[];
  tip: string;
  _pexelsUrl?: string;
}

// ── Budget Optimizer Panel ──────────────────────────────────────────────────

const BudgetOptimizer: React.FC<{
  budget: number; days: number; recommended: HotelItem | null;
  budgetOptions: HotelItem[]; premiumOptions: HotelItem[];
}> = ({ budget, days, recommended, budgetOptions, premiumOptions }) => {
  const allHotels = [
    ...(recommended ? [{ ...recommended, _cat: "recommended" }] : []),
    ...budgetOptions.map(h => ({ ...h, _cat: "budget" })),
    ...premiumOptions.map(h => ({ ...h, _cat: "premium" })),
  ];

  const cheapest = allHotels.reduce((min, h) => h.pricePerNight < min.pricePerNight ? h : min, allHotels[0]);
  const bestValue = allHotels.reduce((best, h) => {
    const score = (h.safetyScore + h.cleanlinessScore + h.locationScore) / 3;
    const ratio = score / h.pricePerNight;
    const bestScore = (best.safetyScore + best.cleanlinessScore + best.locationScore) / 3;
    const bestRatio = bestScore / best.pricePerNight;
    return ratio > bestRatio ? h : best;
  }, allHotels[0]);

  const totalBudgetStay = cheapest ? cheapest.pricePerNight * days : 0;
  const totalPremiumStay = premiumOptions[0] ? premiumOptions[0].pricePerNight * days : 0;
  const savings = totalPremiumStay - totalBudgetStay;

  return (
    <div className="glass-card p-6 rounded-3xl space-y-5">
      <h2 className="text-xl font-bold font-display flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-[var(--color-teal)]" /> Budget Optimization
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass p-4 rounded-xl text-center">
          <TrendingDown className="w-5 h-5 mx-auto mb-1 text-[var(--color-success)]" />
          <p className="text-xs text-[var(--color-text-secondary)]">Min/Night</p>
          <p className="text-lg font-bold font-display">₹{cheapest?.pricePerNight?.toLocaleString() || "—"}</p>
        </div>
        <div className="glass p-4 rounded-xl text-center">
          <Zap className="w-5 h-5 mx-auto mb-1 text-[var(--color-warning)]" />
          <p className="text-xs text-[var(--color-text-secondary)]">Best Value</p>
          <p className="text-sm font-bold font-display truncate">{bestValue?.name || "—"}</p>
        </div>
        <div className="glass p-4 rounded-xl text-center">
          <IndianRupee className="w-5 h-5 mx-auto mb-1 text-[var(--color-teal)]" />
          <p className="text-xs text-[var(--color-text-secondary)]">{days}-Night Budget</p>
          <p className="text-lg font-bold font-display">₹{totalBudgetStay.toLocaleString()}</p>
        </div>
        <div className="glass p-4 rounded-xl text-center">
          <TrendingDown className="w-5 h-5 mx-auto mb-1 text-[var(--color-success)]" />
          <p className="text-xs text-[var(--color-text-secondary)]">Potential Savings</p>
          <p className="text-lg font-bold font-display text-[var(--color-success)]">₹{savings.toLocaleString()}</p>
        </div>
      </div>

      {/* Value comparison bar */}
      <div className="space-y-2">
        <p className="text-xs text-[var(--color-text-secondary)] font-medium">Price vs Quality Comparison</p>
        {allHotels.slice(0, 5).map((h, i) => {
          const avgScore = ((h.safetyScore + h.cleanlinessScore + h.locationScore) / 3).toFixed(1);
          const barWidth = Math.min((Number(avgScore) / 10) * 100, 100);
          const catInfo = CATEGORY_CONFIG[h.category] || CATEGORY_CONFIG.budget;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs w-28 truncate font-medium">{h.name}</span>
              <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barWidth}%`, backgroundColor: catInfo.color }} />
              </div>
              <span className="text-xs font-bold w-8" style={{ color: catInfo.color }}>{avgScore}</span>
              <span className="text-[10px] text-[var(--color-text-secondary)] w-16 text-right">₹{h.pricePerNight.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Hotel Detail Modal ──────────────────────────────────────────────────────

const HotelDetailModal: React.FC<{
  item: HotelItem; onClose: () => void; destination: string; days: number;
}> = ({ item, onClose, destination, days }) => {
  const [copied, setCopied] = useState(false);
  const [modalImgError, setModalImgError] = useState(false);
  const catInfo = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG["mid-range"];
  const noiseInfo = NOISE_CONFIG[item.noiseLevel] || NOISE_CONFIG.moderate;
  const avgScore = ((item.safetyScore + item.cleanlinessScore + item.locationScore) / 3).toFixed(1);

  const shareText = `Check out ${item.name} in ${destination}! ${item.category} hotel, ₹${item.pricePerNight}/night. ${item.tip}`;
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: item.name, text: shareText, url: getMapLink(item.name) });
    } else { navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const getModalImage = () => {
    if (modalImgError) {
      let h = 0;
      for (let i = 0; i < item.name.length; i++) { h = ((h << 5) - h) + item.name.charCodeAt(i); h |= 0; }
      return `https://loremflickr.com/600/400/${encodeURIComponent(item.category)},hotel,room?lock=${Math.abs(h) + 500}`;
    }
    return item._pexelsUrl || getFallbackImage(item.name + " hotel", 99);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 25 }}
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl glass-card"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.2) transparent" }}
        onClick={e => e.stopPropagation()}>

        {/* Hero */}
        <div className="relative h-48 md:h-60 overflow-hidden rounded-t-3xl" style={{ background: "linear-gradient(135deg, #1a1a3e 0%, #0d2137 100%)" }}>
          <img src={getModalImage()} alt={item.name} className="w-full h-full object-cover"
            onError={() => setModalImgError(true)} loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy)] via-transparent to-transparent" />

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button onClick={handleShare} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-4 left-6 right-6">
            <span className="text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block"
              style={{ backgroundColor: catInfo.color + "40", color: catInfo.color }}>
              {catInfo.emoji} {catInfo.label}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold font-display text-white">{item.name}</h2>
            <p className="text-sm text-white/70">{destination}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass p-3 rounded-xl text-center">
              <IndianRupee className="w-4 h-4 mx-auto mb-1" style={{ color: catInfo.color }} />
              <p className="text-lg font-bold font-display">₹{item.pricePerNight.toLocaleString()}</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">Per Night</p>
              <p className="text-[9px] text-[var(--color-text-secondary)]">₹{(item.pricePerNight * days).toLocaleString()} / {days} nights</p>
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <Star className="w-4 h-4 mx-auto mb-1 text-[var(--color-warning)]" />
              <p className="text-lg font-bold font-display">{avgScore}</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">Avg Score</p>
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <Shield className="w-4 h-4 mx-auto mb-1 text-[var(--color-success)]" />
              <p className="text-lg font-bold font-display">{item.safetyScore}/10</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">Safety</p>
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <noiseInfo.icon className="w-4 h-4 mx-auto mb-1" style={{ color: noiseInfo.color }} />
              <p className="text-sm font-bold capitalize">{item.noiseLevel}</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">Noise</p>
            </div>
          </div>

          {/* Detailed Scores */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Safety", score: item.safetyScore, color: "#10B981" },
              { label: "Cleanliness", score: item.cleanlinessScore, color: "#06B6D4" },
              { label: "Location", score: item.locationScore, color: "#F59E0B" },
            ].map((s, i) => (
              <div key={i} className="glass p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">{s.label}</span>
                  <span className="text-sm font-bold" style={{ color: s.color }}>{s.score}/10</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.score * 10}%`, backgroundColor: s.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Location + Landmarks */}
          <div className="glass p-4 rounded-xl">
            <h3 className="font-semibold text-xs flex items-center gap-2 mb-2">
              <Navigation className="w-3.5 h-3.5" style={{ color: catInfo.color }} /> Location & Nearby
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {item.nearbyLandmarks?.map((l, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-[var(--color-border)]">📍 {l}</span>
              ))}
            </div>
            <a href={getMapLink(item.name)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: catInfo.color }}>
              <ExternalLink className="w-3 h-3" /> Open in Google Maps
            </a>
          </div>

          {/* Pro Tip */}
          {item.tip && (
            <div className="glass p-4 rounded-xl border-l-4" style={{ borderLeftColor: catInfo.color }}>
              <p className="text-xs text-[var(--color-text-secondary)]">💡 <strong>Pro Tip:</strong> {item.tip}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Hotel Card ──────────────────────────────────────────────────────────────

const HotelCard: React.FC<{ item: HotelItem; index: number; onClick: () => void }> = ({ item, index, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const catInfo = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG["mid-range"];
  const avgScore = ((item.safetyScore + item.cleanlinessScore + item.locationScore) / 3).toFixed(1);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="glass-card rounded-2xl overflow-hidden cursor-pointer group" onClick={onClick}>
      <div className="relative h-44 overflow-hidden">
        <img src={imgError ? `https://loremflickr.com/400/300/hotel,room?lock=${index + 777}` : (item._pexelsUrl || getFallbackImage(item.name + " hotel", index))}
          alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={() => setImgError(true)} />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy)]/90 via-[var(--color-navy)]/20 to-transparent" />

        <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md"
          style={{ backgroundColor: catInfo.color + "30", color: catInfo.color }}>
          {catInfo.emoji} {catInfo.label}
        </span>

        <div className="absolute bottom-3 left-4 right-4">
          <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
          <div className="flex items-center gap-2 text-[11px] text-white/60">
            {item.nearbyLandmarks?.[0] && <span className="truncate">📍 Near {item.nearbyLandmarks[0]}</span>}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[var(--color-text)] flex items-center gap-1 text-sm">
            <IndianRupee className="w-3.5 h-3.5" /> ₹{item.pricePerNight.toLocaleString()}<span className="text-[10px] text-[var(--color-text-secondary)] font-normal">/night</span>
          </span>
          <span className="flex items-center gap-0.5 text-xs">
            <Star className="w-3 h-3 text-[var(--color-warning)] fill-current" /> {avgScore}
          </span>
        </div>

        {/* Score bars */}
        <div className="space-y-1.5">
          {[
            { label: "Safety", score: item.safetyScore, color: "#10B981" },
            { label: "Clean", score: item.cleanlinessScore, color: "#06B6D4" },
            { label: "Location", score: item.locationScore, color: "#F59E0B" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[9px] text-[var(--color-text-secondary)] w-12">{s.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s.score * 10}%`, backgroundColor: s.color }} />
              </div>
              <span className="text-[9px] font-bold w-4" style={{ color: s.color }}>{s.score}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[var(--color-teal)] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          View details & amenities <ChevronRight className="w-3 h-3" />
        </p>
      </div>
    </motion.div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

export default function HotelExplorer() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(5);
  const [budgetInput, setBudgetInput] = useState(50000);
  const [loading, setLoading] = useState(false);
  const [localResult, setLocalResult] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<HotelItem | null>(null);

  const storeResult = useTripStore(s => s.hotelResult);
  const storeLoading = useTripStore(s => s.hotelLoading);
  const storeDestination = useTripStore(s => s.destination);
  const storeDays = useTripStore(s => s.days);

  const result = localResult || storeResult;
  const isLoading = loading || storeLoading;
  const displayDestination = destination || storeDestination;
  const activeDest = result?.destination || displayDestination;
  const activeDays = days || storeDays || 5;

  // Batch Pexels images
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!result) return;
    const allHotels = [
      ...(result.recommended ? [result.recommended] : []),
      ...(result.budgetOptions || []),
      ...(result.premiumOptions || []),
    ];
    const queries = allHotels.map((h: any) => h.name + " hotel").filter((q: string) => !imageMap[q]);
    if (queries.length === 0) return;

    fetch("/api/food-images/batch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries }),
    }).then(r => r.json()).then(data => {
      if (data.images) setImageMap(prev => ({ ...prev, ...data.images }));
    }).catch(() => {});
  }, [result]);

  const searchHotels = async () => {
    const dest = destination.trim() || storeDestination;
    if (!dest) return;
    setLoading(true);
    try {
      const r = await fetch("/api/hotel-intelligence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: dest, budget: budgetInput, days }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setLocalResult(data);
      useTripStore.getState().setHotelResult(data);
    } catch { showToast("Failed to find hotels.", "error"); }
    finally { setLoading(false); }
  };

  const totalHotels = result
    ? (result.recommended ? 1 : 0) + (result.budgetOptions?.length || 0) + (result.premiumOptions?.length || 0)
    : 0;

  const enrichHotel = (h: any) => ({ ...h, _pexelsUrl: imageMap[h.name + " hotel"] });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold font-display mb-2">
          Hotel <span className="text-gradient">Intelligence</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg">AI-powered hotel analysis with budget optimization & safety scores.</p>
      </motion.div>

      {/* Search */}
      <div className="glass-card p-6 rounded-3xl mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
            <input value={displayDestination} onChange={e => setDestination(e.target.value)}
              placeholder="Destination (e.g., Goa, Manali)" onKeyDown={e => e.key === "Enter" && searchHotels()}
              className="w-full bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl pl-12 pr-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all" />
          </div>
          <div className="relative md:w-36">
            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input type="number" value={budgetInput} onChange={e => setBudgetInput(Number(e.target.value))}
              placeholder="Budget" className="w-full bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all" />
          </div>
          <input type="number" value={days} onChange={e => setDays(Number(e.target.value))} min={1} max={30}
            className="md:w-24 bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all text-center"
            placeholder="Days" />
          <button onClick={searchHotels} disabled={isLoading || !(destination.trim() || storeDestination)}
            className="btn-primary px-8 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Hotel className="w-5 h-5" />}
            {isLoading ? "Analyzing…" : "Find Hotels"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !result && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-[var(--color-teal)]/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-[var(--color-teal)] rounded-full border-t-transparent animate-spin" />
            <Building2 className="absolute inset-0 m-auto w-8 h-8 text-[var(--color-teal)] animate-pulse" />
          </div>
          <p className="text-lg font-display font-medium animate-pulse">Analyzing hotels in {displayDestination}…</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Comparing prices, safety scores & reviews</p>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          {/* Summary Bar */}
          <div className="glass-card p-4 rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--color-teal)]" />
                  <span className="font-semibold font-display">{activeDest}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                  <span className="flex items-center gap-1"><Hotel className="w-3.5 h-3.5" /> {totalHotels} hotels found</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {activeDays} nights</span>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Optimizer */}
          <BudgetOptimizer
            budget={budgetInput} days={activeDays}
            recommended={result.recommended}
            budgetOptions={result.budgetOptions || []}
            premiumOptions={result.premiumOptions || []}
          />

          {/* Recommended Hotel */}
          {result.recommended && (
            <div>
              <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
                <Award className="w-6 h-6 text-[var(--color-teal)]" /> AI Recommended
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <HotelCard item={enrichHotel(result.recommended)} index={0}
                  onClick={() => setSelectedItem(enrichHotel(result.recommended))} />
              </div>
            </div>
          )}

          {/* Budget Options */}
          {result.budgetOptions?.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
                💰 Budget Friendly
                <span className="text-xs font-normal text-[var(--color-text-secondary)] bg-white/5 px-2 py-0.5 rounded-full ml-2">{result.budgetOptions.length} options</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.budgetOptions.map((h: any, i: number) => (
                  <HotelCard key={i} item={enrichHotel(h)} index={i + 5}
                    onClick={() => setSelectedItem(enrichHotel(h))} />
                ))}
              </div>
            </div>
          )}

          {/* Premium Options */}
          {result.premiumOptions?.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
                👑 Premium & Luxury
                <span className="text-xs font-normal text-[var(--color-text-secondary)] bg-white/5 px-2 py-0.5 rounded-full ml-2">{result.premiumOptions.length} options</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.premiumOptions.map((h: any, i: number) => (
                  <HotelCard key={i} item={enrichHotel(h)} index={i + 10}
                    onClick={() => setSelectedItem(enrichHotel(h))} />
                ))}
              </div>
            </div>
          )}

          {/* Scam Warnings */}
          {result.scamWarnings?.length > 0 && (
            <div className="glass-card p-6 rounded-3xl">
              <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[var(--color-error)]" /> Hotel Scam Warnings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.scamWarnings.map((w: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)] bg-[var(--color-error)]/5 rounded-xl px-4 py-3 border border-[var(--color-error)]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)] mt-1.5 shrink-0" /> {w}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {result.tips?.length > 0 && (
            <div className="glass-card p-6 rounded-3xl">
              <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-[var(--color-warning)]" /> Hotel Booking Tips
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.tips.map((tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)] bg-[var(--color-ocean)]/50 rounded-xl px-4 py-3 border border-[var(--color-border)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] mt-1.5 shrink-0" /> {tip}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <HotelDetailModal item={selectedItem} destination={activeDest} days={activeDays}
            onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
