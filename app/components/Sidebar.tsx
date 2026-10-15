"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, X, ArrowUpRight, HelpCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { navigationGroups } from "./navigation";

export default function Sidebar({ isSidebarOpen, toggleSidebar }: { isSidebarOpen: boolean; toggleSidebar: () => void }) {
  const pathname = usePathname();
  const { hasRole } = useAuth();
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isSidebarOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    asideRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") toggleSidebar();
      if (event.key !== "Tab") return;
      const items = asideRef.current?.querySelectorAll<HTMLElement>("a, button");
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [isSidebarOpen, toggleSidebar]);
  return <>
    {isSidebarOpen && <button className="sidebar-backdrop" onClick={toggleSidebar} aria-label="Close navigation" tabIndex={-1} />}
    <aside ref={asideRef} id="workspace-navigation" className={`workspace-sidebar ${isSidebarOpen ? "is-open" : ""}`} aria-label="Main navigation">
      <div className="workspace-brand">
        <Link href="/" onClick={() => isSidebarOpen && toggleSidebar()} className="flex items-center gap-3"><span className="brand-mark"><Leaf size={22} strokeWidth={1.6} /></span><span><strong>Herbal</strong><small>PEOPLE & CULTURE</small></span></Link>
        <button className="icon-button lg:hidden" onClick={toggleSidebar} aria-label="Close navigation"><X size={20} /></button>
      </div>
      <div className="sidebar-workspace"><span className="workspace-dot" /> Your workspace <span className="ml-auto text-[10px]">HRMS</span></div>
      <nav className="sidebar-links">{navigationGroups.map(group => <div key={group.label} className="nav-group">
        <p className="nav-group-label">{group.label}</p>
        {group.items.filter(item => !item.hrOnly || ["hr", "hr_admin", "system_admin", "admin", "hradmin"].some(hasRole)).map(item => {
          const active = item.href === "/" ? pathname === "/" || pathname === "/dashboard" : pathname === item.href || (item.href !== "/leave" && pathname.startsWith(item.href + "/"));
          return <Link key={item.href} href={item.href} onClick={() => isSidebarOpen && toggleSidebar()} aria-current={active ? "page" : undefined} className={`nav-link ${active ? "is-active" : ""}`}><item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span>{active && <span className="nav-active-dot" />}</Link>;
        })}
      </div>)}</nav>
      <div className="sidebar-support"><HelpCircle size={21} strokeWidth={1.5} /><p>A little guidance?<span>Find answers in the help center.</span></p><Link href="/faq" onClick={() => isSidebarOpen && toggleSidebar()}>Explore help <ArrowUpRight size={15} /></Link></div>
      <div className="sidebar-bottom">Built around your people.</div>
    </aside>
  </>;
}
