"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useState } from "react"

interface PricingPlansProps {
  onSelectPlan: (plan: string, months: number, price: number) => void
  currentPlan?: string
}

export function PricingPlans({ onSelectPlan, currentPlan }: PricingPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null)

  const plans = [
    {
      id: 1,
      name: "1 Mes",
      months: 1,
      pricePerMonth: 300000,
      totalPrice: 300000,
      description: "Pago mensual sin compromiso",
      discount: 0,
      highlight: false,
    },
    {
      id: 2,
      name: "3 Meses",
      months: 3,
      pricePerMonth: 285000,
      totalPrice: 855000,
      description: "Ahorra con plan trimestral",
      discount: 5,
      highlight: false,
    },
    {
      id: 3,
      name: "6 Meses",
      months: 6,
      pricePerMonth: 270000,
      totalPrice: 1620000,
      description: "Mejor valor - Plan semestral",
      discount: 10,
      highlight: true,
    },
    {
      id: 4,
      name: "12 Meses",
      months: 12,
      pricePerMonth: 255000,
      totalPrice: 3060000,
      description: "Máximo ahorro - Plan anual",
      discount: 15,
      highlight: true,
    },
  ]

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const handlePlanSelect = (plan: typeof plans[0]) => {
    setSelectedPlan(plan.id)
    onSelectPlan(plan.name, plan.months, plan.totalPrice)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">Planes y Precios</h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            Elige la duración perfecta para tu suscripción
          </p>
          <p className="text-sm sm:text-base text-gray-400 mt-2">Análisis ilimitados • Todas las funciones incluidas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`bg-gray-900/80 backdrop-blur-xl border-2 transition-all duration-300 hover:scale-[1.02] flex flex-col ${
                selectedPlan === plan.id
                  ? "border-purple-500 scale-[1.02]"
                  : "border-gray-800"
              }`}
              onClick={() => handlePlanSelect(plan)}
            >
              <CardHeader>
                {plan.discount > 0 && (
                  <div className="inline-block bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-2 w-fit">
                    {plan.discount}% OFF
                  </div>
                )}
                <CardTitle className="text-white text-xl sm:text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-gray-400 text-sm sm:text-base">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                    {formatPrice(plan.totalPrice)}
                  </span>
                  <div className="text-gray-400 text-sm mt-1">{formatPrice(plan.pricePerMonth)}/mes</div>
                  {plan.discount > 0 && (
                    <div className="text-gray-500 text-xs line-through mt-1">
                      {formatPrice(300000 * plan.months)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-300">Análisis faciales ilimitados</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-300">Recomendaciones personalizadas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-300">Exportar reportes PDF</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-300">Historial completo</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-300">Soporte prioritario 24/7</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-300">
                      Acceso por {plan.months} {plan.months === 1 ? "mes" : "meses"}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePlanSelect(plan)
                  }}
                  className={`w-full ${
                    selectedPlan === plan.id
                      ? "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                      : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  } text-sm sm:text-base font-semibold h-10 sm:h-12`}
                >
                  {selectedPlan === plan.id ? "Plan Seleccionado" : "Seleccionar Plan"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}