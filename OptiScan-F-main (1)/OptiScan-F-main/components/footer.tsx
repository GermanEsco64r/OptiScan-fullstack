"use client"

import { Eye } from "lucide-react"

interface FooterProps {
  onNavigate?: (section: string) => void
}

export function Footer({ onNavigate }: FooterProps) {
  const handleNavigation = (section: string) => {
    if (onNavigate) {
      onNavigate(section)
    }
  }

  return (
    <footer className="relative bg-gradient-to-b from-black/80 to-black border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Logo y descripción */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-lg opacity-50" />
                <Eye className="h-8 w-8 text-blue-400 relative" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                OptiScan
              </span>
            </div>
            <p className="text-gray-400 text-sm max-w-xs">
              Análisis facial avanzado para encontrar los marcos perfectos que complementen tu estilo único.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNavigation("inicio")}
                  className="text-gray-400 hover:text-blue-400 transition-colors duration-200 text-sm cursor-pointer"
                >
                  Inicio
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation("analisis")}
                  className="text-gray-400 hover:text-blue-400 transition-colors duration-200 text-sm cursor-pointer"
                >
                  Análisis
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation("planes")}
                  className="text-gray-400 hover:text-blue-400 transition-colors duration-200 text-sm cursor-pointer"
                >
                  Planes
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation("soporte")}
                  className="text-gray-400 hover:text-blue-400 transition-colors duration-200 text-sm cursor-pointer"
                >
                  Soporte
                </button>
              </li>
            </ul>
          </div>

          {/* Contacto y desarrolladores */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Contacto</h3>
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">info@optiscan.com</p>
              <p className="text-gray-400 text-sm">+1 (555) 123-4567</p>

              <div className="pt-4">
                <a
                  href="https://soygabrielrojas.github.io/ColdBlock"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg transition-all duration-300 transform hover:scale-105 text-sm font-medium shadow-lg shadow-blue-500/20"
                >
                  <span>Desarrollado por</span>
                  <span className="font-bold">ColdBlock</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm text-center sm:text-left">
              © {new Date().getFullYear()} OptiScan. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-500 hover:text-blue-400 transition-colors duration-200">
                Privacidad
              </a>
              <a href="#" className="text-gray-500 hover:text-blue-400 transition-colors duration-200">
                Términos
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Efectos de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>
    </footer>
  )
}
