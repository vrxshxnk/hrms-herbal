import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import DashboardLayout from "./components/DashboardLayout";
import CursorPandaFollower from "./components/Panda"; 

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "HRMS Workspace - Herbal Creations",
  description: "Human Resource Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans antialiased bg-[#f2f5f3] text-[#1E293B]">
        <CursorPandaFollower />
        <AuthProvider>
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </AuthProvider>
      </body>
    </html>
  );
}