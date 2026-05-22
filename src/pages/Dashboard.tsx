import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, MapPin, Plane, Loader2, Leaf, TrendingDown, Shield, UtensilsCrossed, Ticket, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore, useTripStore } from "../store";
import type { SavedTrip } from "../types";

export default function Dashboard() {
  const { user } = useAuthStore();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(false);

  // Global trip data
  const tripPlan = useTripStore((s) => s.tripPlan);
  const destination = useTripStore((s) => s.destination);
  const safetyResult = useTripStore((s) => s.safetyResult);
  const foodResult = useTripStore((s) => s.foodResult);
  const activityResult = useTripStore((s) => s.activityResult);
  const hotelResult = useTripStore((s) => s.hotelResult);
  const safetyLoading = useTripStore((s) => s.safetyLoading);
  const foodLoading = useTripStore((s) => s.foodLoading);
  const activityLoading = useTripStore((s) => s.activityLoading);
  const hotelLoading = useTripStore((s) => s.hotelLoading);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    fetch("/api/trips", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setTrips(d.trips || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalCarbon = trips.reduce((a, t) => a + (t.carbonKg || 0), 0);
  const totalSpent = trips.reduce((a, t) => a + (t.budget || 0), 0);
  const avgScore = trips.length > 0 ? Math.round(trips.reduce((a, t) => a + (t.antigravityScore || 0), 0) / trips.length) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold font-display mb-2">
          Travel <span className="text-gradient">Dashboard</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg">
          {destination ? `Viewing data for ${destination}` : "Your travel command center."}
        </p>
      </motion.div>

      {/* Current Trip Summary — always visible if a plan exists */}
      {tripPlan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
            <Plane className="w-5 h-5 text-[var(--color-teal)]" /> Current Trip: {destination}
          </h2>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Cost", value: `₹${tripPlan.expenses?.total?.toLocaleString() || 0}`, icon: "💰" },
              { label: "AG Score", value: tripPlan.antigravityScore?.overall || "—", icon: "⚡" },
              { label: "Carbon (kg)", value: tripPlan.carbonKg?.toFixed?.(1) || "—", icon: "🌱" },
              { label: "Route", value: tripPlan.bestRoute?.recommended || "—", icon: "🗺️" },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="glass-card p-5 rounded-2xl text-center"
              >
                <span className="text-2xl mb-2 block">{stat.icon}</span>
                <p className="text-2xl font-bold font-display text-[var(--color-text)]">{stat.value}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Status cards for Safety, Food, Activities, Hotels */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/safety">
              <motion.div whileHover={{ scale: 1.02 }} className="glass-card p-6 rounded-2xl cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-success)]/10">
                    <Shield className="w-5 h-5 text-[var(--color-success)]" />
                  </div>
                  <span className="font-semibold font-display">Safety Hub</span>
                </div>
                {safetyLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing safety…
                  </div>
                ) : safetyResult ? (
                  <div>
                    <p className="text-2xl font-bold" style={{ color: safetyResult.score.overall >= 70 ? "var(--color-success)" : "var(--color-warning)" }}>
                      {safetyResult.score.overall}/100
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Safety score • Click to see details</p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-secondary)]">Not yet analyzed</p>
                )}
              </motion.div>
            </Link>

            <Link to="/food">
              <motion.div whileHover={{ scale: 1.02 }} className="glass-card p-6 rounded-2xl cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-warning)]/10">
                    <UtensilsCrossed className="w-5 h-5 text-[var(--color-warning)]" />
                  </div>
                  <span className="font-semibold font-display">Food Explorer</span>
                </div>
                {foodLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Discovering food…
                  </div>
                ) : foodResult ? (
                  <div>
                    <p className="text-lg font-bold">
                      {(foodResult.hiddenGems?.length || 0) + (foodResult.budgetPicks?.length || 0) + (foodResult.famousSpots?.length || 0)} spots found
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Hidden gems, budget picks & more • Click to explore</p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-secondary)]">Not yet discovered</p>
                )}
              </motion.div>
            </Link>

            <Link to="/activities">
              <motion.div whileHover={{ scale: 1.02 }} className="glass-card p-6 rounded-2xl cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-grad-2)]/10">
                    <Ticket className="w-5 h-5 text-[var(--color-grad-2)]" />
                  </div>
                  <span className="font-semibold font-display">Activities</span>
                </div>
                {activityLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Finding activities…
                  </div>
                ) : activityResult ? (
                  <div>
                    <p className="text-lg font-bold">{activityResult.activities?.length || 0} activities</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{activityResult.weatherForecast?.slice(0, 50)}… • Click to explore</p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-secondary)]">Not yet planned</p>
                )}
              </motion.div>
            </Link>

            <Link to="/hotels">
              <motion.div whileHover={{ scale: 1.02 }} className="glass-card p-6 rounded-2xl cursor-pointer h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-grad-1)]/10">
                    <Building2 className="w-5 h-5 text-[var(--color-grad-1)]" />
                  </div>
                  <span className="font-semibold font-display">Hotels</span>
                </div>
                {hotelLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing hotels…
                  </div>
                ) : hotelResult ? (
                  <div>
                    <p className="text-lg font-bold">
                      {(hotelResult.recommended ? 1 : 0) + (hotelResult.budgetOptions?.length || 0) + (hotelResult.premiumOptions?.length || 0)} options
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Budget optimized & analyzed • Click to view</p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-secondary)]">Not analyzed yet</p>
                )}
              </motion.div>
            </Link>
          </div>
        </motion.div>
      )}

      {/* No plan generated yet */}
      {!tripPlan && (
        <div className="glass-card p-12 rounded-3xl text-center mb-10">
          <LayoutDashboard className="w-12 h-12 text-[var(--color-teal)] mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold font-display mb-2">No Active Trip</h2>
          <p className="text-[var(--color-text-secondary)] mb-4">Generate a Smart Plan to see your dashboard light up with Safety, Food & Activity data.</p>
          <Link to="/planner" className="inline-flex items-center gap-2 px-6 py-3 btn-primary rounded-full font-medium text-sm">
            <Plane className="w-4 h-4" /> Go to Planner
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Plan New Trip", icon: Plane, path: "/planner", color: "var(--color-teal)" },
          { label: "Safety Check", icon: Shield, path: "/safety", color: "var(--color-success)" },
          { label: "Discover Food", icon: UtensilsCrossed, path: "/food", color: "var(--color-warning)" },
          { label: "Hotel Intel", icon: Building2, path: "/hotels", color: "#a855f7" },
        ].map((action, i) => (
          <Link key={i} to={action.path}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="glass-card p-6 rounded-2xl flex items-center gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  '--action-color': action.color,
                  backgroundColor: 'color-mix(in srgb, var(--action-color) 15%, transparent)',
                } as React.CSSProperties}
              >
                <action.icon className="w-6 h-6" style={{ color: action.color }} />
              </div>
              <span className="font-semibold font-display">{action.label}</span>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Saved Trips (auth-gated) */}
      {user && (
        <>
          <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-[var(--color-teal)]" /> Your Saved Trips
          </h2>

          {/* Stats */}
          {trips.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Trips Planned", value: trips.length, icon: "🗺️" },
                { label: "Total Budget", value: `₹${totalSpent.toLocaleString()}`, icon: "💰" },
                { label: "Avg. AG Score", value: avgScore, icon: "⚡" },
                { label: "Carbon (kg)", value: totalCarbon.toFixed(1), icon: "🌱" },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="glass-card p-5 rounded-2xl text-center"
                >
                  <span className="text-2xl mb-2 block">{stat.icon}</span>
                  <p className="text-2xl font-bold font-display text-[var(--color-text)]">{stat.value}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-teal)]" />
            </div>
          ) : trips.length === 0 ? (
            <div className="glass-card p-12 rounded-3xl text-center">
              <p className="text-[var(--color-text-secondary)]">No trips saved yet. Plan your first trip!</p>
              <Link to="/planner" className="inline-flex items-center gap-2 mt-4 px-6 py-3 btn-primary rounded-full font-medium text-sm">
                <Plane className="w-4 h-4" /> Start Planning
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip, i) => (
                <motion.div key={trip.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass-card p-6 rounded-2xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold font-display text-lg">{trip.destination}</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-teal)]/10 text-[var(--color-teal)] font-medium">
                      ⚡ {trip.antigravityScore}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                    <span>{trip.days} days</span>
                    <span>{trip.travelers} travelers</span>
                    <span>₹{trip.budget?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-[var(--color-border)]">{trip.mood}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">🌱 {trip.carbonKg}kg</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] mt-3">{new Date(trip.createdAt).toLocaleDateString()}</p>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
