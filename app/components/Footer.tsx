import React from "react";
import Link from "next/link";
import {
  Heart,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Activity,
  Globe,
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full bg-white/90 backdrop-blur-md border-t border-slate-200/80 py-4 px-6 mt-auto transition-all relative z-10 overflow-hidden">
      {/* Top Multi-Color Vibrant Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#316AFF] to-emerald-400/80" />

      {/* Subtle Background Glow effect */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-96 h-20 bg-[#316AFF]/5 blur-2xl rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        
        {/* Left Section: Company Brand & Tagline */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
          {/* Brand Name Badge */}
          <div className="flex items-center gap-2 group cursor-pointer">
            <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent group-hover:text-[#316AFF] transition-colors">
              Herbal Creations
            </span>
          </div>

          <span className="hidden sm:inline-block text-slate-300 font-light">|</span>

          {/* Tagline with Heartbeat Animation */}
          <p className="flex items-center gap-1.5 text-slate-500 font-medium">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse shrink-0" />
            <span className="text-green-500">&amp; Nurtured by Nature</span>
          </p>

          <span className="hidden md:inline-block text-slate-300 font-light">|</span>

        </div>

        {/* Right Section: Interactive Quick Actions & Links */}
        <div className="flex flex-wrap items-center justify-center gap-5 md:gap-6 text-slate-500">

          {/* Navigation Links */}
          <nav aria-label="Footer Navigation">
            <ul className="flex items-center gap-5 font-semibold text-slate-600">
              <li>
                <Link
                  href="/"
                  className="hover:text-[#316AFF] transition-all flex items-center gap-1 group py-1"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#316AFF] transition-colors" />
                  <span>Portal Home</span>
                </Link>
              </li>

              <li>
                <Link
                  href="/faq"
                  className="hover:text-[#316AFF] transition-all flex items-center gap-1 group py-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>FAQ&apos;s</span>
                </Link>
              </li>

              <li>
                <a
                  href="#"
                  className="hover:text-[#316AFF] transition-all flex items-center gap-1 group py-1"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#316AFF] transition-colors" />
                  <span>Support</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-0.5 transition-opacity" />
                </a>
              </li>
            </ul>
          </nav>

          {/* Copyright Year Notice */}
          <span className="text-[11px] font-medium text-slate-400 border-l border-slate-200 pl-4 hidden sm:inline-block">
            &copy; {new Date().getFullYear()} All rights reserved.
          </span>
        </div>

      </div>
    </footer>
  );
};

export default Footer;