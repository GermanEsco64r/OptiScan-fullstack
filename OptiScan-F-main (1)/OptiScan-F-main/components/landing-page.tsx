"use client"

import { Camera, Eye, Sparkles, Target, TrendingUp, ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface LandingPageProps {
  onStartAnalysis: () => void
}

export function LandingPage({ onStartAnalysis }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-3/4 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-64 md:w-96 h-64 md:h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-[90vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="max-w-6xl mx-auto text-center space-y-6 md:space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center px-4 py-2 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-500/30 mb-4 md:mb-6">
              <Sparkles className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-blue-300 text-xs md:text-sm font-medium">Tecnología de Análisis Facial IA</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Encuentra los{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
                Marcos Perfectos
              </span>
              <br />
              para tu Rostro
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed px-4">
              OptiScan usa inteligencia artificial avanzada para analizar tu rostro y recomendarte los marcos de lentes
              ideales que complementan tu estilo único
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 md:pt-8 px-4">
              <Button
                onClick={onStartAnalysis}
                size="lg"
                className="w-full sm:w-auto h-14 md:h-16 px-8 md:px-12 text-base md:text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105 rounded-xl"
              >
                <Camera className="mr-3 w-5 h-5 md:w-6 md:h-6" />
                Comenzar Análisis
                <ArrowRight className="ml-3 w-5 h-5 md:w-6 md:h-6" />
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 md:gap-12 pt-8 md:pt-12 text-center">
              <div className="animate-float">
                <div className="text-3xl md:text-4xl font-bold text-white">98%</div>
                <div className="text-xs md:text-sm text-gray-400">Precisión IA</div>
              </div>
              <div className="animate-float animation-delay-1000">
                <div className="text-3xl md:text-4xl font-bold text-white">50K+</div>
                <div className="text-xs md:text-sm text-gray-400">Análisis Realizados</div>
              </div>
              <div className="animate-float animation-delay-2000">
                <div className="text-3xl md:text-4xl font-bold text-white">4.9★</div>
                <div className="text-xs md:text-sm text-gray-400">Valoración</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">¿Cómo Funciona OptiScan?</h2>
              <p className="text-base md:text-xl text-gray-300 max-w-2xl mx-auto">
                Nuestro sistema de IA analiza múltiples características faciales para ofrecerte recomendaciones
                personalizadas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <Card className="bg-gray-800/40 backdrop-blur-lg border-gray-700/50 hover:bg-gray-800/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
                <CardContent className="p-6 md:p-8 text-center">
                  <div className="mx-auto w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 md:mb-6 animate-pulse">
                    <Eye className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Análisis Facial</h3>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                    Analizamos forma del rostro, ojos, cejas y tono de piel con precisión milimétrica
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/40 backdrop-blur-lg border-gray-700/50 hover:bg-gray-800/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
                <CardContent className="p-6 md:p-8 text-center">
                  <div className="mx-auto w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-4 md:mb-6 animate-pulse animation-delay-1000">
                    <Zap className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">IA Inteligente</h3>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                    Nuestro algoritmo procesa millones de datos para encontrar el match perfecto
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/40 backdrop-blur-lg border-gray-700/50 hover:bg-gray-800/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/20">
                <CardContent className="p-6 md:p-8 text-center">
                  <div className="mx-auto w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-pink-500 to-red-600 rounded-2xl flex items-center justify-center mb-4 md:mb-6 animate-pulse animation-delay-2000">
                    <Target className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Recomendaciones</h3>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                    Recibe sugerencias personalizadas de marcos que realzan tu mejor versión
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-black/20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Solo 3 Pasos</h2>
              <p className="text-base md:text-xl text-gray-300">Simple, rápido y preciso</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  step: "01",
                  title: "Autoriza tu Cámara",
                  description: "Permite el acceso para comenzar el análisis facial seguro",
                  icon: Camera,
                },
                {
                  step: "02",
                  title: "Captura tu Rostro",
                  description: "Posiciona tu cara y deja que la IA haga su magia",
                  icon: Eye,
                },
                {
                  step: "03",
                  title: "Recibe Recomendaciones",
                  description: "Obtén sugerencias personalizadas en segundos",
                  icon: TrendingUp,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="relative p-6 md:p-8 bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-lg rounded-2xl border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-105"
                >
                  <div className="absolute -top-4 -left-4 w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-xl md:text-2xl font-bold text-white shadow-lg">
                    {item.step}
                  </div>
                  <item.icon className="w-10 h-10 md:w-12 md:h-12 text-blue-400 mb-4 md:mb-6 mt-4" />
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">{item.title}</h3>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8 leading-tight">
              ¿Listo para Descubrir tu{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Look Perfecto
              </span>
              ?
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mb-8 md:mb-12">
              Únete a miles de personas que ya encontraron sus marcos ideales
            </p>
            <Button
              onClick={onStartAnalysis}
              size="lg"
              className="w-full sm:w-auto h-14 md:h-16 px-8 md:px-12 text-base md:text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105 rounded-xl"
            >
              <Camera className="mr-3 w-5 h-5 md:w-6 md:h-6" />
              Iniciar Análisis Gratis
              <ArrowRight className="ml-3 w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
