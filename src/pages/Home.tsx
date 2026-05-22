import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import { Compass, Shield, UtensilsCrossed, Ticket, Map, LayoutDashboard, Zap, Leaf, ArrowRight, ChevronDown, Star, Users, Globe, Quote, Building2 } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TextFlip from "../components/animata/text/text-flip";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  { icon: Map, title: "Smart Planner", desc: "Multi-city AI trip planning with Antigravity scoring", path: "/planner", color: "var(--color-teal)" },
  { icon: Shield, title: "Safety Hub", desc: "Scam detection, risk analysis & emergency info", path: "/safety", color: "var(--color-success)" },
  { icon: UtensilsCrossed, title: "Food Explorer", desc: "Discover hidden gems & local street food", path: "/food", color: "var(--color-warning)" },
  { icon: Ticket, title: "Activity Planner", desc: "Weather-aware activities & smart packing list", path: "/activities", color: "var(--color-grad-2)" },
  { icon: LayoutDashboard, title: "Dashboard", desc: "Track trips, spending & carbon footprint", path: "/dashboard", color: "var(--color-grad-1)" },
  { icon: Leaf, title: "Eco Tracker", desc: "Carbon footprint analysis for every trip", path: "/planner", color: "var(--color-cyan-glow)" },
];

const DESTINATIONS = [
  { name: "Santorini, Greece", price: "₹1,20,000", rating: 4.9, image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?q=80&w=800&auto=format&fit=crop" },
  { name: "Kyoto, Japan", price: "₹95,000", rating: 4.8, image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop" },
  { name: "Swiss Alps", price: "₹1,50,000", rating: 5.0, image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=800&auto=format&fit=crop" },
];

const TESTIMONIALS = [
  { name: "Priya Sharma", role: "Solo Traveler", text: "AeroVoyage completely transformed how I plan trips. The AI suggestions are uncannily accurate!", avatar: "PS" },
  { name: "James Chen", role: "Family Vacations", text: "The safety scoring alone saved us from several tourist traps. Absolutely essential travel tool.", avatar: "JC" },
  { name: "Elena Rodriguez", role: "Digital Nomad", text: "I've tried dozens of travel planners. Nothing comes close to the Antigravity Engine's route optimization.", avatar: "ER" },
];

const TICKER_CITIES = [
  "Tokyo", "Paris", "New York", "Bali", "Dubai", "London", "Maldives", "Rome", "Barcelona", "Sydney",
  "Santorini", "Kyoto", "Reykjavik", "Cape Town", "Marrakech", "Singapore", "Rio de Janeiro", "Prague",
];

export default function Home() {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const carouselCardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Ultra-Premium GSAP Carousel Animation
    DESTINATIONS.forEach((_, i) => {
      const position = getPosition(i);
      const card = carouselCardsRef.current[i];
      if (!card) return;

      const isMobile = window.innerWidth < 768;
      let x = 0, scale = 1.15, rotateY = 0, opacity = 1, filter = "blur(0px)", zIndex = 30;

      if (position === "left") {
         x = isMobile ? -300 : -350;
         scale = 0.9;
         rotateY = 12;
         opacity = 0.7;
         filter = "blur(2px)";
         zIndex = 20;
      } else if (position === "right") {
         x = isMobile ? 300 : 350;
         scale = 0.9;
         rotateY = -12;
         opacity = 0.7;
         filter = "blur(2px)";
         zIndex = 20;
      } else if (position === "hidden") {
         scale = 0.75;
         opacity = 0;
         filter = "blur(5px)";
         zIndex = 10;
      }

      gsap.to(card, {
        x,
        scale,
        rotationY: rotateY,
        opacity,
        filter,
        zIndex,
        duration: 0.9,
        ease: "power3.inOut",
        overwrite: "auto",
      });
    });
  }, [carouselIndex]);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % DESTINATIONS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isHovered]);

  const getPosition = (i: number) => {
    if (i === carouselIndex) return "center";
    if (i === (carouselIndex - 1 + DESTINATIONS.length) % DESTINATIONS.length) return "left";
    if (i === (carouselIndex + 1) % DESTINATIONS.length) return "right";
    return "hidden";
  };

  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 800], [0, 200]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  // Mouse Parallax Trackers
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 60, damping: 30 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 60, damping: 30 });

  // Inverse movement for distant backgrounds
  const bgMoveX = useTransform(smoothMouseX, [-1, 1], [30, -30]);
  const bgMoveY = useTransform(smoothMouseY, [-1, 1], [30, -30]);
  // Forward movement for floating foreground objects
  const floatMoveX = useTransform(smoothMouseX, [-1, 1], [-20, 20]);
  const floatMoveY = useTransform(smoothMouseY, [-1, 1], [-20, 20]);

  useEffect(() => {
    // Mouse move integration
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseX.set((e.clientX / innerWidth) * 2 - 1);
      mouseY.set((e.clientY / innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", handleMouseMove);

    const ctx = gsap.context(() => {
      // Hero elements stagger
      if (heroRef.current) {
        gsap.fromTo(
          heroRef.current.querySelectorAll(".gsap-fade"),
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, stagger: 0.15, duration: 0.8, ease: "power3.out" }
        );
      }

      // Feature cards scroll animation
      gsap.from(".feature-card", {
        y: 80,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 80%",
          end: "bottom 20%",
        },
      });

      // Destination cards scroll animation with 3D tilt
      gsap.from(".dest-card", {
        y: 100,
        rotationX: 15,
        scale: 0.95,
        opacity: 0,
        duration: 1.2,
        stagger: 0.2,
        ease: "power3.out",
        transformOrigin: "bottom center",
        scrollTrigger: {
          trigger: showcaseRef.current,
          start: "top 80%",
        }
      });

      // Engine section scroll animation
      gsap.from(".engine-content", {
        x: -60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: engineRef.current,
          start: "top 75%",
        },
      });

      gsap.from(".engine-score", {
        scale: 0.7,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: engineRef.current,
          start: "top 70%",
        },
      });

      // Testimonials scroll animation (Ultra Premium Production Level)
      const testCards = gsap.utils.toArray(".testimonial-card-wrapper");
      testCards.forEach((card: any, i) => {
        // Enter from bottom, exit to bottom
        gsap.fromTo(card,
          {
            y: 100,
            opacity: 0,
            scale: 0.95,
          },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: "power3.out",
            delay: i * 0.15,
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              end: "top 20%",
              toggleActions: "play none none reverse",
            },
            onComplete: () => {
              // Add Floating Effect to the inner wrapper container
              const floater = card.querySelector(".testimonial-card-float");
              if (floater) {
                gsap.to(floater, {
                  y: -10,
                  duration: 2,
                  repeat: -1,
                  yoyo: true,
                  ease: "sine.inOut",
                  delay: i * 0.2, // Offset floats slightly for a wave effect
                });
              }
            }
          }
        );
      });

      // CTA section scroll animation
      gsap.from(".cta-content", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ctaRef.current,
          start: "top 85%",
        },
      });
    });

    return () => {
      ctx.revert();
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY]);

  return (
    <div>
      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated BG with image and parallax */}
        <motion.div style={{ y: heroY, x: bgMoveX }} className="absolute inset-[-40px] bg-[var(--color-navy)]">
          <motion.img
            style={{ y: bgMoveY }}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1.05 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2000&auto=format&fit=crop"
            alt="Hero Background"
            className="w-full h-full object-cover saturate-[1.2] brightness-110"
          />
          {/* Gradient Overlays for perfect text readability while keeping the center vivid */}
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-navy)]/90 via-[var(--color-navy)]/30 to-[var(--color-navy)] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-navy)]/60 via-transparent to-[var(--color-navy)]/60 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-mesh opacity-30 mix-blend-screen pointer-events-none" />
        </motion.div>

        <motion.div style={{ y: heroY, x: floatMoveX }} className="absolute inset-0 z-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div key={i}
              className="absolute rounded-full animate-float opacity-10"
              style={{
                width: `${200 + i * 100}px`, height: `${200 + i * 100}px`,
                background: `radial-gradient(circle, var(--color-teal) 0%, transparent 70%)`,
                top: `${20 + i * 20}%`, left: `${10 + i * 30}%`,
                animationDelay: `${i * 2}s`,
              }}
            />
          ))}
        </motion.div>

        <motion.div style={{ opacity: heroOpacity }} className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="gsap-fade inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[var(--color-teal)]/20 mb-8">
            <Zap className="w-4 h-4 text-[var(--color-teal)]" />
            <span className="text-sm font-medium text-[var(--color-teal)]">Powered by Antigravity Engine</span>
          </div>

          <h1 className="gsap-fade text-5xl md:text-7xl lg:text-8xl font-bold font-display tracking-tight leading-[1.1] mb-6">
            Travel Smarter
            <br />
            <TextFlip />
          </h1>

          <p className="gsap-fade text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            The world's first AI travel platform with 6-dimension route optimization,
            safety intelligence, and carbon-aware planning.
          </p>

          <div className="gsap-fade flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/planner"
              className="group px-8 py-4 btn-primary rounded-full font-semibold text-lg flex items-center gap-2"
            >
              <Compass className="w-5 h-5" />
              Start Planning
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/safety"
              className="px-8 py-4 rounded-full font-semibold text-lg border border-[var(--color-border)] hover:bg-white/5 transition-all flex items-center gap-2"
            >
              <Shield className="w-5 h-5" />
              Safety Check
            </Link>
          </div>

          {/* Stats */}
          <div className="gsap-fade mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto">
            {[
              { label: "AI Models", value: "3" },
              { label: "Score Dimensions", value: "6" },
              { label: "Systems", value: "10+" },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-3xl md:text-4xl font-bold font-display text-gradient">{s.value}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Sleek Scroll Line Indicator ─────────────────────────────────────────── */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <span className="text-[10px] uppercase tracking-[0.3em] font-medium text-[var(--color-text)] opacity-60">Scroll Explore</span>
          <div className="scroll-line-container">
            <div className="scroll-line-progress" />
          </div>
        </motion.div>
      </section>

      {/* ── Social Proof Banner ──────────────────────────────────────────────── */}
      <section className="relative z-10 w-full border-y border-[var(--color-border)] bg-[var(--color-ocean)]/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {[
            { icon: Users, label: "Active Travelers", value: "50K+" },
            { icon: Globe, label: "Countries Covered", value: "195" },
            { icon: Map, label: "Routes Optimized", value: "1.2M" },
            { icon: Star, label: "User Rating", value: "4.9/5" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-teal)]/10">
                  <Icon className="w-5 h-5 text-[var(--color-teal)]" />
                </div>
                <div>
                  <p className="text-xl font-bold font-display text-gradient">{stat.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Scrolling Destinations Ticker ─────────────────────────────────────── */}
      <section className="relative overflow-hidden py-8 border-b border-[var(--color-border)]">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...TICKER_CITIES, ...TICKER_CITIES].map((city, i) => (
            <span key={i} className="mx-8 text-lg font-display font-semibold text-[var(--color-text-secondary)]/40 hover:text-[var(--color-teal)] transition-colors cursor-default">
              {city}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────────────────────────────── */}
      <section ref={featuresRef} className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
            Everything You <span className="text-gradient">Need</span>
          </h2>
          <p className="text-[var(--color-text-secondary)] text-lg max-w-xl mx-auto">
            One platform for every aspect of your journey — powered by AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <Link key={i} to={feat.path} className="block h-full feature-card">
                <div className="glass-card h-full p-8 rounded-3xl group cursor-pointer">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
                    style={{
                      '--feat-color': feat.color,
                      backgroundColor: 'color-mix(in srgb, var(--feat-color) 15%, transparent)',
                    } as React.CSSProperties}
                  >
                    <Icon className="w-7 h-7" style={{ color: feat.color }} />
                  </div>
                  <h3 className="text-xl font-bold font-display mb-2">{feat.title}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{feat.desc}</p>
                  <div className="mt-5 flex items-center gap-2 text-sm font-medium" style={{ color: feat.color }}>
                    Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Destination Showcase ────────────────────────────────────────────── */}
      <section ref={showcaseRef} className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-display mb-4">Trending <span className="text-gradient">Destinations</span></h2>
          <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl mx-auto">Discover the most sought-after locations curated by our AI intelligence.</p>
        </div>

        <div 
          className="relative flex justify-center items-center h-[500px] overflow-visible perspective"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {DESTINATIONS.map((dest, i) => {
            return (
              <div key={i} className="absolute dest-card">
                <div
                  ref={(el: HTMLDivElement | null) => { carouselCardsRef.current[i] = el; }}
                  className="rounded-3xl shadow-2xl cursor-pointer group"
                  style={{
                    width: "300px",
                    height: "400px",
                    overflow: "hidden", 
                    WebkitMaskImage: "-webkit-radial-gradient(white, black)",
                    backfaceVisibility: "hidden",
                    opacity: 0,
                  }}
                >
                  <motion.div style={{ x: floatMoveX, y: floatMoveY }} className="absolute inset-[-30px] transform transition-transform duration-[1.5s] ease-out group-hover:scale-[1.15]">
                    <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" />
                  </motion.div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy)] via-[var(--color-navy)]/20 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

                  <div className="absolute bottom-0 left-0 right-0 p-6 z-20 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-2xl font-bold font-display text-white">{dest.name}</h3>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg glass text-sm font-medium text-[var(--color-success)]">
                        <Star className="w-4 h-4 fill-current" /> {dest.rating}
                      </div>
                    </div>
                    <p className="text-[var(--color-cyan-glow)] font-semibold mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">Est. {dest.price} / person</p>
                    <button className="w-full py-3 rounded-xl bg-white/10 hover:bg-[var(--color-teal)] text-white font-medium backdrop-blur-md border border-white/20 transition-all duration-300 opacity-0 group-hover:opacity-100 delay-200">
                      Explore Itinerary
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Antigravity Engine Section ──────────────────────────────────────── */}
      <section ref={engineRef} className="max-w-7xl mx-auto px-6 py-24">
        <div className="glass-card rounded-3xl p-8 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="engine-content">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-teal)]/10 border border-[var(--color-teal)]/30 mb-6">
                <Zap className="w-4 h-4 text-[var(--color-teal)]" />
                <span className="text-xs font-semibold text-[var(--color-teal)] uppercase tracking-wider">Core Technology</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
                Antigravity <span className="text-gradient">Engine</span>
              </h2>
              <p className="text-[var(--color-text-secondary)] mb-8 leading-relaxed">
                Our proprietary 6-dimension scoring algorithm evaluates every travel option across
                cost, time, comfort, experience, safety, and carbon impact — giving you a single
                intelligence score to make the best decision.
              </p>
              <Link to="/planner" className="inline-flex items-center gap-2 btn-primary px-6 py-3 rounded-full font-semibold">
                Try It Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Cost", score: 87, color: "var(--color-teal)" },
                { label: "Time", score: 72, color: "var(--color-grad-1)" },
                { label: "Comfort", score: 91, color: "var(--color-grad-2)" },
                { label: "Experience", score: 95, color: "var(--color-warning)" },
                { label: "Safety", score: 88, color: "var(--color-success)" },
                { label: "Carbon", score: 76, color: "var(--color-cyan-glow)" },
              ].map((d, i) => (
                <div key={i} className="engine-score glass p-4 rounded-2xl text-center">
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-[var(--color-border)]" strokeWidth="6" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke={d.color}
                        strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${d.score * 2.51} ${251 - d.score * 2.51}`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: d.color }}>
                      {d.score}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--color-text-secondary)]">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
            Loved by <span className="text-gradient">Travelers</span>
          </h2>
          <p className="text-[var(--color-text-secondary)] text-lg max-w-xl mx-auto">
            Join thousands who transformed their journeys with AeroVoyage.
          </p>
        </div>
        <div ref={testimonialsRef} className="grid grid-cols-1 md:grid-cols-3 gap-8" style={{ perspective: "1200px" }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="testimonial-card-wrapper">
              <div className="testimonial-card-float h-full">
                <div
                  className="testimonial-card h-full glass-card p-8 rounded-3xl relative transition-all duration-300 backdrop-blur-md origin-center hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(0,165,233,0.15)] group"
                >
                  <Quote className="w-8 h-8 text-[var(--color-teal)] opacity-30 mb-4 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110" />
                  <p className="text-[var(--color-text-secondary)] leading-relaxed mb-6 italic">
                    "{t.text}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-grad-1)] to-[var(--color-grad-2)] flex items-center justify-center text-white text-sm font-bold">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section ref={ctaRef} className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="cta-content">
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
            Ready to <span className="text-gradient">Fly Smart</span>?
          </h2>
          <p className="text-[var(--color-text-secondary)] text-lg mb-8 max-w-xl mx-auto">
            Join the future of AI-powered travel. Plan, optimize, and explore like never before.
          </p>
          <Link to="/planner"
            className="inline-flex items-center gap-2 px-10 py-5 btn-primary rounded-full font-semibold text-lg"
          >
            <Compass className="w-6 h-6" /> Launch Planner <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
