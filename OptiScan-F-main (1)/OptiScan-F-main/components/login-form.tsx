"use client"

import type React from "react"
import { useState } from "react"
import { Mail, Lock, Eye, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface LoginFormProps {
  onLogin: (email: string, password: string) => void
  onSwitchToRegister: () => void
}

export function LoginForm({ onLogin, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin(email, password)
  }

  const handleGoogleLogin = () => {
    // Simulación de inicio de sesión con Google
    // En una implementación real, usarías Firebase Auth o similar
    const googleEmail = "usuario.google@example.com"
    const googlePassword = "google_auth_token"
    alert("Iniciando sesión con Google...")
    onLogin(googleEmail, googlePassword)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-3/4 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-64 md:w-96 h-64 md:h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-md bg-gray-900/80 backdrop-blur-2xl border-white/10 shadow-2xl animate-fade-in-up">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg w-fit">
            <Eye className="w-12 h-12 text-white" />
          </div>
          <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Bienvenido a OptiScan
          </CardTitle>
          <CardDescription className="text-gray-300 text-base">
            Ingresa tus credenciales para acceder al análisis facial
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500 h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg shadow-lg hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-[1.02]"
            >
              Iniciar Sesión
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </form>

          {/* Divisor */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700"></span>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900/80 text-gray-400">O continúa con</span>
            </div>
          </div>

          {/* Botón de Google con imagen base64 */}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-12 border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
          >
            <img 
              src="/google.png" 
              alt="Google Logo" 
              className="w-5 h-5 mr-2"
            />
            Continuar con Google
          </Button>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              ¿No tienes una cuenta?{" "}
              <button
                onClick={onSwitchToRegister}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Regístrate aquí
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}