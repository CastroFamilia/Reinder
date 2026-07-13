"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DevRoleSwitcherProps {
  initialRole: string | null;
  isDev: boolean;
}

export function DevRoleSwitcher({ initialRole, isDev }: DevRoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  // Only show if we are in development OR if the user is already an admin
  if (!isDev && initialRole !== "platform_admin") {
    return null;
  }

  const currentRole = initialRole ?? "guest";

  const getTargetUrl = (role: string) => {
    switch(role) {
      case "agent": return "/agent";
      case "agency_admin": return "/agency/listings";
      case "platform_admin": return "/swipe"; // Admin panel not built yet, fallback to swipe
      default: return "/swipe";
    }
  };

  const handleSwitch = async (role: string) => {
    if (role === currentRole) return;
    setIsUpdating(true);
    
    try {
      const res = await fetch("/api/v1/dev/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      
      if (res.ok) {
        // Redirect to the role's dashboard directly
        window.location.href = getTargetUrl(role);
      } else {
        console.error("Failed to switch role");
        setIsUpdating(false);
      }
    } catch (err) {
      console.error("Error switching role:", err);
      setIsUpdating(false);
    }
  };

  const roles = [
    { id: "buyer", label: "Comprador" },
    { id: "agent", label: "Agente" },
    { id: "platform_admin", label: "Admin" },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <div 
        className={`flex flex-col items-end gap-2 transition-all duration-300 ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        <div className="bg-[#1A1A1A]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col min-w-[140px]">
          <div className="px-3 py-2 border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-white/50 font-semibold">
            Dev Role Switcher
          </div>
          {roles.map((r) => (
            <button
              key={r.id}
              disabled={isUpdating}
              onClick={() => handleSwitch(r.id)}
              className={`px-4 py-2.5 text-xs text-left transition-colors ${
                currentRole === r.id
                  ? "bg-[#FF6B00]/20 text-[#FF6B00] font-medium"
                  : "text-white/70 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${currentRole === r.id ? "bg-[#FF6B00]" : "bg-transparent"}`} />
                {r.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mt-3 ml-auto flex items-center gap-2 px-3 py-2 rounded-full bg-[#1A1A1A]/80 backdrop-blur-md border border-white/10 shadow-lg hover:bg-[#2A2A2A]/80 transition-colors"
      >
        <span className="text-sm">🛠️</span>
        <span className="text-xs font-medium text-white/80">
          {roles.find(r => r.id === currentRole)?.label ?? "Guest"}
        </span>
      </button>
    </div>
  );
}
