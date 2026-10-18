import { LayoutDashboard, Users, CalendarCheck, CalendarDays, Wallet, Receipt, Network, SlidersHorizontal, Megaphone, UserMinus, HelpCircle, MessageCircle, type LucideIcon } from "lucide-react";
type NavigationItem = { label: string; href: string; icon: LucideIcon; hrOnly?: boolean; keywords?: string };
export const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  { label: "Workspace", items: [
    { label: "Overview", href: "/", icon: LayoutDashboard, keywords: "dashboard home" },
    { label: "Announcements", href: "/announcements", icon: Megaphone },
    { label: "Chat", href: "/chat", icon: MessageCircle, keywords: "messages conversations" },
  ] },
  { label: "People", items: [
    { label: "People directory", href: "/employee", icon: Users, keywords: "employees staff documents" },
    { label: "Organization", href: "/org-charts", icon: Network, keywords: "chart reporting manager" },
    { label: "Exit & offboarding", href: "/resignation", icon: UserMinus, keywords: "resignation" },
  ] },
  { label: "Time & attendance", items: [
    { label: "Attendance", href: "/attendance", icon: CalendarCheck, keywords: "import provider register manual pay code" },
    { label: "Time off", href: "/leave", icon: CalendarDays, keywords: "leave apply requests approvals" },
    { label: "Leave allocation", href: "/leave/add", icon: SlidersHorizontal, hrOnly: true },
  ] },
  { label: "Finance", items: [
    { label: "Salary advances", href: "/salary", icon: Wallet, keywords: "loans payroll" },
    { label: "Reimbursements", href: "/reimbursements", icon: Receipt, keywords: "expenses claims" },
  ] },
];
export const searchablePages: NavigationItem[] = [...navigationGroups.flatMap(group => group.items), { label: "Help center", href: "/faq", icon: HelpCircle, keywords: "faq support" }];
