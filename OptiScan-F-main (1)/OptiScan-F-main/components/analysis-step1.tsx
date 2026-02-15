"use client"

import { Camera, Eye, Lightbulb, Ruler, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface AnalysisStep1Props {
  onRequestPermission: () => void
}

export function AnalysisStep1({ onRequestPermission }: AnalysisStep1Props) {
  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-6 md:p-8">
        <Card className="w-full max-w-2xl bg-gray-900/80 backdrop-blur-xl border-gray-800 shadow-2xl">
          <CardContent className="p-6 sm:p-8 md:p-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4 sm:mb-6 animate-pulse">
                <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                Preparación para el Análisis
              </h2>
              <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8">
                Para obtener los mejores resultados, sigue estas recomendaciones
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-10">
              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">
                    Posicionamiento del Rostro
                  </h3>
                  <p className="text-sm sm:text-base text-gray-300">
                    Ubica tu rostro dentro del marco cuadrado. Asegúrate de que tu cara esté completamente visible sin
                    pelo cubriendo tus ojos, cejas o frente. Mantén la cabeza quieta durante la captura.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Iluminación Adecuada</h3>
                  <p className="text-sm sm:text-base text-gray-300">
                    Busca un lugar con buena iluminación natural o artificial. Evita contraluz o sombras pronunciadas en
                    tu rostro. La luz debe iluminar uniformemente tu cara.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Cámara Calibrada</h3>
                  <p className="text-sm sm:text-base text-gray-300">
                    Recomendamos usar una cámara web o cámara de dispositivo calibrada para mejores resultados.
                    Asegúrate de que el lente esté limpio y enfocado correctamente.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Ruler className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">
                    Objeto de Referencia para Medición
                  </h3>
                  <p className="text-sm sm:text-base text-gray-300">
                    Coloca un objeto de tamaño conocido (como una tarjeta de crédito de 5.4 x 8.5 cm) en el cuadrado
                    amarillo de la esquina superior izquierda. Esto nos ayudará a calcular las medidas reales de tu
                    rostro.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Privacidad Garantizada</h3>
                  <p className="text-sm sm:text-base text-gray-300">
                    Todo el procesamiento se realiza de forma segura. No almacenamos, transmitimos ni compartimos tus
                    imágenes sin tu consentimiento.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={onRequestPermission}
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Camera className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              Activar Cámara y Comenzar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}