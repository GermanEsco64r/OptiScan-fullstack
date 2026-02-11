"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { Scan, Camera, RotateCcw, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface AnalysisStep2Props {
  videoRef: React.RefObject<HTMLVideoElement>
  isAnalyzing: boolean
  analysisProgress: number
  scanningAnimation: boolean
  onContinue: () => void
  cameraPermission: string
}

export function AnalysisStep2({
  videoRef,
  isAnalyzing,
  analysisProgress,
  scanningAnimation,
  onContinue,
}: AnalysisStep2Props) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showCapturePreview, setShowCapturePreview] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [squareSize, setSquareSize] = useState(120)
  const [showWebcam, setShowWebcam] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  // Inicializar la cámara solo una vez
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        console.log('📷 Inicializando cámara...')
        
        // Detener cualquier stream anterior
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop())
          localStreamRef.current = null
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          }
        })

        localStreamRef.current = stream
        setShowWebcam(true)
        
        // Conectar el stream al videoRef del padre
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(error => {
            console.warn('⚠️ Error al reproducir video:', error)
          })
        }
        
        setCameraError(null)
        console.log('✅ Cámara inicializada correctamente')
        
      } catch (error) {
        console.error('❌ Error al inicializar la cámara:', error)
        setShowWebcam(false)
        setCameraError('No se pudo acceder a la cámara. Por favor, asegúrate de haber concedido los permisos.')
      }
    }

    initializeCamera()

    // Limpiar al desmontar
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        localStreamRef.current = null
      }
    }
  }, [videoRef]) // Agregado videoRef para estabilidad

  // Efecto para calcular el tamaño del cuadrado amarillo (responsive)
  useEffect(() => {
    const calculateSquareSize = () => {
      if (window.innerWidth < 768) {
        setSquareSize(100)
      } else {
        setSquareSize(120)
      }
    }

    calculateSquareSize()
    window.addEventListener('resize', calculateSquareSize)

    return () => {
      window.removeEventListener('resize', calculateSquareSize)
    }
  }, [])

  // Efecto para manejar cuando el video está listo
  useEffect(() => {
    const handleVideoReady = () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        setIsVideoReady(true)
        console.log("✅ Video listo para capturar")
      }
    }

    if (videoRef.current) {
      videoRef.current.addEventListener('loadeddata', handleVideoReady)
      videoRef.current.addEventListener('canplay', handleVideoReady)
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', handleVideoReady)
          videoRef.current.removeEventListener('canplay', handleVideoReady)
        }
      }
    }
  }, [videoRef])

  // Función para capturar la imagen con el cuadrado amarillo - SIN voltear la posición del cuadrado
  const captureImage = () => {
    if (!videoRef.current || !showWebcam) {
      console.error('Video ref no disponible o cámara no activa')
      return
    }
    
    setIsCapturing(true)
    const video = videoRef.current
    
    // Verificar que el video esté listo
    if (!isVideoReady) {
      console.warn('Video no está listo aún, esperando...')
      setTimeout(() => {
        captureImage()
        setIsCapturing(false)
      }, 200)
      return
    }
    
    // Esperar a que el video tenga dimensiones
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('Video no tiene dimensiones, esperando...')
      setTimeout(() => {
        captureImage()
        setIsCapturing(false)
      }, 100)
      return
    }
    
    // Crear canvas temporal
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      setIsCapturing(false)
      return
    }

    // IMPORTANTE: Aplicar volteo horizontal para que la foto sea como el usuario se ve en el espejo
    ctx.save()
    ctx.scale(-1, 1) // Voltear horizontalmente
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    ctx.restore()

    // Dibujar el cuadrado amarillo de referencia (5x5 cm) en la esquina superior izquierda
    // (posición normal, no volteada)
    const squareX = 20
    const squareY = 20

    // Cuadrado amarillo semi-transparente
    ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'
    ctx.fillRect(squareX, squareY, squareSize, squareSize)

    // Borde amarillo brillante
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 4
    ctx.strokeRect(squareX, squareY, squareSize, squareSize)

    // Texto dentro del cuadrado
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 18px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('5×5 cm', squareX + squareSize / 2, squareY + squareSize / 2 + 6)

    // Texto adicional
    ctx.font = '12px Arial'
    ctx.fillText('Referencia', squareX + squareSize / 2, squareY + squareSize + 15)

    // Convertir a base64 y actualizar estados
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(imageBase64)
    setShowCapturePreview(true)
    setIsCapturing(false)
    
    console.log('✅ Foto capturada correctamente')
  }

  // Función para retomar foto - MEJORADA
  const retakePhoto = () => {
    setCapturedImage(null)
    setShowCapturePreview(false)
    
    // Asegurarnos de que el video continúe reproduciéndose
    if (videoRef.current && localStreamRef.current) {
      // Verificar si el video está pausado o necesita reconexión
      if (videoRef.current.paused || !videoRef.current.srcObject) {
        videoRef.current.srcObject = localStreamRef.current
        videoRef.current.play().catch(error => {
          console.warn('⚠️ Error al reanudar video:', error)
          // Intentar reiniciar la cámara si hay error
          restartCamera()
        })
      }
    }
  }

  const handleContinue = () => {
    if (capturedImage) {
      console.log('🚀 Continuando al análisis con imagen capturada')
      
      // Detener la cámara antes de continuar
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        localStreamRef.current = null
      }
      
      onContinue()
    }
  }

  const restartCamera = async () => {
    try {
      setCameraError(null)
      setShowWebcam(false)
      setIsVideoReady(false)
      
      // Detener stream anterior
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        localStreamRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      })

      localStreamRef.current = stream
      setShowWebcam(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(console.error)
      }
      
    } catch (error) {
      console.error('❌ Error al reiniciar la cámara:', error)
      setCameraError('No se pudo reiniciar la cámara. Verifica los permisos.')
    }
  }

  const analysisSteps = [
    { label: "Detectando rostro", progress: 20 },
    { label: "Analizando geometría", progress: 40 },
    { label: "Midiendo proporciones", progress: 60 },
    { label: "Evaluando características", progress: 80 },
    { label: "Generando recomendaciones", progress: 100 },
  ]

  const currentAnalysisStep = analysisSteps.find((step) => analysisProgress <= step.progress)

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-6">
        <Card className="w-full max-w-6xl bg-gray-900/80 backdrop-blur-xl border-gray-800 shadow-2xl">
          <div className="p-4 sm:p-6 md:p-8">
            <div className="text-center mb-4 sm:mb-6 md:mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-3 sm:mb-4 animate-pulse">
                <Scan className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">
                {showCapturePreview ? "Vista Previa de la Foto" : "Análisis Facial en Tiempo Real"}
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-300">
                {showCapturePreview
                  ? "Revisa la foto capturada antes de analizarla"
                  : "Posiciona tu rostro dentro del marco de detección"}
              </p>
            </div>

            <div className="relative w-full aspect-video max-w-5xl mx-auto mb-4 sm:mb-6 md:mb-8 bg-gray-950 rounded-xl overflow-hidden shadow-2xl">
              <canvas ref={canvasRef} className="hidden" />

              {/* Contenedor principal que siempre muestra la cámara cuando está disponible */}
              <div className="relative w-full h-full">
                {/* Video de la cámara - siempre presente si showWebcam es true */}
                {showWebcam && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-opacity duration-300 ${showCapturePreview ? 'opacity-0' : 'opacity-100'}`}
                    style={{ transform: "scaleX(-1)" }}
                    onLoadedMetadata={() => {
                      console.log("✅ Video metadata cargada")
                      setIsVideoReady(true)
                    }}
                    onCanPlay={() => {
                      console.log("🎬 Video puede reproducirse")
                      setIsVideoReady(true)
                    }}
                    onError={(e) => {
                      console.error("❌ Error en video:", e)
                      setCameraError("Error en la transmisión de video")
                    }}
                  />
                )}

                {/* Vista previa de la foto capturada - superpuesta cuando está activa */}
                {showCapturePreview && capturedImage && (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
                    <img
                      src={capturedImage}
                      alt="Foto capturada"
                      className="w-full h-auto max-h-full object-contain"
                      style={{ 
                        minHeight: "400px",
                        maxHeight: "500px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                )}

                {/* Estados de carga/error */}
                {!showWebcam && (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
                    <div className="text-center">
                      {cameraError ? (
                        <div className="space-y-4">
                          <p className="text-red-300 font-medium">Error de cámara</p>
                          <Button
                            onClick={restartCamera}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Reintentar Cámara
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-300">Inicializando cámara...</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Elementos de overlay (cuadrados de referencia) - solo cuando la cámara está activa y no hay vista previa */}
                {showWebcam && !showCapturePreview && (
                  <>
                    {/* Cuadrado amarillo de referencia (5x5 cm) - en la esquina superior izquierda */}
                    <div
                      className="absolute top-4 left-4 bg-yellow-500/30 border-4 border-yellow-500 rounded-lg shadow-lg"
                      style={{
                        width: `${squareSize}px`,
                        height: `${squareSize}px`,
                        boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                      }}
                    >
                      {/* Texto indicativo dentro del cuadrado */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-yellow-600/70 px-2 py-1 rounded">
                          5×5 cm
                        </span>
                      </div>
                      <div className="absolute bottom-[-25px] left-1/2 transform -translate-x-1/2 text-xs text-yellow-300 whitespace-nowrap">
                        Referencia
                      </div>
                    </div>

                    {/* Face detection square - center */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 border-4 border-blue-500 rounded-2xl">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>

                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                      </div>
                    </div>

                    {scanningAnimation && (
                      <>
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan-vertical"></div>
                        </div>
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute h-full w-1 bg-gradient-to-b from-transparent via-purple-500 to-transparent animate-scan-horizontal"></div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Overlay de análisis */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center p-4 sm:p-6 md:p-8 bg-gray-900/90 rounded-xl border border-gray-700 max-w-md w-full mx-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
                      <p className="text-base sm:text-lg md:text-xl font-semibold text-white mb-2">
                        {currentAnalysisStep?.label || "Procesando..."}
                      </p>
                      <Progress value={analysisProgress} className="h-2 mb-2" />
                      <p className="text-xs sm:text-sm text-gray-400">{Math.round(analysisProgress)}% completado</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              {!showCapturePreview ? (
                <Button
                  onClick={captureImage}
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-base sm:text-lg font-semibold px-6 sm:px-8 h-12 sm:h-14"
                  disabled={isAnalyzing || isCapturing || !showWebcam || !isVideoReady}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {isCapturing ? "Capturando..." : "Capturar Rostro"}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={retakePhoto}
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-gray-700 text-white hover:bg-gray-800 text-base sm:text-lg font-semibold px-6 sm:px-8 h-12 sm:h-14 bg-transparent"
                    disabled={isAnalyzing}
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Tomar Otra Foto
                  </Button>
                  <Button
                    onClick={handleContinue}
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-base sm:text-lg font-semibold px-6 sm:px-8 h-12 sm:h-14"
                    disabled={isAnalyzing || !capturedImage}
                  >
                    Continuar al Análisis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </>
              )}
            </div>

            {showCapturePreview && capturedImage && !isAnalyzing && (
              <div className="mt-6 text-center animate-fade-in">
                <p className="text-green-300 font-medium text-lg">
                  ✓ Foto capturada correctamente
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  El cuadrado amarillo muestra una referencia de 5x5 cm para escala. 
                  Haz clic en "Continuar al Análisis" para procesar la imagen.
                </p>
              </div>
            )}

            {cameraError && !showWebcam && !showCapturePreview && (
              <div className="mt-6 text-center">
                <p className="text-red-300 font-medium text-lg">
                  ⚠️ Error de cámara
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  {cameraError}
                </p>
                <Button
                  onClick={restartCamera}
                  variant="outline"
                  className="mt-4 border-gray-700 text-white hover:bg-gray-800"
                >
                  Reintentar
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scan-vertical {
          0% { top: -100%; }
          50% { top: 50%; }
          100% { top: 100%; }
        }
        
        @keyframes scan-horizontal {
          0% { left: -100%; }
          50% { left: 50%; }
          100% { left: 100%; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .animate-scan-vertical {
          animation: scan-vertical 2s linear infinite;
        }
        
        .animate-scan-horizontal {
          animation: scan-horizontal 2.5s linear infinite;
        }
      `}</style>
    </div>
  )
}