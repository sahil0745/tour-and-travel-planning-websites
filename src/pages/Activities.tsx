import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket, Loader2, MapPin, Clock, IndianRupee, Briefcase, CloudSun,
  Star, X, Heart, MessageCircle, Navigation, ExternalLink, Share2,
  Check, Users, Sparkles, Shield, Flame, Mountain, Accessibility,
  Calendar, UtensilsCrossed, Lightbulb, ChevronRight
} from "lucide-react";
import type { ActivityResult } from "../types";
import { useTripStore } from "../store";
import { showToast } from "../components/Toast";

// ── Helpers ────────────────────────────────────────────────────────────────

const getFallbackImage = (searchTerm: string, index: number) => {
  const query = encodeURIComponent((searchTerm || "activity travel").replace(/\s+/g, ","));
  let hash = 0;
  for (let i = 0; i < (searchTerm || "").length; i++) {
    hash = ((hash << 5) - hash) + (searchTerm || "").charCodeAt(i);
    hash |= 0;
  }
  return `https://loremflickr.com/400/300/${query},travel?lock=${Math.abs(hash) + index}`;
};

const getMapLink = (name: string, location: string) => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${location}`)}`;
};

// ── Config Maps ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
  cultural:   { color: "#8b5cf6", emoji: "🏛️", label: "Cultural" },
  adventure:  { color: "#F97316", emoji: "🏔️", label: "Adventure" },
  relaxation: { color: "#06B6D4", emoji: "🧘", label: "Relaxation" },
  nightlife:  { color: "#EC4899", emoji: "🌃", label: "Nightlife" },
  nature:     { color: "#10B981", emoji: "🌿", label: "Nature" },
  shopping:   { color: "#F59E0B", emoji: "🛍️", label: "Shopping" },
};

const DIFFICULTY_CONFIG: Record<string, { color: string; emoji: string }> = {
  easy:        { color: "#10B981", emoji: "🟢" },
  moderate:    { color: "#F59E0B", emoji: "🟡" },
  challenging: { color: "#EF4444", emoji: "🔴" },
};

interface ActivityItem {
  name: string;
  type: string;
  cost: number;
  priceRange?: { min: number; max: number };
  duration: string;
  bestTime: string;
  weatherDependent: boolean;
  crowdLevel: string;
  rating: number;
  tip: string;
  imageSearch?: string;
  location?: string;
  address?: string;
  openingHours?: string;
  description?: string;
  difficulty?: string;
  ageGroup?: string;
  accessibility?: string;
  bestSeason?: string;
  highlights?: string[];
  benefits?: string[];
  reviews?: { user: string; rating: number; comment: string; date?: string }[];
  nearbyFood?: string;
  _pexelsUrl?: string;
}

// ── Detail Modal ────────────────────────────────────────────────────────────

