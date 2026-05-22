import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed, Loader2, MapPin, Star, Shield, X, Heart,
  MessageCircle, Navigation, IndianRupee, Clock, Flame, Leaf,
  ExternalLink, Share2, Copy, Check, Users, Sparkles
} from "lucide-react";
import type { FoodDiscoveryResult } from "../types";
import { useTripStore } from "../store";
import { showToast } from "../components/Toast";

// Fallback food image — unique per search term + index
const getFallbackImage = (searchTerm: string, index: number) => {
  const query = encodeURIComponent((searchTerm || "food dish").replace(/\s+/g, ","));
  // Use a simple hash of the search term + index as lock for unique images
  let hash = 0;
  for (let i = 0; i < (searchTerm || "").length; i++) {
    hash = ((hash << 5) - hash) + (searchTerm || "").charCodeAt(i);
    hash |= 0;
  }
  return `https://loremflickr.com/400/300/${query},food?lock=${Math.abs(hash) + index}`;
};

// Generate Google Maps link
const getMapLink = (name: string, location: string) => {
  const q = encodeURIComponent(`${name} ${location}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
};

// Spice level config
const SPICE_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
  "mild": { color: "#10B981", emoji: "🌶️", label: "Mild" },
  "medium": { color: "#F59E0B", emoji: "🌶️🌶️", label: "Medium" },
  "hot": { color: "#F97316", emoji: "🌶️🌶️🌶️", label: "Hot" },
  "very-hot": { color: "#EF4444", emoji: "🌶️🌶️🌶️🌶️", label: "Very Hot" },
};

// Ambiance config
const AMBIANCE_CONFIG: Record<string, { emoji: string; label: string }> = {
  "casual": { emoji: "🪑", label: "Casual" },
  "fine-dining": { emoji: "🍷", label: "Fine Dining" },
  "street-side": { emoji: "🛒", label: "Street Side" },
  "rooftop": { emoji: "🌅", label: "Rooftop" },
  "cozy-cafe": { emoji: "☕", label: "Cozy Café" },
  "family-friendly": { emoji: "👨‍👩‍👧‍👦", label: "Family Friendly" },
};

interface FoodItem {
  name: string;
  type: string;
  cuisine: string;
  avgCost: number;
  priceRange?: { min: number; max: number };
  location: string;
  address?: string;
  openingHours?: string;
  isVeg?: boolean;
  spiceLevel?: string;
  knownFor?: string;
  ambiance?: string;
  safetyScore: number;
  mustTry: string[];
  tip: string;
  imageSearch?: string;
  benefits?: string[];
  reviews?: { user: string; rating: number; comment: string; date?: string }[];
  _pexelsUrl?: string;
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

const FoodDetailModal: React.FC<{ item: FoodItem; onClose: () => void; category: string; destination: string }> = ({ item, onClose, category, destination }) => {
  const [copied, setCopied] = useState(false);
  const [modalImgError, setModalImgError] = useState(false);
  const categoryColors: Record<string, string> = {
    gem: "#a855f7", budget: "#10B981", famous: "#F59E0B",
  };
  const accentColor = categoryColors[category] || "#06B6D4";
  const spice = SPICE_CONFIG[item.spiceLevel || "medium"] || SPICE_CONFIG.medium;
  const ambianceInfo = AMBIANCE_CONFIG[item.ambiance || "casual"] || AMBIANCE_CONFIG.casual;
  const avgRating = item.reviews && item.reviews.length > 0
    ? (item.reviews.reduce((a, r) => a + r.rating, 0) / item.reviews.length).toFixed(1)
    : null;

  const shareText = `Check out ${item.name} in ${destination}! ${item.cuisine} food, avg ₹${item.avgCost}. ${item.knownFor || ""}`;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: item.name, text: shareText, url: getMapLink(item.name, item.location) });
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Build a reliable image URL with unique hash for the modal
  const getModalImage = () => {
    if (modalImgError) {
      // Ultimate fallback with unique hash
      let h = 0;
      for (let i = 0; i < item.name.length; i++) { h = ((h << 5) - h) + item.name.charCodeAt(i); h |= 0; }
      return `https://loremflickr.com/600/400/${encodeURIComponent(item.cuisine || item.name)},food,restaurant?lock=${Math.abs(h) + 500}`;
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
        <div className="relative h-48 md:h-60 overflow-hidden rounded-t-3xl" style={{ background: "linear-gradient(135deg, #1a1a3e 0%, #0d2137 100%)" }}>
          <img
            src={getModalImage()}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setModalImgError(true)}
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy)] via-transparent to-transparent" />

          {/* Top action buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Veg/Non-veg badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md ${item.isVeg ? "bg-green-500/30 text-green-300" : "bg-red-500/30 text-red-300"}`}>
              {item.isVeg ? "🌿 Veg" : "🍖 Non-Veg"}
            </span>
          </div>

          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: accentColor + "40", color: accentColor }}
              >{item.type}</span>
              <span className="text-xs px-2.5 py-1 rounded-full backdrop-blur-md bg-white/10 text-white/80">
                {ambianceInfo.emoji} {ambianceInfo.label}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-display text-white">{item.name}</h2>
            <p className="text-sm text-white/70">{item.cuisine} • {item.location}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Known For */}
          {item.knownFor && (
            <p className="text-sm text-[var(--color-text-secondary)] italic border-l-2 pl-4"
              style={{ borderLeftColor: accentColor }}
            >"{item.knownFor}"</p>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="glass p-3 rounded-xl text-center">
              <IndianRupee className="w-4 h-4 mx-auto mb-1" style={{ color: accentColor }} />
              <p className="text-lg font-bold font-display">₹{item.avgCost}</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">Avg Cost</p>
              {item.priceRange && (
                <p className="text-[9px] text-[var(--color-text-secondary)]">₹{item.priceRange.min}-{item.priceRange.max}</p>
              )}
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <Shield className="w-4 h-4 mx-auto mb-1 text-[var(--color-success)]" />
              <p className="text-lg font-bold font-display">{item.safetyScore}/10</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">Safety</p>
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <Star className="w-4 h-4 mx-auto mb-1 text-[var(--color-warning)]" />
              <p className="text-lg font-bold font-display">{avgRating || "—"}</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">Rating</p>
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <Flame className="w-4 h-4 mx-auto mb-1" style={{ color: spice.color }} />
              <p className="text-sm font-bold">{spice.emoji}</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] uppercase">{spice.label}</p>
            </div>
          </div>

          {/* Location & Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="glass p-4 rounded-xl">
              <h3 className="font-semibold text-xs flex items-center gap-2 mb-2">
                <Navigation className="w-3.5 h-3.5" style={{ color: accentColor }} /> Where to Find
              </h3>
              <p className="text-sm font-medium">{item.location}</p>
              {item.address && <p className="text-xs text-[var(--color-text-secondary)] mt-1">📍 {item.address}</p>}
              <a href={getMapLink(item.name, item.location)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium hover:underline"
                style={{ color: accentColor }}
              >
                <ExternalLink className="w-3 h-3" /> Open in Maps
              </a>
            </div>
            {item.openingHours && (
              <div className="glass p-4 rounded-xl">
                <h3 className="font-semibold text-xs flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5" style={{ color: accentColor }} /> Opening Hours
                </h3>
                <p className="text-sm font-medium">{item.openingHours}</p>
              </div>
            )}
          </div>

          {/* Must Try */}
          {item.mustTry && item.mustTry.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: accentColor }} /> Must Try
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.mustTry.map((dish, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ backgroundColor: accentColor + "15", color: accentColor }}
                  >{dish}</span>
                ))}
              </div>
            </div>
          )}

          {/* Health Benefits */}
          {item.benefits && item.benefits.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-pink-400" /> Health & Nutritional Benefits
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

          {/* Pro Tip */}
          {item.tip && (
            <div className="glass p-4 rounded-xl border-l-4" style={{ borderLeftColor: accentColor }}>
              <p className="text-xs text-[var(--color-text-secondary)]">💡 <strong>Pro Tip:</strong> {item.tip}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Food Card ─────────────────────────────────────────────────────────────────

const FoodCard: React.FC<{ item: FoodItem; highlight: string; index: number; onClick: () => void }> = ({ item, highlight, index, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const spice = SPICE_CONFIG[item.spiceLevel || "medium"] || SPICE_CONFIG.medium;
  const avgRating = item.reviews && item.reviews.length > 0
    ? (item.reviews.reduce((a, r) => a + r.rating, 0) / item.reviews.length).toFixed(1)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card rounded-2xl overflow-hidden cursor-pointer group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={imgError ? `https://loremflickr.com/400/300/food,dish?lock=${index + 999}` : (item._pexelsUrl || getFallbackImage(item.imageSearch || item.name, index))}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy)]/90 via-[var(--color-navy)]/20 to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md ${item.isVeg ? "bg-green-500/30 text-green-300" : "bg-red-500/30 text-red-300"}`}>
            {item.isVeg ? "🌿 Veg" : "🍖 Non-Veg"}
          </span>
        </div>
        <span className={`absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md ${
          highlight === "gem" ? "bg-purple-500/30 text-purple-300" :
          highlight === "budget" ? "bg-green-500/30 text-green-300" :
          "bg-amber-500/30 text-amber-300"
        }`}>{item.type}</span>

        {/* Bottom text on image */}
        <div className="absolute bottom-3 left-4 right-4">
          <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
          <p className="text-[11px] text-white/60 truncate">{item.cuisine} • {item.location}</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        {/* Price + Rating + Spice */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-[var(--color-text)] flex items-center gap-1">
              <IndianRupee className="w-3 h-3" /> ₹{item.avgCost}
            </span>
            <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
              <Shield className="w-3 h-3 text-[var(--color-success)]" /> {item.safetyScore}/10
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {avgRating && (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-[var(--color-warning)] fill-current" /> {avgRating}
              </span>
            )}
            <span style={{ color: spice.color }} className="text-[10px]">{spice.emoji}</span>
          </div>
        </div>

        {/* Must Try */}
        {item.mustTry && item.mustTry.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.mustTry.slice(0, 3).map((dish, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-teal)]/10 text-[var(--color-teal)]">
                {dish}
              </span>
            ))}
            {item.mustTry.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--color-text-secondary)]">
                +{item.mustTry.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Opening Hours + Ambiance */}
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)]">
          {item.openingHours && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.openingHours}</span>
          )}
          {item.ambiance && AMBIANCE_CONFIG[item.ambiance] && (
            <span>{AMBIANCE_CONFIG[item.ambiance].emoji} {AMBIANCE_CONFIG[item.ambiance].label}</span>
          )}
        </div>

        {/* Hover CTA */}
        <p className="text-[11px] text-[var(--color-teal)] font-medium opacity-0 group-hover:opacity-100 transition-opacity pt-1">
          Click for details, benefits & reviews →
        </p>
      </div>
    </motion.div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function FoodExplorer() {
  const [destination, setDestination] = useState("");
  const [dietary, setDietary] = useState("");
  const [loading, setLoading] = useState(false);
  const [localResult, setLocalResult] = useState<FoodDiscoveryResult | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ item: FoodItem; category: string } | null>(null);

  const storeResult = useTripStore((s) => s.foodResult);
  const storeLoading = useTripStore((s) => s.foodLoading);
  const storeDestination = useTripStore((s) => s.destination);

  const result = localResult || storeResult;
  const isLoading = loading || storeLoading;
  const displayDestination = destination || storeDestination;
  const activeDest = result?.destination || displayDestination;

  const totalSpots = result
    ? (result.hiddenGems?.length || 0) + (result.budgetPicks?.length || 0) + (result.famousSpots?.length || 0)
    : 0;

  // Fetch Pexels images when results change
  const [imageMap, setImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!result) return;
    const allItems = [
      ...(result.hiddenGems || []),
      ...(result.budgetPicks || []),
      ...(result.famousSpots || []),
    ];
    const queries = allItems
      .map((item: any) => item.imageSearch || item.name)
      .filter((q: string) => q && !imageMap[q]);

    if (queries.length === 0) return;

    fetch("/api/food-images/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.images) {
          setImageMap((prev) => ({ ...prev, ...data.images }));
        }
      })
      .catch(() => {});
  }, [result]);

  const discover = async () => {
    const searchDest = destination.trim() || storeDestination;
    if (!searchDest) return;
    setLoading(true);
    try {
      const r = await fetch("/api/food-discover", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: searchDest, dietary, budget: "moderate" }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setLocalResult(data);
      useTripStore.getState().setFoodResult(data);
    } catch { showToast("Failed to discover food.", "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold font-display mb-2">
          Food <span className="text-gradient">Explorer</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg">Discover hidden gems, street food, and famous restaurants with AI.</p>
      </motion.div>

      {/* Search Bar */}
      <div className="glass-card p-6 rounded-3xl mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
            <input value={displayDestination} onChange={e => setDestination(e.target.value)}
              placeholder="Destination (e.g., Jaipur, Tokyo, Rome)" onKeyDown={e => e.key === "Enter" && discover()}
              className="w-full bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl pl-12 pr-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all"
            />
          </div>
          <input value={dietary} onChange={e => setDietary(e.target.value)} placeholder="Dietary (e.g., vegetarian)"
            className="md:w-48 bg-[var(--color-navy)]/50 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] transition-all"
          />
          <button onClick={discover} disabled={isLoading || !(destination.trim() || storeDestination)}
            className="btn-primary px-8 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UtensilsCrossed className="w-5 h-5" />}
            {isLoading ? "Discovering…" : "Discover"}
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && !result && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-[var(--color-teal)]/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-[var(--color-teal)] rounded-full border-t-transparent animate-spin" />
            <UtensilsCrossed className="absolute inset-0 m-auto w-8 h-8 text-[var(--color-teal)] animate-pulse" />
          </div>
          <p className="text-lg font-display font-medium animate-pulse">Discovering food in {displayDestination}…</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Analyzing local cuisine, reviews & hidden gems</p>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
          {/* Summary Stats Bar */}
          <div className="glass-card p-4 rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--color-teal)]" />
                  <span className="font-semibold font-display">{activeDest}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {totalSpots} spots found</span>
                  <span>💧 {result.waterSafety}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result.dietaryNotes?.map((n: string, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-[var(--color-teal)]/10 text-[var(--color-teal)]">{n}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Best Food Areas */}
          {(result as any).bestFoodAreas && (result as any).bestFoodAreas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">🗺️ Best food areas:</span>
              {(result as any).bestFoodAreas.map((area: string, i: number) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/5 border border-[var(--color-border)] text-[var(--color-text)]">{area}</span>
              ))}
            </div>
          )}

          {/* Hidden Gems */}
          {result.hiddenGems?.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
                <span>💎</span> Hidden Gems
                <span className="text-xs font-normal text-[var(--color-text-secondary)] bg-white/5 px-2 py-0.5 rounded-full ml-2">{result.hiddenGems.length} spots</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.hiddenGems.map((item: any, i: number) => {
                  const enriched = { ...item, _pexelsUrl: imageMap[item.imageSearch || item.name] };
                  return (
                    <FoodCard key={i} item={enriched} highlight="gem" index={i}
                      onClick={() => setSelectedItem({ item: enriched, category: "gem" })} />
                  );
                })}
              </div>
            </div>
          )}

          {/* Budget Picks */}
          {result.budgetPicks?.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
                <span>🎯</span> Budget Picks
                <span className="text-xs font-normal text-[var(--color-text-secondary)] bg-white/5 px-2 py-0.5 rounded-full ml-2">{result.budgetPicks.length} spots</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.budgetPicks.map((item: any, i: number) => {
                  const enriched = { ...item, _pexelsUrl: imageMap[item.imageSearch || item.name] };
                  return (
                    <FoodCard key={i} item={enriched} highlight="budget" index={i + 10}
                      onClick={() => setSelectedItem({ item: enriched, category: "budget" })} />
                  );
                })}
              </div>
            </div>
          )}

          {/* Famous Spots */}
          {result.famousSpots?.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
                <span>⭐</span> Famous Spots
                <span className="text-xs font-normal text-[var(--color-text-secondary)] bg-white/5 px-2 py-0.5 rounded-full ml-2">{result.famousSpots.length} spots</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.famousSpots.map((item: any, i: number) => {
                  const enriched = { ...item, _pexelsUrl: imageMap[item.imageSearch || item.name] };
                  return (
                    <FoodCard key={i} item={enriched} highlight="famous" index={i + 20}
                      onClick={() => setSelectedItem({ item: enriched, category: "famous" })} />
                  );
                })}
              </div>
            </div>
          )}

          {/* Local Food Etiquette */}
          {(result as any).localEtiquette && (result as any).localEtiquette.length > 0 && (
            <div className="glass-card p-6 rounded-3xl">
              <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-[var(--color-success)]" /> Local Food Etiquette
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(result as any).localEtiquette.map((tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)] bg-[var(--color-ocean)]/50 rounded-xl px-4 py-3 border border-[var(--color-border)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] mt-1.5 shrink-0" /> {tip}
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
          <FoodDetailModal
            item={selectedItem.item}
            category={selectedItem.category}
            destination={activeDest}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
