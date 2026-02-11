"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Scan, Award, Clock, ArrowRight, Calendar, Edit, Trash2, Plus, Upload, X, Loader2, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"

// Tipos para los marcos
interface FrameMeasurements {
  width: string
  height: string
  bridge: string
  temple: string
}

interface Frame {
  id: string
  name: string
  faceType: string
  description: string
  price: string
  imageUrl: string
  purchaseLink: string
  isActive: boolean
  measurements?: FrameMeasurements
}

interface UserDashboardProps {
  userData: {
    id: number
    name: string
    lastName: string
    company: string
    email: string
    subscription?: {
      plan: string
      status: "active" | "inactive" | "trial"
      analysisCount: number
      nextBilling?: string
      nextCalibration?: string
    }
    analysisHistory?: Array<{
      id: string
      date: string
      result: string
      recommendations: number
    }>
  }
  onStartAnalysis: () => void
  onGoToPricing: () => void
}

// Valores por defecto para las medidas
const DEFAULT_MEASUREMENTS: FrameMeasurements = {
  width: "",
  height: "",
  bridge: "",
  temple: ""
}

// Función para calcular el tipo de rostro basado en las medidas
const calculateFaceType = (measurements: FrameMeasurements): string => {
  const width = parseFloat(measurements.width) || 0
  const bridge = parseFloat(measurements.bridge) || 0
  const temple = parseFloat(measurements.temple) || 0

  // Lógica de cálculo basada en las reglas proporcionadas
  if (width >= 54 && width <= 58 && bridge >= 17 && bridge <= 19 && temple >= 140 && temple <= 145) {
    return "Cuadrado"
  } else if (width >= 58 && width <= 62 && bridge >= 18 && bridge <= 20 && temple >= 145 && temple <= 150) {
    return "Oblongo"
  } else if (width >= 56 && width <= 60 && bridge >= 16 && bridge <= 18 && temple >= 135 && temple <= 140) {
    return "Redondo"
  } else if (width >= 52 && width <= 54 && bridge >= 14 && bridge <= 16 && temple >= 140 && temple <= 145) {
    return "Diamante"
  } else if (width >= 52 && width <= 56 && bridge >= 16 && bridge <= 18 && temple >= 140 && temple <= 145) {
    return "Ovalado"
  }

  // Si no coincide exactamente, hacemos un cálculo ponderado
  const scores = {
    "Cuadrado": 0,
    "Oblongo": 0,
    "Redondo": 0,
    "Diamante": 0,
    "Ovalado": 0
  }

  // Ponderaciones
  if (width >= 54 && width <= 58) scores.Cuadrado += 3
  if (bridge >= 17 && bridge <= 19) scores.Cuadrado += 2
  if (temple >= 140 && temple <= 145) scores.Cuadrado += 1

  if (width >= 58 && width <= 62) scores.Oblongo += 3
  if (bridge >= 18 && bridge <= 20) scores.Oblongo += 2
  if (temple >= 145 && temple <= 150) scores.Oblongo += 1

  if (width >= 56 && width <= 60) scores.Redondo += 3
  if (bridge >= 16 && bridge <= 18) scores.Redondo += 2
  if (temple >= 135 && temple <= 140) scores.Redondo += 1

  if (width >= 52 && width <= 54) scores.Diamante += 3
  if (bridge >= 14 && bridge <= 16) scores.Diamante += 2
  if (temple >= 140 && temple <= 145) scores.Diamante += 1

  if (width >= 52 && width <= 56) scores.Ovalado += 3
  if (bridge >= 16 && bridge <= 18) scores.Ovalado += 2
  if (temple >= 140 && temple <= 145) scores.Ovalado += 1

  // Encontrar el tipo con mayor puntuación
  const maxScore = Math.max(...Object.values(scores))

  if (maxScore === 0) return "Ovalado" // Por defecto

  const faceTypes = Object.keys(scores) as Array<keyof typeof scores>
  return faceTypes.find(type => scores[type] === maxScore) || "Ovalado"
}

// Función para validar que todas las medidas estén completas
const validateMeasurements = (measurements: FrameMeasurements): boolean => {
  return Object.values(measurements).every(value =>
    value !== "" && !isNaN(parseFloat(value)) && parseFloat(value) > 0
  )
}

