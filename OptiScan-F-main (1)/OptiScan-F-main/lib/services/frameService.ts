// lib/services/frameService.ts
import { frameCRUD } from "@/lib/crud/frameCrud";

export class FrameService {
  // Obtener marcos del usuario actual
  public async getUserFrames(userId: number): Promise<{
    success: boolean;
    frames?: any[];
    message?: string;
  }> {
    try {
      const frames = await frameCRUD.getFramesByUser(userId);
      return {
        success: true,
        frames,
      };
    } catch (error) {
      console.error("Error al obtener marcos:", error);
      return {
        success: false,
        message: "Error al obtener marcos",
      };
    }
  }

  // Obtener marcos activos del usuario
  public async getActiveFrames(userId: number): Promise<{
    success: boolean;
    frames?: any[];
    message?: string;
  }> {
    try {
      const frames = await frameCRUD.getActiveFramesByUser(userId);
      return {
        success: true,
        frames,
      };
    } catch (error) {
      console.error("Error al obtener marcos activos:", error);
      return {
        success: false,
        message: "Error al obtener marcos activos",
      };
    }
  }

  // Función auxiliar para limpiar y convertir valores de medidas
  private cleanMeasurementValues(frameData: any): any {
    const cleanedData = { ...frameData };
    
    // Lista de campos de medidas que pueden ser null
    const measurementFields = ['width_mm', 'height_mm', 'bridge_mm', 'temple_mm'];
    
    measurementFields.forEach(field => {
      if (frameData[field] !== undefined && frameData[field] !== null) {
        // Si es string vacío, convertir a null
        if (frameData[field] === '') {
          cleanedData[field] = null;
        } 
        // Si es string numérico, convertir a número
        else if (typeof frameData[field] === 'string') {
          const num = parseFloat(frameData[field]);
          cleanedData[field] = isNaN(num) ? null : num;
        }
        // Si ya es número, mantenerlo
        else if (typeof frameData[field] === 'number') {
          cleanedData[field] = frameData[field];
        }
        // Para cualquier otro caso, null
        else {
          cleanedData[field] = null;
        }
      } else {
        // Si es undefined o null, mantener como null
        cleanedData[field] = null;
      }
    });

    console.log('🧹 Datos limpiados en frameService:', cleanedData);
    return cleanedData;
  }

  // Crear nuevo marco
  public async createFrame(
    userId: number,
    frameData: any,
  ): Promise<{
    success: boolean;
    frame?: any;
    message?: string;
    error?: string;
    validationErrors?: any[];
  }> {
    try {
      console.log("🛠️ FrameService.createFrame - userId:", userId);
      console.log("🛠️ FrameService.createFrame - frameData original:", frameData);

      // Limpiar los valores de medidas antes de validar
      const cleanedFrameData = this.cleanMeasurementValues(frameData);
      console.log("🛠️ FrameService.createFrame - frameData limpiado:", cleanedFrameData);

      // Validaciones adicionales
      const validationErrors = [];

      if (!cleanedFrameData.name || cleanedFrameData.name.trim() === '') {
        validationErrors.push({
          field: "name",
          message: "El nombre es obligatorio",
        });
      }

      if (!cleanedFrameData.style || cleanedFrameData.style.trim() === '') {
        validationErrors.push({
          field: "style",
          message: "El estilo/tipo de rostro es obligatorio",
        });
      }

      if (validationErrors.length > 0) {
        return {
          success: false,
          message: "Errores de validación",
          validationErrors,
        };
      }

      // Asegurar que los valores booleanos sean correctos
      cleanedFrameData.is_active = cleanedFrameData.is_active !== undefined 
        ? Boolean(cleanedFrameData.is_active) 
        : true;

      // Asegurar que los valores string estén limpios
      cleanedFrameData.description = cleanedFrameData.description || '';
      cleanedFrameData.price = cleanedFrameData.price || '';
      cleanedFrameData.image_url = cleanedFrameData.image_url || '';
      cleanedFrameData.purchase_link = cleanedFrameData.purchase_link || '';

      const frame = await frameCRUD.createFrame(userId, cleanedFrameData);

      console.log("✅ FrameService.createFrame - Resultado exitoso:", frame);

      return {
        success: true,
        frame,
      };
    } catch (error: any) {
      console.error("❌ Error en FrameService.createFrame:", error);
      console.error("❌ Stack trace:", error.stack);

      // Determinar el tipo de error
      let errorMessage = error.message || "Error al crear marco";

      // Si es un error de base de datos, dar más detalles
      if (error.code) {
        console.error("❌ Error code:", error.code);
        console.error("❌ Error detail:", error.detail);
        console.error("❌ Error hint:", error.hint);
        
        // Mapear errores comunes de PostgreSQL
        if (error.code === '22P02') {
          errorMessage = "Error en el formato de los datos. Asegúrate de que las medidas sean números válidos.";
        } else if (error.code === '23502') {
          errorMessage = "Faltan campos obligatorios en la base de datos.";
        }
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message,
        details:
          process.env.NODE_ENV === "development"
            ? {
                code: error.code,
                detail: error.detail,
                hint: error.hint,
                stack: error.stack,
              }
            : undefined,
      };
    }
  }

