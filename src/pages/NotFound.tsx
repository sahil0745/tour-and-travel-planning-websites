import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-8xl mb-6">🌍</div>
        <h1 className="text-5xl md:text-7xl font-bold font-display mb-4">
          4<span className="text-gradient">0</span>4
        </h1>
        <p className="text-xl text-[var(--color-text-secondary)] mb-2">
          This destination doesn't exist on our map!
        </p>
        <p className="text-sm text-[var(--color-text-secondary)] mb-8">
          Looks like you've wandered off the beaten path. Let's get you back on track.
        </p>
        <div className="flex items-center gap-4 justify-center">
          <Link to="/"
            className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <button onClick={() => window.history.back()}
            className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 border border-[var(--color-border)] hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