export function UserDashboard({ userData, onStartAnalysis, onGoToPricing }: UserDashboardProps) {
  const [frames, setFrames] = useState<Frame[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newFrame, setNewFrame] = useState<Omit<Frame, 'id'>>({
    name: "",
    faceType: "", // Esto se calculará automáticamente
    description: "",
    price: "",
    imageUrl: "",
    purchaseLink: "",
    isActive: true,
    measurements: DEFAULT_MEASUREMENTS
  })
  const [editingFrame, setEditingFrame] = useState<Frame | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [frameStats, setFrameStats] = useState({
    totalFrames: 0,
    activeFrames: 0
  })
  const [canCloseModal, setCanCloseModal] = useState(false)
  const [measurementsError, setMeasurementsError] = useState<string>("")

  const statusColors = {
    active: "bg-green-500",
    trial: "bg-yellow-500",
    inactive: "bg-gray-500",
  }

  // Cargar marcos al montar el componente
  useEffect(() => {
    loadFrames()
  }, [])

  // Efecto para calcular el tipo de rostro cuando cambian las medidas
  useEffect(() => {
    if (newFrame.measurements) {
      const allMeasurementsFilled = validateMeasurements(newFrame.measurements)

      if (allMeasurementsFilled) {
        const calculatedFaceType = calculateFaceType(newFrame.measurements)
        setNewFrame(prev => ({
          ...prev,
          faceType: calculatedFaceType
        }))
        setMeasurementsError("")
      } else {
        setNewFrame(prev => ({
          ...prev,
          faceType: ""
        }))
        setMeasurementsError("Por favor completa todas las medidas para calcular el tipo de rostro")
      }
    }
  }, [newFrame.measurements])

  // Efecto similar para el frame en edición
  useEffect(() => {
    if (editingFrame?.measurements) {
      const allMeasurementsFilled = validateMeasurements(editingFrame.measurements)

      if (allMeasurementsFilled) {
        const calculatedFaceType = calculateFaceType(editingFrame.measurements)
        setEditingFrame(prev => prev ? {
          ...prev,
          faceType: calculatedFaceType
        } : null)
      }
    }
  }, [editingFrame?.measurements])

  // Función para subir imagen a Cloudinary
  const uploadToCloudinary = async (file: File): Promise<string> => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Error al subir imagen')
      }

      return data.url
    } catch (error: any) {
      throw new Error(error.message || 'Error al subir imagen')
    } finally {
      setUploadingImage(false)
    }
  }

  // Cargar marcos desde la API con mejor manejo de errores
  const loadFrames = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setLoadError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoadError('No hay sesión activa');
        return;
      }

      const response = await fetch('/api/user/frames', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setLoadError('Sesión expirada. Por favor, vuelve a iniciar sesión');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        const transformedFrames = (data.frames || []).map((frame: any): Frame | null => {
          try {
            if (!frame) {
              console.warn('⚠️ Frame nulo encontrado en la respuesta de la API');
              return null;
            }

            // FUNCIÓN AUXILIAR para manejar valores null de la BD
            const parseMeasurementFromDB = (value: any) => {
              return value === null || value === undefined ? '' : String(value);
            };

            const measurements: FrameMeasurements = {
              width: parseMeasurementFromDB(frame.width_mm),
              height: parseMeasurementFromDB(frame.height_mm),
              bridge: parseMeasurementFromDB(frame.bridge_mm),
              temple: parseMeasurementFromDB(frame.temple_mm)
            };

            let faceType = String(frame.style || '');
            if (!faceType && validateMeasurements(measurements)) {
              faceType = calculateFaceType(measurements);
            }

            return {
              id: String(frame.id || ''),
              name: String(frame.name || 'Sin nombre'),
              faceType,
              description: String(frame.description || ''),
              price: String(frame.price || ''),
              imageUrl: String(frame.image_url || ''),
              purchaseLink: String(frame.purchase_link || ''),
              isActive: Boolean(frame.is_active),
              measurements
            };
          } catch (error) {
            console.error('❌ Error transformando frame:', error, frame);
            return null;
          }
        }).filter((frame: Frame | null): frame is Frame => frame !== null);

        setFrames(transformedFrames);
        const totalFrames = transformedFrames.length;
        const activeFrames = transformedFrames.filter((f: Frame) => f.isActive).length;
        setFrameStats({ totalFrames, activeFrames });
      } else {
        setLoadError(data.message || 'No se pudieron cargar los marcos');
      }
    } catch (error: any) {
      console.error('❌ Error loading frames:', error);
      setLoadError(error.message || 'Error al cargar los marcos');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Función para agregar un nuevo marco
  const handleAddFrame = async () => {
    if (!newFrame.name || !newFrame.imageUrl) {
      alert("Por favor completa los campos obligatorios: Nombre e Imagen")
      return
    }

    // Validar que todas las medidas estén completas
    if (!newFrame.measurements || !validateMeasurements(newFrame.measurements)) {
      alert("Por favor completa todas las medidas del marco (ancho, alto, puente y temple)")
      return
    }

    // Validar que se haya calculado el tipo de rostro
    if (!newFrame.faceType) {
      alert("No se pudo calcular el tipo de rostro. Por favor verifica las medidas.")
      return
    }

    try {
      const token = localStorage.getItem('auth_token')

      if (!token) {
        console.error('❌ No se encontró token en localStorage');
        alert('No hay sesión activa. Por favor, inicia sesión nuevamente.');
        return;
      }

      // Obtener medidas del nuevo marco
      const measurements = newFrame.measurements || DEFAULT_MEASUREMENTS;

      // FUNCIÓN AUXILIAR para convertir valores vacíos a null
      const parseMeasurement = (value: string) => {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      };

      // Preparar datos para la BD - CONVERTIR VALORES VACÍOS A null
      const frameData = {
        name: newFrame.name.trim(),
        style: newFrame.faceType.trim(),
        description: (newFrame.description || '').trim(),
        price: (newFrame.price || '').trim(),
        image_url: (newFrame.imageUrl || '').trim(),
        purchase_link: (newFrame.purchaseLink || '').trim(),
        is_active: Boolean(newFrame.isActive),
        // Convertir valores vacíos a null para evitar error de tipo integer
        width_mm: parseMeasurement(measurements.width),
        height_mm: parseMeasurement(measurements.height),
        bridge_mm: parseMeasurement(measurements.bridge),
        temple_mm: parseMeasurement(measurements.temple)
      }

      console.log('📤 Datos a enviar al servidor:', frameData);

      const response = await fetch('/api/user/frames', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(frameData),
      })

      let responseData;
      try {
        const responseText = await response.text();
        console.log('📡 Response body (raw):', responseText);

        if (responseText) {
          responseData = JSON.parse(responseText);
        } else {
          responseData = { success: false, message: 'Respuesta vacía del servidor' };
        }
      } catch (parseError) {
        console.error('❌ Error parseando respuesta:', parseError);
        responseData = { success: false, message: 'Error procesando respuesta del servidor' };
      }

      if (responseData.success) {
        await loadFrames(false)
        resetNewFrame()
        setIsAddDialogOpen(false)
        setCanCloseModal(false)
        alert('Marco agregado correctamente')
      } else {
        let errorMessage = responseData.message || 'Error al agregar marco';
        if (responseData.errors) {
          errorMessage += '\nErrores: ' + JSON.stringify(responseData.errors);
        }
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Error adding frame:', error);
      alert('Error al agregar marco. Por favor, intenta de nuevo.');
    }
  }

  // Función para probar la conexión con la API
  const testConnection = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('❌ No hay token disponible');
        return;
      }

      console.log('🔍 Probando conexión con API...');

      const testResponse = await fetch('/api/user/frames', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Test GET status:', testResponse.status);

      if (testResponse.ok) {
        console.log('✅ Conexión GET exitosa');
      } else {
        console.error('❌ Error en GET:', testResponse.status, testResponse.statusText);
      }
    } catch (error) {
      console.error('❌ Error en testConnection:', error);
    }
  };

  // Función para eliminar un marco
  const handleDeleteFrame = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este marco?")) {
      return
    }

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/user/frames/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        // Eliminar el marco de la lista local
        setFrames(frames.filter(frame => frame.id !== id))
        // Actualizar estadísticas
        const totalFrames = frames.length - 1
        const activeFrames = frames.filter(frame => frame.id !== id && frame.isActive).length
        setFrameStats({ totalFrames, activeFrames })
        alert('Marco eliminado correctamente')
      } else {
        alert(data.message || 'Error al eliminar marco')
      }
    } catch (error) {
      console.error('Error deleting frame:', error)
      alert('Error al eliminar marco')
    }
  }

  // Función para editar un marco
  const handleEditFrame = (frame: Frame) => {
    if (!frame) return;

    // Asegurarse de que el frame tenga measurements
    const safeFrame = {
      ...frame,
      measurements: frame.measurements || DEFAULT_MEASUREMENTS
    };

    setEditingFrame(safeFrame);
  }

  // Función para guardar los cambios de edición
  const handleSaveEdit = async () => {
    if (!editingFrame) return

    // Validar que todas las medidas estén completas
    if (!editingFrame.measurements || !validateMeasurements(editingFrame.measurements)) {
      alert("Por favor completa todas las medidas del marco (ancho, alto, puente y temple)")
      return
    }

    // Validar que se haya calculado el tipo de rostro
    if (!editingFrame.faceType) {
      alert("No se pudo calcular el tipo de rostro. Por favor verifica las medidas.")
      return
    }

    try {
      const token = localStorage.getItem('auth_token')

      // Obtener medidas del frame en edición
      const measurements = editingFrame.measurements || DEFAULT_MEASUREMENTS;

      // FUNCIÓN AUXILIAR para convertir valores vacíos a null
      const parseMeasurement = (value: string) => {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      };

      // Preparar datos para la BD - CONVERTIR VALORES VACÍOS A null
      const frameData = {
        name: editingFrame.name,
        style: editingFrame.faceType,
        description: editingFrame.description,
        price: editingFrame.price,
        image_url: editingFrame.imageUrl,
        purchase_link: editingFrame.purchaseLink,
        is_active: editingFrame.isActive,
        // Convertir valores vacíos a null para evitar error de tipo integer
        width_mm: parseMeasurement(measurements.width),
        height_mm: parseMeasurement(measurements.height),
        bridge_mm: parseMeasurement(measurements.bridge),
        temple_mm: parseMeasurement(measurements.temple)
      }

      const response = await fetch(`/api/user/frames/${editingFrame.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(frameData),
      })

      const data = await response.json()
      if (data.success) {
        // Actualizar el marco en la lista local
        setFrames(frames.map(frame =>
          frame.id === editingFrame.id ? editingFrame : frame
        ))
        // Actualizar estadísticas
        const totalFrames = frames.length
        const activeFrames = frames.map(frame =>
          frame.id === editingFrame.id ? editingFrame.isActive : frame.isActive
        ).filter(isActive => isActive).length
        setFrameStats({ totalFrames, activeFrames })
        setEditingFrame(null)
        alert('Marco actualizado correctamente')
      } else {
        alert(data.message || 'Error al actualizar marco')
      }
    } catch (error) {
      console.error('Error updating frame:', error)
      alert('Error al actualizar marco')
    }
  }

  // Función para cambiar el estado activo/inactivo
  const handleToggleActive = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/user/frames/${id}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        // Actualizar el estado del marco en la lista local
        const updatedFrames = frames.map(frame =>
          frame.id === id ? { ...frame, isActive: !frame.isActive } : frame
        )
        setFrames(updatedFrames)
        // Actualizar estadísticas
        const totalFrames = updatedFrames.length
        const activeFrames = updatedFrames.filter(f => f.isActive).length
        setFrameStats({ totalFrames, activeFrames })
      } else {
        alert(data.message)
      }
    } catch (error) {
      console.error('Error toggling frame:', error)
      alert('Error al cambiar estado del marco')
    }
  }

  // Función para resetear el formulario de nuevo marco
  const resetNewFrame = () => {
    setNewFrame({
      name: "",
      faceType: "",
      description: "",
      price: "",
      imageUrl: "",
      purchaseLink: "",
      isActive: true,
      measurements: DEFAULT_MEASUREMENTS
    })
    setImagePreview("")
    setMeasurementsError("")
  }

  // Función para manejar la carga de imagen con Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Validaciones básicas
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      if (!validTypes.includes(file.type)) {
        alert('Formato de imagen no válido. Usa JPG, PNG, WebP o GIF')
        return
      }

      const MAX_SIZE = 5 * 1024 * 1024 // 5MB
      if (file.size > MAX_SIZE) {
        alert('La imagen es demasiado grande. Máximo 5MB')
        return
      }

      // Subir a Cloudinary
      const imageUrl = await uploadToCloudinary(file)
      setNewFrame({ ...newFrame, imageUrl })
      setImagePreview(imageUrl)

    } catch (error: any) {
      console.error('Error uploading image:', error)
      alert(error.message || 'Error al subir la imagen')
    }
  }

  // Función para manejar la carga de imagen en edición
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && editingFrame) {
      try {
        const imageUrl = await uploadToCloudinary(file)
        setEditingFrame({ ...editingFrame, imageUrl })
      } catch (error: any) {
        console.error('Error uploading image:', error)
        alert(error.message || 'Error al subir la imagen')
      }
    }
  }

  // Función para verificar si se puede cerrar el modal
  const checkIfCanCloseModal = () => {
    const allMeasurementsFilled = newFrame.measurements ?
      validateMeasurements(newFrame.measurements) : false

    // Si hay medidas pero no están completas, no permitir cerrar
    const hasPartialMeasurements = newFrame.measurements &&
      Object.values(newFrame.measurements).some(val => val !== "")

    if (hasPartialMeasurements && !allMeasurementsFilled) {
      alert("Por favor completa todas las medidas del marco o elimina los valores ingresados antes de cerrar.")
      return false
    }

    setCanCloseModal(true)
    return true
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
            Bienvenido, {userData.name}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">Panel de Control - OptiScan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
                <Scan className="w-5 h-5 text-blue-400" />
                Marcos Registrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl sm:text-4xl font-bold text-blue-400">
                {frameStats.totalFrames}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">Total en tu catálogo</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
                <Award className="w-5 h-5 text-purple-400" />
                Marcos Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl sm:text-4xl font-bold text-purple-400">
                {frameStats.activeFrames}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">Disponibles para recomendación</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
                <Clock className="w-5 h-5 text-green-400" />
                Plan Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold text-green-400">
                {userData.subscription?.plan || "Básico"}
              </p>
              <Badge className={`${statusColors[userData.subscription?.status || "active"]} mt-2 text-xs`}>
                {userData.subscription?.status === "active"
                  ? "Activo"
                  : userData.subscription?.status === "trial"
                    ? "Prueba"
                    : "Inactivo"}
              </Badge>
            </CardContent>
          </Card>

          {/* Tarjeta de Próxima Actualización */}
          <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
                <Calendar className="w-5 h-5 text-orange-400" />
                Estado de Suscripción
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-lg sm:text-xl font-bold text-orange-400">
                    {userData.subscription?.status === "active" ?
                      (() => {
                        const daysRemaining = userData.subscription?.daysRemaining || 0;
                        if (daysRemaining > 0) {
                          return `En ${daysRemaining} días`;
                        } else if (daysRemaining === 0) {
                          return "Hoy";
                        } else {
                          return "Vencida";
                        }
                      })() :
                      userData.subscription?.status === "trial" ?
                        (() => {
                          const daysRemaining = userData.subscription?.daysRemaining || 0;
                          return `${daysRemaining} días de prueba`;
                        })() :
                        "Inactiva"}
                  </p>
                  <Badge className={`mt-2 text-xs ${userData.subscription?.status === "active" ?
                      "bg-green-500" :
                      userData.subscription?.status === "trial" ?
                        "bg-yellow-500" :
                        "bg-gray-500"
                    }`}>
                    {userData.subscription?.status === "active" ?
                      "Activa" :
                      userData.subscription?.status === "trial" ?
                        "Prueba" :
                        "Inactiva"}
                  </Badge>
                </div>

                {userData.subscription?.nextBilling && (
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-400">Próximo pago:</p>
                    <p className="text-sm text-white">
                      {new Date(userData.subscription.nextBilling).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400">Plan actual:</p>
                  <p className="text-sm text-white font-semibold">
                    {userData.subscription?.plan === "free" ? "Free" :
                      userData.subscription?.plan === "basic" ? "Básico" :
                        userData.subscription?.plan === "pro" ? "Profesional" :
                          userData.subscription?.plan === "enterprise" ? "Empresarial" :
                            "Free"}
                  </p>
                </div>

                {userData.subscription?.daysRemaining !== undefined && userData.subscription?.daysRemaining <= 7 && (
                  <div className="mt-3 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                    <p className="text-xs text-yellow-300 text-center">
                      {userData.subscription.daysRemaining === 0 ?
                        "⚠️ Tu suscripción vence hoy" :
                        userData.subscription.daysRemaining < 0 ?
                          "❌ Tu suscripción ha vencido" :
                          `⚠️ Tu suscripción vence en ${userData.subscription.daysRemaining} días`}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sección de Gestión de Marcos */}
        <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-800 mb-6 sm:mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white text-xl sm:text-2xl">Gestión de Marcos</CardTitle>
              <CardDescription className="text-gray-400 text-sm sm:text-base">
                Administra tu catálogo personal de marcos
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              if (!open && !canCloseModal) {
                if (!checkIfCanCloseModal()) {
                  return
                }
              }
              setIsAddDialogOpen(open)
              if (!open) {
                setCanCloseModal(false)
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Marco
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-white">Agregar Nuevo Marco</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">Nombre del Marco *</Label>
                    <Input
                      id="name"
                      value={newFrame.name}
                      onChange={(e) => setNewFrame({ ...newFrame, name: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Ej: Marco Clásico Negro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-300">Descripción</Label>
                    <Input
                      id="description"
                      value={newFrame.description}
                      onChange={(e) => setNewFrame({ ...newFrame, description: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Descripción detallada del marco"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-gray-300">Precio</Label>
                      <Input
                        id="price"
                        value={newFrame.price}
                        onChange={(e) => setNewFrame({ ...newFrame, price: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Ej: $129.99"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchaseLink" className="text-gray-300">Link de Compra</Label>
                      <Input
                        id="purchaseLink"
                        value={newFrame.purchaseLink}
                        onChange={(e) => setNewFrame({ ...newFrame, purchaseLink: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  {/* Medidas - SECCIÓN OBLIGATORIA */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">Medidas (mm) *</Label>
                      <span className="text-xs text-gray-500">Completa todas para calcular el tipo de rostro</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Ancho</Label>
                        <Input
                          value={newFrame.measurements?.width || ''}
                          onChange={(e) => setNewFrame({
                            ...newFrame,
                            measurements: {
                              ...(newFrame.measurements || DEFAULT_MEASUREMENTS),
                              width: e.target.value
                            }
                          })}
                          className="bg-gray-800 border-gray-700 text-white text-sm"
                          placeholder="54-62"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Alto</Label>
                        <Input
                          value={newFrame.measurements?.height || ''}
                          onChange={(e) => setNewFrame({
                            ...newFrame,
                            measurements: {
                              ...(newFrame.measurements || DEFAULT_MEASUREMENTS),
                              height: e.target.value
                            }
                          })}
                          className="bg-gray-800 border-gray-700 text-white text-sm"
                          placeholder="40-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Puente</Label>
                        <Input
                          value={newFrame.measurements?.bridge || ''}
                          onChange={(e) => setNewFrame({
                            ...newFrame,
                            measurements: {
                              ...(newFrame.measurements || DEFAULT_MEASUREMENTS),
                              bridge: e.target.value
                            }
                          })}
                          className="bg-gray-800 border-gray-700 text-white text-sm"
                          placeholder="14-20"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Temple</Label>
                        <Input
                          value={newFrame.measurements?.temple || ''}
                          onChange={(e) => setNewFrame({
                            ...newFrame,
                            measurements: {
                              ...(newFrame.measurements || DEFAULT_MEASUREMENTS),
                              temple: e.target.value
                            }
                          })}
                          className="bg-gray-800 border-gray-700 text-white text-sm"
                          placeholder="135-150"
                        />
                      </div>
                    </div>
                    {measurementsError && (
                      <p className="text-sm text-red-400">{measurementsError}</p>
                    )}

                    {/* Tipo de rostro calculado automáticamente */}
                    {newFrame.faceType && (
                      <div className="mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-gray-300">Tipo de rostro calculado:</Label>
                            <p className="text-lg font-bold text-blue-400">{newFrame.faceType}</p>
                          </div>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            Automático
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Basado en las medidas ingresadas: {newFrame.measurements?.width}mm x {newFrame.measurements?.height}mm
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Subida de imagen con Cloudinary */}
                  <div className="space-y-2">
                    <Label htmlFor="image" className="text-gray-300">Imagen del Marco *</Label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="bg-gray-800 border-gray-700 text-white"
                          disabled={uploadingImage}
                        />
                        {uploadingImage && (
                          <div className="flex items-center gap-2 mt-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            <span className="text-sm text-blue-400">Subiendo imagen a Cloudinary...</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Formatos aceptados: JPG, PNG, WebP, GIF. Máximo 5MB
                        </p>
                      </div>
                      {imagePreview && (
                        <div className="relative w-32 h-32">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-lg border border-gray-700"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 w-6 h-6 p-0"
                            onClick={() => {
                              setNewFrame({ ...newFrame, imageUrl: "" })
                              setImagePreview("")
                            }}
                            disabled={uploadingImage}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={newFrame.isActive}
                      onChange={(e) => setNewFrame({ ...newFrame, isActive: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    <Label htmlFor="isActive" className="text-gray-300">
                      Marcar como activo para recomendaciones
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!checkIfCanCloseModal()) {
                          return
                        }
                        setIsAddDialogOpen(false)
                      }}
                      className="border-gray-700"
                    >
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={handleAddFrame}
                    className="bg-gradient-to-r from-blue-500 to-purple-600"
                    disabled={uploadingImage || !newFrame.faceType || !newFrame.imageUrl}
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Marco
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-400" />
                <p className="text-gray-400 mt-2">Cargando marcos...</p>
              </div>
            ) : loadError ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-red-400 mb-4">{loadError}</p>
                <Button onClick={() => loadFrames()} variant="outline" className="border-gray-700">
                  <Loader2 className="w-4 h-4 mr-2" />
                  Reintentar
                </Button>
              </div>
            ) : frames.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
                  <Scan className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No tienes marcos registrados</h3>
                <p className="text-gray-400 mb-6">Agrega tu primer marco para comenzar tu catálogo</p>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Marco
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {frames.map((frame) => {
                  if (!frame) return null;

                  // Obtener medidas seguras
                  const measurements = frame.measurements || DEFAULT_MEASUREMENTS;

                  return (
                    <Card key={frame.id} className="bg-gray-800/50 border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
                      <div className="relative aspect-video bg-gray-900">
                        <img
                          src={frame.imageUrl || "/placeholder.svg"}
                          alt={frame.name}
                          className="w-full h-full object-cover"
                        />
                        <Badge className={`absolute top-2 right-2 ${frame.isActive ? 'bg-green-500' : 'bg-gray-500'}`}>
                          {frame.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-white text-lg">{frame.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-blue-400 border-blue-400/30">
                                {frame.faceType}
                              </Badge>
                              <span className="text-xs text-gray-500">Automático</span>
                            </div>
                          </div>
                          <span className="font-bold text-green-400">{frame.price}</span>
                        </div>

                        <p className="text-gray-300 text-sm mb-3 line-clamp-2">{frame.description}</p>

                        <div className="grid grid-cols-4 gap-1 mb-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Ancho</p>
                            <p className="text-white text-sm font-semibold">
                              {measurements.width ? `${measurements.width}mm` : 'N/A'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Alto</p>
                            <p className="text-white text-sm font-semibold">
                              {measurements.height ? `${measurements.height}mm` : 'N/A'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Puente</p>
                            <p className="text-white text-sm font-semibold">
                              {measurements.bridge ? `${measurements.bridge}mm` : 'N/A'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Temple</p>
                            <p className="text-white text-sm font-semibold">
                              {measurements.temple ? `${measurements.temple}mm` : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-gray-600 hover:bg-gray-700"
                              onClick={() => handleEditFrame(frame)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteFrame(frame.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`w-full ${frame.isActive
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 border-red-500/30'
                              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300 border-green-500/30'
                              }`}
                            onClick={() => handleToggleActive(frame.id)}
                          >
                            {frame.isActive ? (
                              <>
                                <X className="w-3 h-3 mr-1" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 mr-1" />
                                Activar
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información de la cuenta */}
        <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-800 mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="text-white text-xl sm:text-2xl">Información de la Cuenta</CardTitle>
            <CardDescription className="text-gray-400 text-sm sm:text-base">
              Detalles de tu perfil y empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Nombre Completo</p>
                <p className="text-base sm:text-lg text-white font-semibold">
                  {userData.name} {userData.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Email</p>
                <p className="text-base sm:text-lg text-white font-semibold">{userData.email}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Empresa/Negocio</p>
                <p className="text-base sm:text-lg text-white font-semibold">{userData.company}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Button
            onClick={onStartAnalysis}
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-base sm:text-lg font-semibold px-6 sm:px-8 h-12 sm:h-14"
          >
            <Scan className="w-5 h-5 mr-2" />
            Nuevo Análisis
          </Button>
          <Button
            onClick={onGoToPricing}
            size="lg"
            variant="outline"
            className="w-full sm:w-auto border-gray-700 text-white hover:bg-gray-800 text-base sm:text-lg font-semibold px-6 sm:px-8 h-12 sm:h-14 bg-transparent"
          >
            Ver Planes
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Diálogo de Edición */}
      {editingFrame && (
        <Dialog open={!!editingFrame} onOpenChange={() => {
          // Validar si hay medidas parciales antes de cerrar
          if (editingFrame?.measurements) {
            const allMeasurementsFilled = validateMeasurements(editingFrame.measurements)
            const hasPartialMeasurements = Object.values(editingFrame.measurements).some(val => val !== "")

            if (hasPartialMeasurements && !allMeasurementsFilled) {
              alert("Por favor completa todas las medidas del marco antes de cerrar.")
              return
            }
          }
          setEditingFrame(null)
        }}>
          <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Editar Marco</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Nombre del Marco</Label>
                <Input
                  value={editingFrame.name}
                  onChange={(e) => setEditingFrame({ ...editingFrame, name: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Descripción</Label>
                <Input
                  value={editingFrame.description}
                  onChange={(e) => setEditingFrame({ ...editingFrame, description: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Precio</Label>
                  <Input
                    value={editingFrame.price}
                    onChange={(e) => setEditingFrame({ ...editingFrame, price: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Link de Compra</Label>
                  <Input
                    value={editingFrame.purchaseLink}
                    onChange={(e) => setEditingFrame({ ...editingFrame, purchaseLink: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              {/* SECCIÓN DE MEDIDAS - OBLIGATORIA */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Medidas (mm) *</Label>
                  <span className="text-xs text-gray-500">Completa todas para calcular el tipo de rostro</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Ancho</Label>
                    <Input
                      value={editingFrame.measurements?.width || ''}
                      onChange={(e) => setEditingFrame({
                        ...editingFrame,
                        measurements: {
                          ...(editingFrame.measurements || DEFAULT_MEASUREMENTS),
                          width: e.target.value
                        }
                      })}
                      className="bg-gray-800 border-gray-700 text-white text-sm"
                      placeholder="54-62"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Alto</Label>
                    <Input
                      value={editingFrame.measurements?.height || ''}
                      onChange={(e) => setEditingFrame({
                        ...editingFrame,
                        measurements: {
                          ...(editingFrame.measurements || DEFAULT_MEASUREMENTS),
                          height: e.target.value
                        }
                      })}
                      className="bg-gray-800 border-gray-700 text-white text-sm"
                      placeholder="40-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Puente</Label>
                    <Input
                      value={editingFrame.measurements?.bridge || ''}
                      onChange={(e) => setEditingFrame({
                        ...editingFrame,
                        measurements: {
                          ...(editingFrame.measurements || DEFAULT_MEASUREMENTS),
                          bridge: e.target.value
                        }
                      })}
                      className="bg-gray-800 border-gray-700 text-white text-sm"
                      placeholder="14-20"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Temple</Label>
                    <Input
                      value={editingFrame.measurements?.temple || ''}
                      onChange={(e) => setEditingFrame({
                        ...editingFrame,
                        measurements: {
                          ...(editingFrame.measurements || DEFAULT_MEASUREMENTS),
                          temple: e.target.value
                        }
                      })}
                      className="bg-gray-800 border-gray-700 text-white text-sm"
                      placeholder="135-150"
                    />
                  </div>
                </div>

                {/* Tipo de rostro calculado automáticamente */}
                {editingFrame.faceType && (
                  <div className="mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-gray-300">Tipo de rostro calculado:</Label>
                        <p className="text-lg font-bold text-blue-400">{editingFrame.faceType}</p>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        Automático
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Basado en las medidas ingresadas: {editingFrame.measurements?.width}mm x {editingFrame.measurements?.height}mm
                    </p>
                  </div>
                )}
              </div>

              {/* Subida de imagen en edición con Cloudinary */}
              <div className="space-y-2">
                <Label className="text-gray-300">Imagen del Marco</Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      className="bg-gray-800 border-gray-700 text-white"
                      disabled={uploadingImage}
                    />
                    {uploadingImage && (
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        <span className="text-sm text-blue-400">Subiendo imagen a Cloudinary...</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos aceptados: JPG, PNG, WebP, GIF. Máximo 5MB
                    </p>
                  </div>
                  <div className="relative w-32 h-32">
                    <img
                      src={editingFrame.imageUrl || "/placeholder.svg"}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg border border-gray-700"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editingFrame.isActive}
                  onChange={(e) => setEditingFrame({ ...editingFrame, isActive: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                <Label className="text-gray-300">Marcar como activo para recomendaciones</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingFrame(null)} className="border-gray-700">
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-gradient-to-r from-blue-500 to-purple-600"
                disabled={!editingFrame.faceType}
              >
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}