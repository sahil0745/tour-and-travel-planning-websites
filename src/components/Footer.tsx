import { Link } from "react-router-dom";
import { Compass, Github, Twitter, Linkedin, Instagram, Facebook, Mail, MapPin, Heart, MessageCircle } from "lucide-react";
import { GlassDock, type DockItem } from "./ui/glass-dock";

const dockItems: DockItem[] = [
  { title: "GitHub", icon: Github, href: "https://github.com" },
  { title: "X", icon: Twitter, href: "https://twitter.com" },
  { title: "LinkedIn", icon: Linkedin, href: "https://linkedin.com" },
  { title: "Instagram", icon: Instagram, href: "https://instagram.com" },
  { title: "Facebook", icon: Facebook, href: "https://facebook.com" },
  { title: "Email", icon: Mail, href: "mailto:support@aerovoyage.ai" },
  { title: "Discord", icon: MessageCircle, href: "https://discord.gg" },
];

export default function Footer() {
  return (
    <footer className="relative z-10 mt-20 border-t border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold font-display mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-grad-1)] to-[var(--color-teal)] flex items-center justify-center text-white">
                <Compass className="w-4 h-4" />
              </div>
              Aero<span className="text-gradient">Voyage</span>
            </Link>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              AI-powered travel planning with smart itineraries, budget optimization, and real-time safety insights.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-semibold text-sm mb-3 font-display">Explore</h4>
            <ul className="space-y-2 text-xs text-[var(--color-text-secondary)]">
              {[
                { to: "/planner", label: "Trip Planner" },
                { to: "/hotels", label: "Hotel Intelligence" },
                { to: "/food", label: "Food Explorer" },
                { to: "/activities", label: "Activities" },
              ].map(l => (
                <li key={l.to}><Link to={l.to} className="hover:text-[var(--color-teal)] transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h4 className="font-semibold text-sm mb-3 font-display">Tools</h4>
            <ul className="space-y-2 text-xs text-[var(--color-text-secondary)]">
              {[
                { to: "/safety", label: "Safety Checker" },
                { to: "/dashboard", label: "Dashboard" },
                { to: "/editor", label: "Image Editor" },
                { to: "/profile", label: "Profile" },
              ].map(l => (
                <li key={l.to}><Link to={l.to} className="hover:text-[var(--color-teal)] transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-3 font-display">Connect</h4>
            <ul className="space-y-2 text-xs text-[var(--color-text-secondary)]">
              <li className="flex items-center gap-2"><Mail className="w-3 h-3" /> support@aerovoyage.ai</li>
              <li className="flex items-center gap-2"><MapPin className="w-3 h-3" /> Made in India 🇮🇳</li>
            </ul>
          </div>
        </div>

        {/* GlassDock Social Icons */}
        <div className="flex items-center justify-center py-6 mb-6 border-t border-[var(--color-border)]">
          <GlassDock items={dockItems} />
        </div>

        <div className="border-t border-[var(--color-border)] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            © {new Date().getFullYear()} AeroVoyage. All rights reserved.
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-[var(--color-error)] fill-current" /> and AI
          </p>
        </div>
      </div>
    </footer>
  );
}
