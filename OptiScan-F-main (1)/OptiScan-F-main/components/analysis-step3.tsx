"use client"

import { useState, useEffect, useMemo } from "react"
import { CheckCircle, RotateCcw, Ruler, Palette, Download, ExternalLink, Eye, ShoppingBag, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Tipos actualizados
interface Frame {
  id: string
  name: string
  style: string
  description: string
  price: string
  imageUrl: string
  purchaseLink: string
  isActive: boolean
  measurements: {
    width: string
    height: string
    bridge: string
    temple: string
  }
}

interface FaceAnalysis {
  faceShape: string
  skinTone: string
  measurements: {
    faceWidth: string
    faceHeight: string
    eyeDistance: string
    eyeHeight: string
  }
}

interface AnalysisStep3Props {
  faceAnalysis: FaceAnalysis
  onNewAnalysis: () => void
  onGoToDashboard?: () => void
  userFrames?: Frame[] // Marcos del usuario
  capturedImage?: string // Imagen capturada (base64) para el PDF
}

export function AnalysisStep3({ 
  faceAnalysis, 
  onNewAnalysis, 
  onGoToDashboard, 
  userFrames = [],
  capturedImage 
}: AnalysisStep3Props) {
  const [recommendedFrames, setRecommendedFrames] = useState<Frame[]>([])
  // Estados para la generación del PDF
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [pdfDownloadProgress, setPdfDownloadProgress] = useState(0)
  const [showDownloadProgress, setShowDownloadProgress] = useState(false)

  // Usamos useMemo para memoizar los frames por defecto
  const defaultFrames = useMemo(() => [
    {
      id: "default-1",
      name: "Marco Clásico Recomendado",
      style: "Rectangular",
      description: `Perfecto para rostros ${faceAnalysis.faceShape.toLowerCase()}, este marco equilibra tus proporciones faciales`,
      price: "$129.99",
      imageUrl: "/placeholder-frame1.jpg",
      purchaseLink: "https://tienda-optica.com/marco-clasico",
      isActive: true,
      measurements: {
        width: "140mm",
        height: "50mm",
        bridge: "18mm",
        temple: "145mm"
      }
    },
    {
      id: "default-2",
      name: "Marco Moderno Ideal",
      style: "Redondo",
      description: `Diseño contemporáneo que complementa rostros ${faceAnalysis.faceShape.toLowerCase()}`,
      price: "$159.99",
      imageUrl: "/placeholder-frame2.jpg",
      purchaseLink: "https://tienda-optica.com/marco-moderno",
      isActive: true,
      measurements: {
        width: "135mm",
        height: "45mm",
        bridge: "16mm",
        temple: "140mm"
      }
    },
    {
      id: "default-3",
      name: "Opción Premium",
      style: "Aviador",
      description: `Marco de alta gama diseñado específicamente para ${faceAnalysis.faceShape.toLowerCase()}`,
      price: "$199.99",
      imageUrl: "/placeholder-frame3.jpg",
      purchaseLink: "https://tienda-optica.com/marco-premium",
      isActive: true,
      measurements: {
        width: "142mm",
        height: "48mm",
        bridge: "19mm",
        temple: "148mm"
      }
    }
  ], [faceAnalysis.faceShape]) // Solo se recrea cuando cambia faceShape

  // Filtramos solo los marcos activos para mostrar
  useEffect(() => {
    const activeFrames = userFrames.filter(frame => frame.isActive)

    // Si hay marcos activos del usuario, los usamos
    // Si no, mostramos marcos por defecto basados en el análisis
    if (activeFrames.length > 0) {
      setRecommendedFrames(activeFrames)
    } else {
      setRecommendedFrames(defaultFrames)
    }
  }, [userFrames, defaultFrames]) // Agregamos defaultFrames a las dependencias

  const measurements = [
    {
      label: "Ancho de Rostro",
      value: faceAnalysis?.measurements?.faceWidth || "No disponible",
      icon: Ruler
    },
    {
      label: "Alto de Rostro",
      value: faceAnalysis?.measurements?.faceHeight || "No disponible",
      icon: Ruler
    },
    {
      label: "Distancia entre Ojos",
      value: faceAnalysis?.measurements?.eyeDistance || "No disponible",
      icon: Eye
    },
    {
      label: "Alto de Ojos",
      value: faceAnalysis?.measurements?.eyeHeight || "No disponible",
      icon: Eye
    },
  ]

  const recommendedColors = [
    { name: "Negro Clásico", hex: "#000000", description: "Elegante y versátil" },
    { name: "Gris Plata", hex: "#C0C0C0", description: "Refinado y contemporáneo" },
  ]

  // Calcular compatibilidad basada en medidas (ejemplo simple)
  const calculateCompatibility = (frame: Frame) => {
    const frameWidth = parseInt(frame.measurements.width.replace('mm', '')) || 140
    const faceWidth = parseFloat(faceAnalysis?.measurements?.faceWidth?.replace(' cm', '') || "18.5") * 10 // Convertir cm a mm

    // Ejemplo simple: más cercano al ancho del rostro, mayor compatibilidad
    const diff = Math.abs(frameWidth - faceWidth)
    let compatibility = 100 - (diff * 2)

    // Asegurar que esté entre 70% y 95%
    compatibility = Math.max(70, Math.min(95, compatibility))

    return Math.round(compatibility)
  }

  // Función para generar y descargar el PDF (integrada desde OptiScan.tsx)
  const generatePDFReport = async () => {
    try {
      console.log("📄 [FRONTEND] Iniciando generación de PDF...");
      
      if (!capturedImage) {
        alert("❌ No hay imagen capturada para generar el PDF");
        return;
      }

      // Iniciar estados de progreso
      setIsGeneratingPDF(true);
      setShowDownloadProgress(true);
      setPdfDownloadProgress(0);

      // Simular progreso inicial
      const progressInterval = setInterval(() => {
        setPdfDownloadProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 5;
        });
      }, 200);

      console.log("🌐 [FRONTEND] Enviando solicitud a: http://localhost:5001/generate-pdf-report");
      
      // Enviar la imagen y los datos del análisis al backend
      const response = await fetch('http://localhost:5001/generate-pdf-report', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/pdf'
        },
        body: JSON.stringify({ 
          image: capturedImage,
          faceAnalysis: faceAnalysis,
          recommendedFrames: recommendedFrames
        })
      });
      
      clearInterval(progressInterval);
      setPdfDownloadProgress(95);

      if (response.ok) {
        const blob = await response.blob();
        
        if (blob.size === 0) {
          alert("❌ El PDF recibido está vacío");
          setIsGeneratingPDF(false);
          setPdfDownloadProgress(0);
          return;
        }
        
        // Progreso completado
        setPdfDownloadProgress(100);
        
        // Pequeño delay para mostrar el 100%
        setTimeout(() => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'analisis_facial_optiscan.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          console.log("✅ [FRONTEND] PDF descargado exitosamente");
          
          // Resetear estados después de un breve momento
          setTimeout(() => {
            setIsGeneratingPDF(false);
            setShowDownloadProgress(false);
            setPdfDownloadProgress(0);
          }, 1000);
          
        }, 500);
        
      } else {
        // Manejo de errores...
        setIsGeneratingPDF(false);
        setShowDownloadProgress(false);
        setPdfDownloadProgress(0);
      }
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      alert("Error de conexión con el servidor al generar PDF");
      setIsGeneratingPDF(false);
      setShowDownloadProgress(false);
      setPdfDownloadProgress(0);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 p-4 sm:p-6 md:p-8 lg:p-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 sm:mb-8 md:mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4 sm:mb-6 animate-bounce">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
              ¡Análisis Completo!
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300">
              {userFrames.length > 0
                ? "Hemos encontrado los marcos perfectos de tu catálogo personal"
                : "Hemos encontrado los marcos perfectos para ti"
              }
            </p>
          </div>

          {/* Medidas Faciales */}
          <Card className="mb-6 sm:mb-8 bg-gray-900/80 backdrop-blur-xl border-gray-800">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                <Ruler className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                Medidas Faciales Detectadas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {measurements.map((measurement, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 p-4 sm:p-5 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <measurement.icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                      <p className="text-xs sm:text-sm text-gray-400">{measurement.label}</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-white">{measurement.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Análisis de Estructura */}
          <Card className="mb-6 sm:mb-8 bg-gray-900/80 backdrop-blur-xl border-gray-800">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                Análisis de Estructura Facial
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 p-4 sm:p-5 rounded-lg border border-blue-500/30">
                  <p className="text-xs sm:text-sm text-gray-400 mb-1 sm:mb-2">Forma del Rostro</p>
                  <p className="text-lg sm:text-xl font-bold text-white">{faceAnalysis.faceShape}</p>
                  <p className="text-xs sm:text-sm text-gray-300 mt-2">
                    Recomendamos marcos que equilibren tus proporciones y suavicen los ángulos.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 p-4 sm:p-5 rounded-lg border border-purple-500/30">
                  <p className="text-xs sm:text-sm text-gray-400 mb-1 sm:mb-2">Tono de Piel</p>
                  <p className="text-lg sm:text-xl font-bold text-white">{faceAnalysis.skinTone}</p>
                  <p className="text-xs sm:text-sm text-gray-300 mt-2">
                    Colores que realzan tu tono natural y complementan tu estilo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colores Recomendados */}
          <Card className="mb-6 sm:mb-8 bg-gray-900/80 backdrop-blur-xl border-gray-800">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
                Colores de Marco Recomendados
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                {recommendedColors.map((color, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 p-4 sm:p-5 rounded-lg border border-gray-700 hover:border-pink-500/50 transition-all cursor-pointer group"
                  >
                    <div
                      className="w-full h-16 sm:h-20 rounded-lg mb-3 sm:mb-4 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: color.hex }}
                    ></div>
                    <p className="text-sm sm:text-base font-bold text-white mb-1">{color.name}</p>
                    <p className="text-xs sm:text-sm text-gray-400">{color.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Marcos Recomendados */}
          <Card className="mb-6 sm:mb-8 bg-gray-900/80 backdrop-blur-xl border-gray-800">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-white">Marcos Recomendados</h3>
                {userFrames.length > 0 && (
                  <Badge variant="outline" className="mt-2 sm:mt-0 border-blue-500 text-blue-400">
                    Personalizados de tu catálogo
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                {recommendedFrames.map((frame) => {
                  const compatibility = calculateCompatibility(frame)

                  return (
                    <div
                      key={frame.id}
                      className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500/50 transition-all hover:scale-105 group"
                    >
                      <div className="relative aspect-video bg-gray-900">
                        <img
                          src={frame.imageUrl || `/placeholder.svg?height=300&width=400&text=${frame.name}`}
                          alt={frame.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <Badge className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-green-500/90 text-white text-xs sm:text-sm">
                          {compatibility}% Compatible
                        </Badge>
                      </div>
                      <div className="p-4 sm:p-5 md:p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg sm:text-xl font-bold text-white">{frame.name}</h4>
                          <span className="font-bold text-green-400 text-sm sm:text-base">{frame.price}</span>
                        </div>

                        <p className="text-xs sm:text-sm text-blue-400 mb-2 sm:mb-3">{frame.style}</p>
                        <p className="text-xs sm:text-sm text-gray-300 mb-4 line-clamp-2">{frame.description}</p>

                        {/* Medidas del marco */}
                        <div className="grid grid-cols-4 gap-1 mb-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Ancho</p>
                            <p className="text-white text-xs font-semibold">{frame.measurements.width}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Alto</p>
                            <p className="text-white text-xs font-semibold">{frame.measurements.height}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Puente</p>
                            <p className="text-white text-xs font-semibold">{frame.measurements.bridge}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Temple</p>
                            <p className="text-white text-xs font-semibold">{frame.measurements.temple}</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-sm sm:text-base"
                            size="sm"
                            onClick={() => window.open(frame.purchaseLink, '_blank')}
                          >
                            <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            Comprar
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-gray-600 hover:bg-gray-700 text-sm sm:text-base"
                            size="sm"
                          >
                            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            Más Detalles
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {onGoToDashboard && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                    onClick={onGoToDashboard}
                  >
                    Ir al Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button
              onClick={generatePDFReport}
              disabled={isGeneratingPDF}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-base sm:text-lg font-semibold px-6 sm:px-8 h-12 sm:h-14 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Descargar PDF Completo
                </>
              )}
            </Button>
            <Button
              onClick={onNewAnalysis}
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-gray-700 text-white hover:bg-gray-800 text-base sm:text-lg font-semibold px-6 sm:px-8 h-12 sm:h-14 bg-transparent"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Realizar Nuevo Análisis
            </Button>
          </div>

          {/* Barra de progreso para descarga de PDF */}
          {showDownloadProgress && (
            <div className="mt-6 p-4 sm:p-6 bg-gray-800/70 rounded-2xl border border-blue-500/30 animate-fade-in-up max-w-md mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <FileText className="h-6 w-6 text-blue-400 animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-blue-300 font-medium text-sm sm:text-base">
                      {pdfDownloadProgress < 100 ? "Generando PDF..." : "✅ PDF Listo!"}
                    </span>
                    <span className="text-blue-400 font-bold text-sm sm:text-base">{Math.round(pdfDownloadProgress)}%</span>
                  </div>
                  <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${pdfDownloadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
              {pdfDownloadProgress < 100 && (
                <p className="text-blue-200 text-xs sm:text-sm text-center">
                  Preparando tu análisis facial detallado...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div >
  )
}