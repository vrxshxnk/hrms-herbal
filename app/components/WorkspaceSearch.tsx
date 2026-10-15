"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { searchablePages } from "./navigation";

export default function WorkspaceSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const { hasRole } = useAuth();
  useEffect(() => {
    const onPointer = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") { event.preventDefault(); input.current?.focus(); setOpen(true); }
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, []);
  const results = searchablePages.filter(page => (!page.hrOnly || ["hr", "hr_admin", "system_admin", "admin", "hradmin"].some(hasRole)) && `${page.label} ${page.keywords || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div ref={container} className="workspace-search">
    <Search size={17} /><input ref={input} aria-label="Find a page" aria-controls="page-search-results" placeholder="Find a page…" value={query} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} />
    {query ? <button aria-label="Clear search" onClick={() => { setQuery(""); input.current?.focus(); }}><X size={15} /></button> : <kbd>Ctrl K</kbd>}
    {open && <div className="search-results" id="page-search-results"><p className="eyebrow">{query ? "Matching pages" : "Jump to a page"}</p>{results.length ? results.map(page => <Link key={page.href} href={page.href} onClick={() => { setOpen(false); setQuery(""); }}><page.icon size={17} /><span>{page.label}</span><ArrowUpRight size={14} /></Link>) : <p className="p-3 text-sm text-slate-500">No pages found. Try “attendance” or “leave”.</p>}</div>}
  </div>;
}
