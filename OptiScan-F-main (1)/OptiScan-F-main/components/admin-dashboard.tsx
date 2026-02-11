"use client"

import { useState, useEffect } from "react"
import { Users, Eye, EyeOff, CreditCard, Search, Download, AlertCircle, Plus, ChevronDown, Loader2, RefreshCw, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { authService } from "@/lib/services/authService"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// Declaración para extender jsPDF con lastAutoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number
    }
  }
}

interface User {
  id: number
  name: string
  lastName: string
  company: string
  email: string
  role: string
  isActive: boolean
  subscription?: {
    plan: "free" | "basic" | "pro" | "enterprise"
    status: "active" | "inactive" | "trial"
    analysisCount: number
    nextBilling?: string
    analysisLimit?: number
    daysRemaining?: number
  }
  createdAt: string
  updatedAt: string
}

interface AdminDashboardProps {
  onLogout: () => void
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalAnalysis: 0,
    expiringSoon: 0,
    expiredSubscriptions: 0,
  })
  const [loading, setLoading] = useState(true)
  const [updatingUser, setUpdatingUser] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [filterPlan, setFilterPlan] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const session = await authService.verifySession()
      if (!session.success || !session.user || session.user.role !== 'admin') {
        alert('No tienes permisos de administrador')
        onLogout()
        return
      }

      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Error al cargar usuarios')
      }

      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
        calculateStats(data.users)
      }
    } catch (error) {
      console.error('Error loading users:', error)
      alert('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (usersList: User[]) => {
    let totalRevenue = 0
    let totalAnalysis = 0
    let activeCount = 0
    let expiringSoonCount = 0
    let expiredCount = 0
    const now = new Date()

    usersList.forEach(user => {
      if (user.isActive) {
        activeCount++
      }
      if (user.subscription) {
        totalAnalysis += user.subscription.analysisCount || 0

        const planPrices: { [key: string]: number } = {
          free: 0,
          basic: 19000,
          pro: 49000,
          enterprise: 199000,
        }
        totalRevenue += planPrices[user.subscription.plan] || 0

        // Verificar suscripciones próximas a vencer (menos de 7 días)
        if (user.subscription.nextBilling) {
          const nextBilling = new Date(user.subscription.nextBilling)
          const diffTime = nextBilling.getTime() - now.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          if (diffDays <= 7 && diffDays > 0) {
            expiringSoonCount++
          }
          
          if (diffDays < 0) {
            expiredCount++
          }
        }
      }
    })

    setStats({
      totalUsers: usersList.length,
      activeUsers: activeCount,
      totalRevenue,
      totalAnalysis,
      expiringSoon: expiringSoonCount,
      expiredSubscriptions: expiredCount,
    })
  }

  const handleToggleStatus = async (userId: number) => {
    setUpdatingUser(userId)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (data.success) {
        // Recargar la lista para obtener datos actualizados
        await loadUsers()
      } else {
        alert(data.message)
      }
    } catch (error) {
      console.error('Error toggling user status:', error)
      alert('Error al cambiar estado del usuario')
    } finally {
      setUpdatingUser(null)
    }
  }

  const handleChangePlan = async (userId: number, newPlan: string) => {
    setUpdatingUser(userId)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: newPlan }),
      })

      const data = await response.json()
      if (data.success) {
        // Recargar la lista para obtener datos actualizados
        await loadUsers()
      } else {
        alert(data.message)
      }
    } catch (error) {
      console.error('Error changing plan:', error)
      alert('Error al cambiar plan del usuario')
    } finally {
      setUpdatingUser(null)
    }
  }

  const handleRenewSubscription = async (userId: number) => {
    setUpdatingUser(userId)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/admin/users/${userId}/renew`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()
      if (data.success) {
        alert('Suscripción renovada correctamente')
        // Recargar la lista para obtener datos actualizados
        await loadUsers()
      } else {
        alert(data.message)
      }
    } catch (error) {
      console.error('Error renewing subscription:', error)
      alert('Error al renovar suscripción')
    } finally {
      setUpdatingUser(null)
    }
  }

  const getPlanLimit = (plan: string): number => {
    const limits: { [key: string]: number } = {
      free: 5,
      basic: 15,
      pro: 50,
      enterprise: 9999,
    }
    return limits[plan] || 5
  }

  const getPlanName = (plan: string) => {
    const planNames: { [key: string]: string } = {
      free: "Gratuito",
      basic: "Básico",
      pro: "Profesional",
      enterprise: "Enterprise",
    }
    return planNames[plan] || plan
  }

  const getPlanPrice = (plan: string) => {
    const planPrices: { [key: string]: number } = {
      free: 0,
      basic: 19000,
      pro: 49000,
      enterprise: 199000,
    }
    return planPrices[plan] || 0
  }

  const filteredUsers = users.filter((user) => {
    // Filtrar por búsqueda
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company.toLowerCase().includes(searchTerm.toLowerCase())

    // Filtrar por plan
    const matchesPlan = filterPlan === "all" || user.subscription?.plan === filterPlan

    // Filtrar por estado
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && user.isActive) ||
      (filterStatus === "inactive" && !user.isActive)

    return matchesSearch && matchesPlan && matchesStatus
  })

  const getSubscriptionStatus = (user: User): string => {
    if (!user.subscription?.nextBilling) return "Sin fecha"
    
    const nextBilling = new Date(user.subscription.nextBilling)
    const now = new Date()
    const diffTime = nextBilling.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return "Vencida"
    if (diffDays === 0) return "Vence hoy"
    if (diffDays <= 7) return "Próxima a vencer"
    return "Activa"
  }

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case "Vencida": return "bg-red-500/20 text-red-400"
      case "Vence hoy": return "bg-orange-500/20 text-orange-400"
      case "Próxima a vencer": return "bg-yellow-500/20 text-yellow-400"
      case "Activa": return "bg-green-500/20 text-green-400"
      default: return "bg-gray-500/20 text-gray-400"
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No definida"
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getDaysRemaining = (dateString?: string): number => {
    if (!dateString) return 0
    const nextBilling = new Date(dateString)
    const now = new Date()
    const diffTime = nextBilling.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const exportData = async () => {
    if (users.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    setExporting(true)
    
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Encabezado
      doc.setFontSize(22)
      doc.setTextColor(41, 128, 185)
      doc.text('Reporte de Usuarios - OptiScan', pageWidth / 2, 20, { align: 'center' })
      
      doc.setFontSize(11)
      doc.setTextColor(100, 100, 100)
      const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      doc.text(`Generado el: ${fecha}`, pageWidth / 2, 28, { align: 'center' })

      // Estadísticas
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text('ESTADÍSTICAS GENERALES', 14, 40)
      
      autoTable(doc, {
        startY: 45,
        head: [['Total Usuarios', 'Usuarios Activos', 'Ingresos Totales', 'Análisis Realizados', 'Próximos a Vencer', 'Vencidas']],
        body: [[
          stats.totalUsers.toString(),
          stats.activeUsers.toString(),
          `$${stats.totalRevenue.toLocaleString()}`,
          stats.totalAnalysis.toString(),
          stats.expiringSoon.toString(),
          stats.expiredSubscriptions.toString()
        ]],
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 11,
          cellPadding: 6,
          textColor: [50, 50, 50]
        },
        margin: { left: 14, right: 14 }
      })

      let currentY = (doc as any).lastAutoTable?.finalY || 65

      // Tabla de usuarios
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text('DETALLE DE USUARIOS', 14, currentY + 15)

      const userData = users.map(user => [
        user.id.toString(),
        `${user.name} ${user.lastName}`,
        user.email,
        user.company,
        user.subscription ? getPlanName(user.subscription.plan) : 'Sin plan',
        user.isActive ? 'Activo' : 'Inactivo',
        (user.subscription?.analysisCount || 0).toString(),
        (user.subscription?.analysisLimit || 0).toString(),
        formatDate(user.subscription?.nextBilling),
        getSubscriptionStatus(user),
        new Date(user.createdAt).toLocaleDateString('es-ES')
      ])

      autoTable(doc, {
        startY: currentY + 20,
        head: [['ID', 'Nombre', 'Email', 'Empresa', 'Plan', 'Estado', 'Análisis', 'Límite', 'Próximo Pago', 'Estado Suscripción', 'Fecha Registro']],
        body: userData,
        theme: 'grid',
        headStyles: { 
          fillColor: [52, 73, 94],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 3,
          textColor: [50, 50, 50]
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { left: 14, right: 14 },
        pageBreak: 'auto',
        didDrawPage: function (data) {
          doc.setFontSize(10)
          doc.setTextColor(150, 150, 150)
          const pageCount = doc.getNumberOfPages()
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          )
          
          doc.setFontSize(9)
          doc.text('© OptiScan Analytics - Reporte de administración', pageWidth / 2, pageHeight - 5, { align: 'center' })
        }
      })

      const fileName = `reporte-optiscan-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

    } catch (error) {
      console.error('Error al generar PDF:', error)
      alert('Error al generar el reporte en PDF')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Panel de Administrador
            </h1>
            <p className="text-gray-400 mt-2">Gestiona usuarios y suscripciones de OptiScan</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadUsers}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button
              onClick={onLogout}
              variant="outline"
              className="bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gray-900/80 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Total Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Usuarios Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Eye className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.activeUsers}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Ingresos Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <CreditCard className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Análisis Realizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/20 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalAnalysis}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Próximos a Vencer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-yellow-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.expiringSoon}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Suscripciones Vencidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.expiredSubscriptions}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search, Filters and Export */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar usuario por nombre, email o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 bg-gray-900/80 backdrop-blur-xl border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-40 bg-gray-900/80 border-white/10">
                <SelectValue placeholder="Filtrar por plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los planes</SelectItem>
                <SelectItem value="free">Gratuito</SelectItem>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="pro">Profesional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 bg-gray-900/80 border-white/10">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={exportData}
            disabled={exporting}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {exporting ? 'Generando PDF...' : 'Exportar Datos'}
          </Button>
        </div>

        {/* Users Table */}
        <Card className="bg-gray-900/80 backdrop-blur-xl border-white/10 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl text-white">
              Usuarios Registrados ({filteredUsers.length})
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin inline" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Análisis</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Próximo Pago</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Días Restantes</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filteredUsers.map((user) => {
                    const subscriptionStatus = getSubscriptionStatus(user)
                    const daysRemaining = getDaysRemaining(user.subscription?.nextBilling)
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {user.name.charAt(0)}
                              {user.lastName.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white">
                                {user.name} {user.lastName}
                              </div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                              <div className="text-xs text-gray-400">{user.company}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {user.subscription ? getPlanName(user.subscription.plan) : "Sin plan"}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${user.subscription ? getPlanPrice(user.subscription.plan).toLocaleString() : 0}
                          </div>
                          <Select
                            value={user.subscription?.plan || "free"}
                            onValueChange={(value) => handleChangePlan(user.id, value)}
                            disabled={updatingUser === user.id}
                          >
                            <SelectTrigger className="w-full mt-1 bg-gray-800/50 border-gray-700">
                              <SelectValue placeholder="Cambiar plan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Gratuito</SelectItem>
                              <SelectItem value="basic">Básico ($19,000)</SelectItem>
                              <SelectItem value="pro">Profesional ($49,000)</SelectItem>
                              <SelectItem value="enterprise">Enterprise ($199,000)</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <Badge className={`w-fit ${user.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                              {user.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                            <Badge className={`w-fit ${getSubscriptionStatusColor(subscriptionStatus)}`}>
                              {subscriptionStatus}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{user.subscription?.analysisCount || 0}</div>
                          <div className="text-xs text-gray-500">
                            Límite: {user.subscription?.analysisLimit || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {formatDate(user.subscription?.nextBilling)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-300">
                            {daysRemaining > 0 ? `${daysRemaining} días` : daysRemaining === 0 ? "Hoy" : "Vencida"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRenewSubscription(user.id)}
                              disabled={updatingUser === user.id}
                              className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 border-blue-500/30"
                            >
                              {updatingUser === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-1" />
                                  Renovar
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(user.id)}
                              disabled={updatingUser === user.id}
                              className={`${user.isActive 
                                ? "bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-red-300 border-red-500/30" 
                                : "bg-green-600/20 text-green-400 hover:bg-green-600/30 hover:text-green-300 border-green-500/30"
                              }`}
                            >
                              {updatingUser === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : user.isActive ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-1" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-1" />
                                  Activar
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No se encontraron usuarios</p>
                </div>
              )}
              {loading && (
                <div className="text-center py-12">
                  <p className="text-gray-400">Cargando usuarios...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}