const ActivityDetailModal: React.FC<{
  item: ActivityItem; onClose: () => void; destination: string;
}> = ({ item, onClose, destination }) => {
  const [copied, setCopied] = useState(false);
  const [modalImgError, setModalImgError] = useState(false);

  const typeInfo = TYPE_CONFIG[item.type] || TYPE_CONFIG.cultural;
  const diffInfo = DIFFICULTY_CONFIG[item.difficulty || "easy"] || DIFFICULTY_CONFIG.easy;
  const avgRating = item.reviews && item.reviews.length > 0
    ? (item.reviews.reduce((a, r) => a + r.rating, 0) / item.reviews.length).toFixed(1)
    : null;

  const shareText = `Check out "${item.name}" in ${destination}! ${item.type} activity, ₹${item.cost}. ${item.description || ""}`;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: item.name, text: shareText, url: getMapLink(item.name, item.location || destination) });
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getModalImage = () => {
    if (modalImgError) {
      let h = 0;
      for (let i = 0; i < item.name.length; i++) { h = ((h << 5) - h) + item.name.charCodeAt(i); h |= 0; }
      return `https://loremflickr.com/600/400/${encodeURIComponent(item.type || "travel")},activity,place?lock=${Math.abs(h) + 500}`;
    }
    return item._pexelsUrl || getFallbackImage(item.imageSearch || item.name, 99);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: "spring", damping: 25 }}
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl glass-card"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.2) transparent" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Image */}
        <div className="relative h-48 md:h-60 overflow-hidden rounded-t-3xl"
          style={{ background: "linear-gradient(135deg, #1a1a3e 0%, #0d2137 100%)" }}>
          <img src={getModalImage()} alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setModalImgError(true)} loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy)] via-transparent to-transparent" />

          {/* Top buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom overlay */}
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: typeInfo.color + "40", color: typeInfo.color }}>
                {typeInfo.emoji} {typeInfo.label}
              </span>
              {item.difficulty && (
                <span className="text-xs px-2.5 py-1 rounded-full backdrop-blur-md bg-white/10 text-white/80">
                  {diffInfo.emoji} {item.difficulty}
                </span>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-display text-white">{item.name}</h2>
            <p className="text-sm text-white/70">{item.location || destination}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Description */}
          {item.description && (
            <p className="text-sm text-[var(--color-text-secondary)] italic border-l-2 pl-4"
              style={{ borderLeftColor: typeInfo.color }}>
              "{item.description}"
            </p>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="glass p-3 rounded-xl text-center">
              <IndianRupee className="w-4 h-4 mx-auto mb-1" style={{ color: typeInfo.color }} />
              <p className="text-lg font-bold font-display">{item.cost === 0 ? "Free" : `₹${item.cost}`}</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">Cost</p>
              {item.priceRange && item.priceRange.max > 0 && (
                <p className="text-[9px] text-[var(--color-text-secondary)]">₹{item.priceRange.min}-{item.priceRange.max}</p>
              )}
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <Clock className="w-4 h-4 mx-auto mb-1 text-[var(--color-teal)]" />
              <p className="text-lg font-bold font-display">{item.duration}</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">Duration</p>
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <Star className="w-4 h-4 mx-auto mb-1 text-[var(--color-warning)]" />
              <p className="text-lg font-bold font-display">{avgRating || item.rating}</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">Rating</p>
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <Users className="w-4 h-4 mx-auto mb-1" style={{ color: item.crowdLevel === "low" ? "#10B981" : item.crowdLevel === "high" ? "#EF4444" : "#F59E0B" }} />
              <p className="text-sm font-bold capitalize">{item.crowdLevel}</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">Crowd</p>
            </div>
          </div>

          {/* Location & Hours & Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="glass p-4 rounded-xl">
              <h3 className="font-semibold text-xs flex items-center gap-2 mb-2">
                <Navigation className="w-3.5 h-3.5" style={{ color: typeInfo.color }} /> Where to Go
              </h3>
              <p className="text-sm font-medium">{item.location || destination}</p>
              {item.address && <p className="text-xs text-[var(--color-text-secondary)] mt-1">📍 {item.address}</p>}
              <a href={getMapLink(item.name, item.location || destination)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium hover:underline"
                style={{ color: typeInfo.color }}>
                <ExternalLink className="w-3 h-3" /> Open in Maps
              </a>
            </div>
            <div className="glass p-4 rounded-xl space-y-2">
              {item.openingHours && (
                <div>
                  <h3 className="font-semibold text-xs flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5" style={{ color: typeInfo.color }} /> Hours
                  </h3>
                  <p className="text-sm">{item.openingHours}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded-full bg-white/5">⏰ Best: {item.bestTime}</span>
                {item.bestSeason && <span className="px-2 py-0.5 rounded-full bg-white/5">📅 {item.bestSeason}</span>}
                {item.weatherDependent && <span className="px-2 py-0.5 rounded-full bg-[var(--color-warning)]/10 text-[var(--color-warning)]">🌧️ Weather dep.</span>}
              </div>
            </div>
          </div>

          {/* Age, Accessibility */}
          <div className="flex flex-wrap gap-2 text-xs">
            {item.ageGroup && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 border border-[var(--color-border)]">
                👤 {item.ageGroup.replace(/-/g, " ")}
              </span>
            )}
            {item.accessibility && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 border border-[var(--color-border)]">
                ♿ {item.accessibility.replace(/-/g, " ")}
              </span>
            )}
          </div>

          {/* Highlights */}
          {item.highlights && item.highlights.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: typeInfo.color }} /> Highlights
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.highlights.map((h, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ backgroundColor: typeInfo.color + "15", color: typeInfo.color }}>
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {item.benefits && item.benefits.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-pink-400" /> Why You'll Love It
              </h3>
              <div className="space-y-2">
                {item.benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1.5 shrink-0" /> {b}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {item.reviews && item.reviews.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <MessageCircle className="w-4 h-4 text-[var(--color-teal)]" /> Traveler Reviews
              </h3>
              <div className="space-y-3">
                {item.reviews.map((review, i) => (
                  <div key={i} className="glass p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-grad-1)] to-[var(--color-grad-2)] flex items-center justify-center text-white text-xs font-bold">
                          {review.user.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-medium">{review.user}</span>
                          {review.date && <p className="text-[10px] text-[var(--color-text-secondary)]">{review.date}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className={`w-3 h-3 ${j < Math.round(review.rating) ? "text-[var(--color-warning)] fill-current" : "text-[var(--color-border)]"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] italic">"{review.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Food */}
          {item.nearbyFood && (
            <div className="glass p-4 rounded-xl flex items-center gap-3" style={{ borderLeft: `3px solid ${typeInfo.color}` }}>
              <UtensilsCrossed className="w-5 h-5 text-[var(--color-warning)] shrink-0" />
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Nearby Food Spot</p>
                <p className="text-sm font-medium">{item.nearbyFood}</p>
              </div>
            </div>
          )}

          {/* Pro Tip */}
          {item.tip && (
            <div className="glass p-4 rounded-xl border-l-4" style={{ borderLeftColor: typeInfo.color }}>
              <p className="text-xs text-[var(--color-text-secondary)]">💡 <strong>Pro Tip:</strong> {item.tip}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Activity Card ────────────────────────────────────────────────────────────

const ActivityCard: React.FC<{
  item: ActivityItem; index: number; onClick: () => void;
}> = ({ item, index, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const typeInfo = TYPE_CONFIG[item.type] || TYPE_CONFIG.cultural;
  const diffInfo = DIFFICULTY_CONFIG[item.difficulty || "easy"] || DIFFICULTY_CONFIG.easy;
  const avgRating = item.reviews && item.reviews.length > 0
    ? (item.reviews.reduce((a, r) => a + r.rating, 0) / item.reviews.length).toFixed(1)
    : item.rating?.toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card rounded-2xl overflow-hidden cursor-pointer group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={imgError ? `https://loremflickr.com/400/300/travel,place?lock=${index + 888}` : (item._pexelsUrl || getFallbackImage(item.imageSearch || item.name, index))}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy)]/90 via-[var(--color-navy)]/20 to-transparent" />

        {/* Type badge */}
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md"
          style={{ backgroundColor: typeInfo.color + "30", color: typeInfo.color }}>
          {typeInfo.emoji} {typeInfo.label}
        </span>

        {/* Difficulty badge */}
        {item.difficulty && (
          <span className="absolute top-3 left-3 text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md bg-black/30 text-white/80">
            {diffInfo.emoji} {item.difficulty}
          </span>
        )}

        {/* Bottom text */}
        <div className="absolute bottom-3 left-4 right-4">
          <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
          <p className="text-[11px] text-white/60 truncate">{item.location || ""} • {item.duration}</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        {/* Price + Rating + Crowd */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-[var(--color-text)] flex items-center gap-1">
              <IndianRupee className="w-3 h-3" /> {item.cost === 0 ? "Free" : `₹${item.cost}`}
            </span>
            <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
              <Clock className="w-3 h-3" /> {item.duration}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-[var(--color-warning)] fill-current" /> {avgRating}
            </span>
            <span className={`w-2 h-2 rounded-full ${item.crowdLevel === "low" ? "bg-[var(--color-success)]" : item.crowdLevel === "high" ? "bg-[var(--color-error)]" : "bg-[var(--color-warning)]"}`} />
          </div>
        </div>

        {/* Highlights preview */}
        {item.highlights && item.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.highlights.slice(0, 2).map((h, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: typeInfo.color + "10", color: typeInfo.color }}>
                {h}
              </span>
            ))}
            {item.highlights.length > 2 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--color-text-secondary)]">
                +{item.highlights.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Time + Weather */}
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)]">
          <span>⏰ Best: {item.bestTime}</span>
          {item.weatherDependent && <span className="text-[var(--color-warning)]">🌧️ weather</span>}
        </div>

        {/* Hover CTA */}
        <p className="text-[11px] text-[var(--color-teal)] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          View details, reviews & benefits <ChevronRight className="w-3 h-3" />
        </p>
      </div>
    </motion.div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

export default function Activities() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(5);
  const [mood, setMood] = useState("balanced");
  const [loading, setLoading] = useState(false);
  const [localResult, setLocalResult] = useState<ActivityResult | null>(null);
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);

  const storeResult = useTripStore((s) => s.activityResult);
  const storeLoading = useTripStore((s) => s.activityLoading);
  const storeDestination = useTripStore((s) => s.destination);

  const result = localResult || storeResult;
  const isLoading = loading || storeLoading;
  const displayDestination = destination || storeDestination;
  const activeDest = (result as any)?.destination || displayDestination;

  const totalActivities = (result?.activities || []).length;

  // Batch-fetch Pexels images
  const [imageMap, setImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!result || !result.activities) return;
    const queries = result.activities
      .map((a: any) => a.imageSearch || a.name)
      .filter((q: string) => q && !imageMap[q]);
    if (queries.length === 0) return;

    fetch("/api/food-images/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.images) setImageMap(prev => ({ ...prev, ...data.images }));
      })
      .catch(() => {});
  }, [result]);

  const suggest = async () => {
    const searchDest = destination.trim() || storeDestination;
    if (!searchDest) return;
    setLoading(true);
    try {
      const r = await fetch("/api/activity-suggest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: searchDest, days, mood, budget: 50000 }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setLocalResult(data);
      useTripStore.getState().setActivityResult(data);
    } catch { showToast("Failed to get activity suggestions.", "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold font-display mb-2">
          Activity <span className="text-gradient">Explorer</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg">Smart activity suggestions with photos, reviews & packing list.</p>
      </motion.div>

      {/* Search Bar */}
      <div className="glass-card p-6 rounded-3xl mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
            <input value={displayDestination} onChange={e => setDestination(e.target.value)}
              placeholder="Destination (e.g., Goa, Manali, Jaipur)" onKeyDown={e => e.key === "Enter" && suggest()}
              className="w-full bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl pl-12 pr-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all"
            />
          </div>
          <input type="number" value={days} onChange={e => setDays(Number(e.target.value))} min={1} max={30}
            className="md:w-24 bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all text-center"
            placeholder="Days"
          />
          <select value={mood} onChange={e => setMood(e.target.value)}
            className="md:w-36 bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all appearance-none">
            {["balanced", "chill", "adventure", "cultural", "luxury", "backpacker"].map(m => (
              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
          <button onClick={suggest} disabled={isLoading || !(destination.trim() || storeDestination)}
            className="btn-primary px-8 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Ticket className="w-5 h-5" />}
            {isLoading ? "Exploring…" : "Explore"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !result && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-[var(--color-teal)]/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-[var(--color-teal)] rounded-full border-t-transparent animate-spin" />
            <Mountain className="absolute inset-0 m-auto w-8 h-8 text-[var(--color-teal)] animate-pulse" />
          </div>
          <p className="text-lg font-display font-medium animate-pulse">Finding activities in {displayDestination}…</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Analyzing experiences, ratings & local secrets</p>
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
                  <span className="flex items-center gap-1"><Ticket className="w-3.5 h-3.5" /> {totalActivities} activities</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {(result as any)?.days || days} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weather + Best Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
              <CloudSun className="w-8 h-8 text-[var(--color-warning)]" />
              <div>
                <p className="font-semibold text-sm">Weather Forecast</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{result.weatherForecast}</p>
              </div>
            </div>
            <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
              <Clock className="w-8 h-8 text-[var(--color-teal)]" />
              <div>
                <p className="font-semibold text-sm">Best Time to Visit</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{result.bestTimeToVisit}</p>
              </div>
            </div>
          </div>

          {/* Top Areas */}
          {(result as any).topAreas && (result as any).topAreas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">📍 Top areas:</span>
              {(result as any).topAreas.map((area: string, i: number) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/5 border border-[var(--color-border)] text-[var(--color-text)]">{area}</span>
              ))}
            </div>
          )}

          {/* Activities Grid */}
          <div>
            <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
              🎯 Suggested Activities
              <span className="text-xs font-normal text-[var(--color-text-secondary)] bg-white/5 px-2 py-0.5 rounded-full ml-2">
                {totalActivities} experiences
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(result.activities || []).map((act: any, i: number) => {
                const enriched = { ...act, _pexelsUrl: imageMap[act.imageSearch || act.name] };
                return (
                  <ActivityCard key={i} item={enriched} index={i}
                    onClick={() => setSelectedItem(enriched)} />
                );
              })}
            </div>
          </div>

          {/* Local Tips */}
          {(result as any).localTips && (result as any).localTips.length > 0 && (
            <div className="glass-card p-6 rounded-3xl">
              <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-[var(--color-warning)]" /> Local Tips
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(result as any).localTips.map((tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)] bg-[var(--color-ocean)]/50 rounded-xl px-4 py-3 border border-[var(--color-border)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] mt-1.5 shrink-0" /> {tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Packing List */}
          {result.packingList && result.packingList.length > 0 && (
            <div className="glass-card p-6 rounded-3xl">
              <h2 className="text-2xl font-bold font-display mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[var(--color-teal)]" /> Smart Packing List
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {["clothes", "tech", "documents", "medicine", "misc"].map(cat => {
                  const items = result.packingList.filter((p: any) => p.category === cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat} className="bg-[var(--color-ocean)]/50 rounded-xl p-4 border border-[var(--color-border)]">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-teal)] mb-2">{cat}</h4>
                      <ul className="space-y-1.5">
                        {items.map((item: any, i: number) => (
                          <li key={i} className={`text-xs flex items-center gap-1.5 ${item.essential ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.essential ? "bg-[var(--color-warning)]" : "bg-white/20"}`} />
                            {item.item} {item.essential && <span className="text-[var(--color-warning)] text-[9px]">★</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <ActivityDetailModal
            item={selectedItem}
            destination={activeDest}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
