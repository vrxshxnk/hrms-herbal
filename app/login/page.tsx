"use client";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Leaf, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  return <div className="login-page">
    <section className="login-story">
      <div className="flex items-center gap-3"><span className="brand-mark"><Leaf size={23} /></span><strong className="text-xl tracking-tight">Herbal Creations</strong></div>
      <div className="login-story-copy"><h1>Good work<br />starts with<br /><em>your people.</em></h1></div>
      <div className="login-art" aria-hidden="true"><span /><span /><span /></div>
    </section>
    <section className="login-form"><div className="w-full max-w-sm"><p className="eyebrow">YOUR WORKSPACE, CONNECTED</p><h2>Welcome back.</h2><button onClick={login} className="button-primary w-full justify-between">Sign in to your workspace <ArrowRight size={18} /></button><div className="login-security"><ShieldCheck size={18} /><span>Secure company sign-in<br /><small>You’ll continue to your organization’s sign-in page.</small></span></div><p className="mt-14 text-xs leading-relaxed text-slate-500">Need access? Contact your HR team or system administrator.</p></div><span className="login-copyright">Herbal Creations</span></section>
  </div>;
}
