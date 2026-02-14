"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Copy, Mail, MessageSquare, CheckCircle, AlertCircle } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

interface PaymentPageProps {
  selectedPlan: {
    name: string
    months: number
    price: number
  }
  onBack: () => void
}

export function PaymentPage({ selectedPlan, onBack }: PaymentPageProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  // Datos actualizados según lo solicitado
  const accountInfo = {
    bank: "Banco de la Nación Argentina (BNA)",
    accountType: "Caja de Ahorro en Pesos",
    accountNumber: "27204079578679",
    cbu: "0110407730040795786797",
    alias: "27283873094.bna",
    holder: "Patricia Veronica Maciel",
    cuit: "27-28387309-4",
  }

  const contactInfo = {
    email: "prof.danigodoy@gmail.com",
    whatsapp: "+54 376 520-7107",
    businessHours: "Lunes a Viernes de 9:00 a 18:00 hs",
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 text-gray-300 hover:text-white hover:bg-gray-800/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a planes
        </Button>

        <div className="text-center mb-8">
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 mb-4 text-sm">
            <CheckCircle className="w-3 h-3 mr-1" />
            Plan Seleccionado
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Completar Pago</h1>
          <p className="text-base sm:text-lg text-gray-300">
            Estás suscribiéndote al plan <span className="font-bold text-blue-400">{selectedPlan.name}</span>
          </p>
          <div className="text-2xl sm:text-3xl font-bold text-green-400 mt-2">
            {formatPrice(selectedPlan.price)}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Duración: {selectedPlan.months} {selectedPlan.months === 1 ? "mes" : "meses"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Información de Transferencia */}
          <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Datos para Transferencia
              </CardTitle>
              <CardDescription className="text-gray-400">
                Realiza la transferencia bancaria con los siguientes datos:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(accountInfo).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, " $1")}:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono">
                      {value}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(value, key)}
                      className="border-gray-700 hover:bg-gray-800"
                    >
                      <Copy className="w-4 h-4" />
                      {copied === key && (
                        <span className="ml-2 text-xs text-green-400">¡Copiado!</span>
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-800">
                <p className="text-sm text-gray-400 mb-2">
                  <strong>Importante:</strong> Realizar la transferencia por el monto exacto
                </p>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <p className="text-white font-semibold">Monto a transferir:</p>
                  <p className="text-2xl font-bold text-green-400">{formatPrice(selectedPlan.price)}</p>
                  <p className="text-xs text-gray-400 mt-1">Concepto: SUSCRIPCIÓN OPTISCAN {selectedPlan.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Envío de Comprobante */}
          <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                Enviar Comprobante
              </CardTitle>
              <CardDescription className="text-gray-400">
                Después de realizar la transferencia, envía el comprobante por:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-900/30 p-2 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold">Correo Electrónico</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      Envía el comprobante escaneado o foto al siguiente correo:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-900/70 border border-gray-700 rounded px-3 py-2 text-white text-sm">
                        {contactInfo.email}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(contactInfo.email, "email")}
                        className="border-gray-700 hover:bg-gray-800"
                      >
                        <Copy className="w-4 h-4" />
                        {copied === "email" && (
                          <span className="ml-2 text-xs text-green-400">¡Copiado!</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-green-900/30 p-2 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold">WhatsApp</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      Envía el comprobante por mensaje al siguiente número:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-900/70 border border-gray-700 rounded px-3 py-2 text-white text-sm">
                        {contactInfo.whatsapp}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(contactInfo.whatsapp, "whatsapp")}
                        className="border-gray-700 hover:bg-gray-800"
                      >
                        <Copy className="w-4 h-4" />
                        {copied === "whatsapp" && (
                          <span className="ml-2 text-xs text-green-400">¡Copiado!</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instrucciones */}
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">📋 Instrucciones importantes:</h4>
                <ul className="text-sm text-blue-300 space-y-1">
                  <li>• Incluye tu nombre completo en el asunto del correo/mensaje</li>
                  <li>• Adjunta el comprobante de transferencia (foto o PDF)</li>
                  <li>• Menciona el plan seleccionado: {selectedPlan.name}</li>
                  <li>• Horario de atención: {contactInfo.businessHours}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pasos a Seguir */}
        <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">📝 Pasos para completar la suscripción</CardTitle>
            <CardDescription className="text-gray-400">
              Sigue estos pasos para activar tu suscripción rápidamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold">
                  1
                </div>
                <h4 className="text-white font-semibold mb-1">Realizar Transferencia</h4>
                <p className="text-gray-400 text-sm">
                  Usa los datos bancarios proporcionados
                </p>
              </div>

              <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold">
                  2
                </div>
                <h4 className="text-white font-semibold mb-1">Guardar Comprobante</h4>
                <p className="text-gray-400 text-sm">
                  Toma una foto o guarda el PDF del comprobante
                </p>
              </div>

              <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold">
                  3
                </div>
                <h4 className="text-white font-semibold mb-1">Enviar Comprobante</h4>
                <p className="text-gray-400 text-sm">
                  Por correo o WhatsApp con tus datos
                </p>
              </div>

              <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold">
                  4
                </div>
                <h4 className="text-white font-semibold mb-1">Recibir Confirmación</h4>
                <p className="text-gray-400 text-sm">
                  Activaremos tu plan en menos de 24 horas
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-300">
                <span className="font-bold text-yellow-400">Nota:</span> Una vez que enviemos la confirmación, 
                podrás acceder a todas las funciones del plan {selectedPlan.name} desde tu panel de control. 
                El tiempo de activación suele ser de 2 a 4 horas hábiles.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}