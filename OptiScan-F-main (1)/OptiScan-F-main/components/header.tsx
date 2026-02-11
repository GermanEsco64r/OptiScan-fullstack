"use client"

import { Eye, LogOut, User, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  isLoggedIn: boolean
  userName?: string
  onLogoClick: () => void
  onLogout: () => void
  onDashboard: () => void
  onPricing: () => void
}

export function Header({ isLoggedIn, userName, onLogoClick, onLogout, onDashboard, onPricing }: HeaderProps) {
  return (
    <div className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-gradient-to-r from-slate-900/80 via-blue-900/60 to-indigo-900/80 shadow-2xl shadow-blue-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
        <div className="flex justify-between items-center">
          <button
            onClick={onLogoClick}
            className="flex items-center space-x-2 md:space-x-3 group transition-all duration-300 hover:scale-105"
          >
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-blue-500/50 transition-all duration-300">
              <Eye className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              OptiScan
            </span>
          </button>

          {isLoggedIn && (
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                onClick={onDashboard}
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 hidden sm:flex"
              >
                <User className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Dashboard</span>
              </Button>
              <Button
                onClick={onPricing}
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 hidden sm:flex"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Planes</span>
              </Button>
              <Button
                onClick={onLogout}
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
              >
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Salir</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