  // Actualizar marco
  public async updateFrame(
    frameId: string,
    userId: number,
    frameData: any,
  ): Promise<{
    success: boolean;
    frame?: any;
    message?: string;
  }> {
    try {
      console.log(`🛠️ FrameService.updateFrame - frameId: ${frameId}, userId: ${userId}`);
      console.log("🛠️ FrameService.updateFrame - frameData original:", frameData);

      // Limpiar los valores de medidas antes de procesar
      const cleanedFrameData = this.cleanMeasurementValues(frameData);
      console.log("🛠️ FrameService.updateFrame - frameData limpiado:", cleanedFrameData);

      // Validaciones
      if (!cleanedFrameData.name || cleanedFrameData.name.trim() === '') {
        return {
          success: false,
          message: "El nombre del marco es obligatorio",
        };
      }

      if (!cleanedFrameData.style || cleanedFrameData.style.trim() === '') {
        return {
          success: false,
          message: "El estilo/tipo de rostro es obligatorio",
        };
      }

      // Asegurar que los valores booleanos sean correctos
      if (cleanedFrameData.is_active !== undefined) {
        cleanedFrameData.is_active = Boolean(cleanedFrameData.is_active);
      }

      const frame = await frameCRUD.updateFrame(frameId, userId, cleanedFrameData);
      
      if (!frame) {
        return {
          success: false,
          message: "Marco no encontrado o no tienes permisos",
        };
      }

      console.log("✅ FrameService.updateFrame - Resultado exitoso:", frame);

      return {
        success: true,
        frame,
      };
    } catch (error: any) {
      console.error("❌ Error en FrameService.updateFrame:", error);
      console.error("❌ Stack trace:", error.stack);

      // Determinar el tipo de error
      let errorMessage = error.message || "Error al actualizar marco";

      // Si es un error de base de datos, dar más detalles
      if (error.code) {
        console.error("❌ Error code:", error.code);
        console.error("❌ Error detail:", error.detail);
        console.error("❌ Error hint:", error.hint);
        
        // Mapear errores comunes de PostgreSQL
        if (error.code === '22P02') {
          errorMessage = "Error en el formato de los datos. Asegúrate de que las medidas sean números válidos.";
        }
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message,
      };
    }
  }

  // Eliminar marco
  public async deleteFrame(
    frameId: string,
    userId: number,
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const deleted = await frameCRUD.deleteFrame(frameId, userId);
      if (!deleted) {
        return {
          success: false,
          message: "Marco no encontrado o no tienes permisos",
        };
      }

      return {
        success: true,
        message: "Marco eliminado correctamente",
      };
    } catch (error) {
      console.error("Error al eliminar marco:", error);
      return {
        success: false,
        message: "Error al eliminar marco",
      };
    }
  }

  // Activar/desactivar marco
  public async toggleFrameStatus(
    frameId: string,
    userId: number,
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const frame = await frameCRUD.toggleFrameStatus(frameId, userId);
      if (!frame) {
        return {
          success: false,
          message: "Marco no encontrado o no tienes permisos",
        };
      }

      return {
        success: true,
        message: `Marco ${frame.isActive ? "activado" : "desactivado"} correctamente`,
      };
    } catch (error) {
      console.error("Error al cambiar estado del marco:", error);
      return {
        success: false,
        message: "Error al cambiar estado del marco",
      };
    }
  }

  // Buscar marcos
  public async searchFrames(
    userId: number,
    query: string,
  ): Promise<{
    success: boolean;
    frames?: any[];
    message?: string;
  }> {
    try {
      const frames = await frameCRUD.searchFrames(userId, query);
      return {
        success: true,
        frames,
      };
    } catch (error) {
      console.error("Error al buscar marcos:", error);
      return {
        success: false,
        message: "Error al buscar marcos",
      };
    }
  }

  // Obtener estadísticas de marcos
  public async getFrameStats(userId: number): Promise<{
    success: boolean;
    stats?: any;
    message?: string;
  }> {
    try {
      const stats = await frameCRUD.getFrameStats(userId);
      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("Error al obtener estadísticas de marcos:", error);
      return {
        success: false,
        message: "Error al obtener estadísticas",
      };
    }
  }
}

// Instancia única del servicio de marcos
export const frameService = new FrameService();