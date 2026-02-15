"use client"

import { useRef, useState, useEffect } from "react"
import { LoginForm } from "@/components/login-form"
import { RegisterForm } from "@/components/register-form"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LandingPage } from "@/components/landing-page"
import { AnalysisStep1 } from "@/components/analysis-step1"
import { AnalysisStep2 } from "@/components/analysis-step2"
import { AnalysisStep3 } from "@/components/analysis-step3"
import { UserDashboard } from "@/components/user-dashboard"
import { PricingPlans } from "@/components/pricing-plans"
import { PaymentPage } from "@/components/payment-page"
import { AdminDashboard } from "@/components/admin-dashboard"
import { SupportModal } from "@/components/support-modal"
import { authService } from '@/lib/services/authService';

export default function OptiScan() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)

  const [selectedPlan, setSelectedPlan] = useState<{
    name: string
    months: number
    price: number
  } | null>(null)

  const [userData, setUserData] = useState<{
    id: number
    name: string
    lastName: string
    company: string
    email: string
    role: string
    subscription?: {
      plan: "free" | "basic" | "pro" | "enterprise"
      status: "active" | "inactive" | "trial"
      analysisCount: number
      nextBilling?: string
      analysisLimit?: number
    }
  } | null>(null)

  const [currentStep, setCurrentStep] = useState(1)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [facePosition, setFacePosition] = useState({ x: 50, y: 50 })
  const [scanningAnimation, setScanningAnimation] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [faceAnalysis, setFaceAnalysis] = useState({
    faceShape: "",
    skinTone: "",
    recommendations: [] as Array<{
      name: string
      style: string
      reason: string
      image: string
      confidence: number
    }>,
  })

  const [browserSupport, setBrowserSupport] = useState({
    hasGetUserMedia: false,
    hasMediaDevices: false,
    browser: "",
    version: "",
  })

  // Verificar sesión al cargar
  useEffect(() => {
    const checkSession = async () => {
      const session = await authService.verifySession()
      if (session.success && session.user) {
        setIsLoggedIn(true)
        setIsAdmin(session.user.role === 'admin')
        setUserData(session.user)
      }
    }
    checkSession()
  }, [])

  useEffect(() => {
    const detectBrowserSupport = () => {
      const userAgent = navigator.userAgent
      let browser = "Unknown"
      let version = ""

      if (userAgent.indexOf("Firefox") > -1) {
        browser = "Firefox"
        version = userAgent.match(/Firefox\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("SamsungBrowser") > -1) {
        browser = "Samsung Internet"
        version = userAgent.match(/SamsungBrowser\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
        browser = "Opera"
        version = userAgent.match(/(?:Opera|OPR)\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Trident") > -1) {
        browser = "IE"
        version = userAgent.match(/rv:(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Edge") > -1) {
        browser = "Edge"
        version = userAgent.match(/Edge\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Edg") > -1) {
        browser = "Edge Chromium"
        version = userAgent.match(/Edg\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Chrome") > -1) {
        browser = "Chrome"
        version = userAgent.match(/Chrome\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Safari") > -1) {
        browser = "Safari"
        version = userAgent.match(/Version\/(\d+)/)?.[1] || ""
      }

      const hasGetUserMedia =
        !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
        !!navigator.getUserMedia ||
        !!navigator.webkitGetUserMedia ||
        !!navigator.mozGetUserMedia

      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

      const support = {
        hasGetUserMedia,
        hasMediaDevices,
        browser,
        version,
      }

      console.log("[v0] Browser support detected:", support)
      setBrowserSupport(support)
    }

    detectBrowserSupport()
  }, [])

  const handleLogin = async (email: string, password: string) => {
    const result = await authService.login({ email, password });
    if (result.success) {
      setIsLoggedIn(true);
      setIsAdmin(result.user?.role === 'admin');
      setUserData(result.user);
      setShowLanding(true);
      setShowRegister(false);
    } else {
      alert(result.message || 'Error al iniciar sesión');
    }
  };

  const handleRegister = async (name: string, lastName: string, company: string, email: string, password: string) => {
    const result = await authService.register({ name, lastName, company, email, password });
    if (result.success) {
      setIsLoggedIn(true);
      setIsAdmin(false);
      setUserData(result.user);
      setShowLanding(true);
      setShowRegister(false);
    } else {
      alert(result.message || 'Error al registrar usuario');
    }
  };

  const handleLogout = () => {
    authService.logout()
    setIsLoggedIn(false)
    setIsAdmin(false)
    setShowLanding(true)
    setShowDashboard(false)
    setShowPricing(false)
    setShowPayment(false)
    setShowRegister(false)
    setSelectedPlan(null)
    setUserData(null)
    resetAnalysis()
  }

  const goToLanding = () => {
    setShowLanding(true)
    setShowDashboard(false)
    setShowPricing(false)
    setShowPayment(false)
    resetAnalysis()
  }

  const goToDashboard = () => {
    setShowDashboard(true)
    setShowLanding(false)
    setShowPricing(false)
    setShowPayment(false)
    resetAnalysis()
  }

  const goToPricing = () => {
    setShowPricing(true)
    setShowLanding(false)
    setShowDashboard(false)
    setShowPayment(false)
    resetAnalysis()
  }

  const startAnalysis = () => {
    if (!userData) return

    // Verificar límite de análisis
    if (userData.subscription && userData.subscription.analysisLimit) {
      if (userData.subscription.analysisCount >= userData.subscription.analysisLimit) {
        alert(`Has alcanzado el límite de ${userData.subscription.analysisLimit} análisis. Por favor, actualiza tu plan.`)
        goToPricing()
        return
      }
    }

    setShowLanding(false)
    setShowDashboard(false)
    setShowPricing(false)
    setShowPayment(false)
    setCurrentStep(1)
    setAnalysisComplete(false)
    setFaceAnalysis({
      faceShape: "",
      skinTone: "",
      recommendations: [],
    })
  }

  const handleSelectPlan = (planName: string, months: number, price: number) => {
    setSelectedPlan({
      name: planName,
      months,
      price,
    })
    setShowPricing(false)
    setShowPayment(true)
  }

  const handleBackFromPayment = () => {
    setShowPayment(false)
    setSelectedPlan(null)
    setShowPricing(true)
  }

  const requestCameraPermission = () => {
    setCurrentStep(2) // Solo avanza al paso 2, la cámara se inicia en AnalysisStep2
  }

  const handleContinueToAnalysis = () => {
    if (!userData) return

    setIsAnalyzing(true)
    setScanningAnimation(true)

    let progress = 0
    const analysisInterval = setInterval(() => {
      progress += Math.random() * 10 + 5
      if (progress >= 100) {
        progress = 100
        clearInterval(analysisInterval)
        setIsAnalyzing(false)
        setAnalysisComplete(true)
        setScanningAnimation(false)
        setCurrentStep(3)

        setFaceAnalysis({
          faceShape: "Ovalado",
          skinTone: "Tono Cálido",
          recommendations: [
            {
              name: "Aviador Clásico",
              style: "Metálico",
              reason: "Complementa la forma ovalada de tu rostro",
              image: "/aviator-titanium-glasses.jpg",
              confidence: 92,
            },
            {
              name: "Mariposa Moderna",
              style: "Acetato",
              reason: "El diseño pronunciado realza tus rasgos faciales",
              image: "/executive-glasses-frames.jpg",
              confidence: 88,
            },
            {
              name: "Rectangular Delgado",
              style: "Titanio",
              reason: "Contrasta suavemente con la forma ovalada, aportando definición",
              image: "/round-vintage-glasses.png",
              confidence: 85,
            },
          ],
        })

        // Incrementar contador de análisis en la base de datos
        authService.incrementUserAnalysis(userData.id).then(result => {
          if (result.success) {
            console.log("Análisis registrado en BD:", result.message)
          } else {
            console.warn("No se pudo registrar análisis en BD:", result.message)
          }
        }).catch(error => {
          console.error("Error al registrar análisis:", error)
        })

        // Actualizar datos del usuario localmente
        setUserData(prev => {
          if (!prev || !prev.subscription) return prev
          return {
            ...prev,
            subscription: {
              ...prev.subscription,
              analysisCount: (prev.subscription.analysisCount || 0) + 1
            }
          }
        })
      }
      setAnalysisProgress(progress)
    }, 300)
  }

  const resetAnalysis = () => {
    setCurrentStep(1)
    setAnalysisComplete(false)
    setAnalysisProgress(0)
    setFaceDetected(false)
    setScanningAnimation(false)
    setIsAnalyzing(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setFaceAnalysis({
      faceShape: "",
      skinTone: "",
      recommendations: [],
    })
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const runCameraDiagnostic = async () => {
    console.log("[v0] === DIAGNÓSTICO DE CÁMARA ===")
    console.log("[v0] User Agent:", navigator.userAgent)
    console.log("[v0] Browser Support:", browserSupport)

    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
        console.log("[v0] Camera Permission:", permission.state)
      } catch (e) {
        console.log("[v0] No se pudo verificar permisos:", e)
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((device) => device.kind === "videoinput")
        console.log("[v0] Cámaras disponibles:", videoDevices.length)
        videoDevices.forEach((device, index) => {
          console.log(`[v0] Cámara ${index + 1}:`, {
            label: device.label || "Sin nombre",
            deviceId: device.deviceId,
            groupId: device.groupId,
          })
        })
      } catch (e) {
        console.log("[v0] No se pudo listar dispositivos:", e)
      }
    }

    console.log("[v0] === FIN DIAGNÓSTICO ===")
  }

  useEffect(() => {
    runCameraDiagnostic()
  }, [browserSupport])

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleFooterNavigation = (section: string) => {
    if (section === "inicio") {
      goToLanding()
    } else if (section === "analisis") {
      startAnalysis()
    } else if (section === "planes") {
      goToPricing()
    } else if (section === "soporte") {
      setShowSupportModal(true)
    }
  }

  if (isLoggedIn && isAdmin) {
    return <AdminDashboard onLogout={handleLogout} />
  }

  if (!isLoggedIn) {
    return (
      <>
        <Header
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
          onLogoClick={goToLanding}
          onDashboard={goToDashboard}
          onPricing={goToPricing}
          userName={userData?.name}
        />
        {showRegister ? (
          <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setShowRegister(true)} />
        )}
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onLogoClick={goToLanding}
        onDashboard={goToDashboard}
        onPricing={goToPricing}
        userName={userData?.name}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {showLanding && <LandingPage onStartAnalysis={startAnalysis} />}

      {!showLanding && !showDashboard && !showPricing && !showPayment && (
        <>
          {currentStep === 1 && <AnalysisStep1 onRequestPermission={requestCameraPermission} />}

          {currentStep === 2 && (
            <AnalysisStep2
              videoRef={videoRef}
              onContinue={handleContinueToAnalysis}
              isAnalyzing={isAnalyzing}
              analysisProgress={analysisProgress}
              scanningAnimation={scanningAnimation}
            />
          )}

          {currentStep === 3 && (
            <AnalysisStep3
              faceAnalysis={{
                ...faceAnalysis,
                measurements: {
                  faceWidth: "18.5 cm",
                  faceHeight: "22.0 cm",
                  eyeDistance: "6.5 cm",
                  eyeHeight: "3.2 cm"
                }
              }}
              onNewAnalysis={() => {
                resetAnalysis()
                startAnalysis()
              }}
              onGoToDashboard={goToDashboard}
              userFrames={[]}
            />
          )}
        </>
      )}

      {showDashboard && userData && (
        <UserDashboard
          userData={userData}
          onStartAnalysis={startAnalysis}
          onGoToPricing={goToPricing}
        />
      )}

      {showPricing && (
        <PricingPlans
          onSelectPlan={handleSelectPlan}
          currentPlan={userData?.subscription?.plan}
        />
      )}

      {showPayment && selectedPlan && (
        <PaymentPage
          selectedPlan={selectedPlan}
          onBack={handleBackFromPayment}
        />
      )}

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />

      <Footer onNavigate={handleFooterNavigation} />
    </>
  )
}