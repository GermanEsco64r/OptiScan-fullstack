// lib/crud/frameCrud.ts
import { SecurityService } from "@/lib/security/auth";
import pool from "@/lib/database/pool";

// Interfaz para marcos
export interface Frame {
  id: string;
  userId: number;
  name: string;
  style: string;
  description: string;
  price: string;
  imageUrl: string;
  purchaseLink: string;
  isActive: boolean;
  measurements: {
    width: string | null;
    height: string | null;
    bridge: string | null;
    temple: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Clase CRUD para marcos con PostgreSQL
export class FrameCRUD {
  private securityService: SecurityService;

  constructor() {
    this.securityService = SecurityService.getInstance();
  }

  // Función auxiliar para convertir valores a número o null
  private parseMeasurement(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  // Crear nuevo marco
  public async createFrame(userId: number, frameData: any): Promise<any> {
    try {
      console.log("🗄️ FrameCRUD.createFrame - Iniciando...");
      console.log("🗄️ userId:", userId);
      console.log("🗄️ frameData recibido:", frameData);

      const {
        name,
        style,
        description,
        price,
        image_url,
        purchase_link,
        is_active,
        width_mm,
        height_mm,
        bridge_mm,
        temple_mm,
      } = frameData;

      // Validar datos requeridos
      if (!name || name.trim() === '') {
        throw new Error("El nombre es un campo requerido");
      }

      if (!style || style.trim() === '') {
        throw new Error("El estilo/tipo de rostro es un campo requerido");
      }

      const query = `
        INSERT INTO frames (
          user_id, 
          name, 
          style, 
          description, 
          price, 
          image_url, 
          purchase_link, 
          is_active,
          width_mm,
          height_mm,
          bridge_mm,
          temple_mm,
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        userId,
        name.trim(),
        style.trim(),
        description || null,
        price || null,
        image_url || null,
        purchase_link || null,
        Boolean(is_active),
        // Usar la función parseMeasurement para manejar valores null
        this.parseMeasurement(width_mm),
        this.parseMeasurement(height_mm),
        this.parseMeasurement(bridge_mm),
        this.parseMeasurement(temple_mm),
      ];

      console.log("🗄️ Query a ejecutar:", query);
      console.log("🗄️ Valores:", values);

      const result = await pool.query(query, values);

      console.log(
        "✅ FrameCRUD.createFrame - Éxito. Filas insertadas:",
        result.rows.length,
      );
      console.log("✅ Frame creado:", result.rows[0]);

      return result.rows[0];
    } catch (error: any) {
      console.error("❌ Error en FrameCRUD.createFrame:");
      console.error("❌ Mensaje:", error.message);
      console.error("❌ Código:", error.code);
      console.error("❌ Detalle:", error.detail);
      console.error("❌ Tabla:", error.table);
      console.error("❌ Columna:", error.column);
      console.error("❌ Restricción:", error.constraint);
      console.error("❌ Stack:", error.stack);

      throw error;
    }
  }

  // Obtener marco por ID
  public async getFrameById(id: string): Promise<Frame | null> {
    try {
      const query = `
        SELECT * FROM frames WHERE id = $1
      `;
      const result = await pool.query(query, [parseInt(id)]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return this.mapRowToFrame(row);
    } catch (error) {
      console.error("Error en getFrameById:", error);
      throw error;
    }
  }

  // Obtener marcos por usuario
  public async getFramesByUser(userId: number): Promise<any[]> {
    try {
      const query = `
        SELECT 
          id, 
          user_id, 
          name, 
          style, 
          description, 
          price, 
          image_url,
          purchase_link,
          is_active,
          width_mm,
          height_mm,
          bridge_mm,
          temple_mm,
          created_at, 
          updated_at
        FROM frames 
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;

      const result = await pool.query(query, [userId]);
      console.log(
        `📊 FrameCRUD.getFramesByUser - Encontrados ${result.rows.length} marcos para usuario ${userId}`,
      );

      if (result.rows.length > 0) {
        console.log(
          "📊 Primer marco encontrado:",
          JSON.stringify(result.rows[0], null, 2),
        );
      }

      return result.rows.map(row => this.mapRowToFrame(row));
    } catch (error) {
      console.error("Error al obtener marcos por usuario:", error);
      throw error;
    }
  }

  // Obtener marcos activos por usuario
  public async getActiveFramesByUser(userId: number): Promise<Frame[]> {
    try {
      const query = `
        SELECT * FROM frames 
        WHERE user_id = $1 AND is_active = true 
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows.map(row => this.mapRowToFrame(row));
    } catch (error) {
      console.error("Error en getActiveFramesByUser:", error);
      throw error;
    }
  }

  // Mapear fila de la base de datos a objeto Frame
  private mapRowToFrame(row: any): Frame {
    // Función auxiliar para convertir valores numéricos a string o null
    const parseMeasurementToString = (value: any): string | null => {
      if (value === null || value === undefined) {
        return null;
      }
      return String(value);
    };

    return {
      id: String(row.id),
      userId: row.user_id,
      name: row.name,
      style: row.style,
      description: row.description || '',
      price: row.price || '',
      imageUrl: row.image_url || '',
      purchaseLink: row.purchase_link || '',
      isActive: row.is_active,
      measurements: {
        width: parseMeasurementToString(row.width_mm),
        height: parseMeasurementToString(row.height_mm),
        bridge: parseMeasurementToString(row.bridge_mm),
        temple: parseMeasurementToString(row.temple_mm),
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Actualizar marco
  public async updateFrame(
    id: string,
    userId: number,
    updateData: any,
  ): Promise<any> {
    const client = await pool.connect();
    try {
      console.log(`🗄️ FrameCRUD.updateFrame - Iniciando para frame ${id}`);
      console.log(`🗄️ userId: ${userId}`);
      console.log(`🗄️ updateData recibido:`, updateData);

      // Validar que el marco exista y pertenezca al usuario
      const checkQuery = `
        SELECT id FROM frames WHERE id = $1 AND user_id = $2
      `;
      const checkResult = await client.query(checkQuery, [parseInt(id), userId]);
      
      if (checkResult.rows.length === 0) {
        console.log(`❌ Marco ${id} no encontrado o no pertenece al usuario ${userId}`);
        return null;
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Construir dinámicamente la consulta
      if (updateData.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(updateData.name.trim());
        paramIndex++;
      }
      
      if (updateData.style !== undefined) {
        updates.push(`style = $${paramIndex}`);
        values.push(updateData.style.trim());
        paramIndex++;
      }
      
      if (updateData.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(updateData.description || null);
        paramIndex++;
      }
      
      if (updateData.price !== undefined) {
        updates.push(`price = $${paramIndex}`);
        values.push(updateData.price || null);
        paramIndex++;
      }
      
      if (updateData.image_url !== undefined) {
        updates.push(`image_url = $${paramIndex}`);
        values.push(updateData.image_url || null);
        paramIndex++;
      }
      
      if (updateData.purchase_link !== undefined) {
        updates.push(`purchase_link = $${paramIndex}`);
        values.push(updateData.purchase_link || null);
        paramIndex++;
      }
      
      if (updateData.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(Boolean(updateData.is_active));
        paramIndex++;
      }

      // Manejar medidas
      if (updateData.width_mm !== undefined) {
        updates.push(`width_mm = $${paramIndex}`);
        values.push(this.parseMeasurement(updateData.width_mm));
        paramIndex++;
      }
      
      if (updateData.height_mm !== undefined) {
        updates.push(`height_mm = $${paramIndex}`);
        values.push(this.parseMeasurement(updateData.height_mm));
        paramIndex++;
      }
      
      if (updateData.bridge_mm !== undefined) {
        updates.push(`bridge_mm = $${paramIndex}`);
        values.push(this.parseMeasurement(updateData.bridge_mm));
        paramIndex++;
      }
      
      if (updateData.temple_mm !== undefined) {
        updates.push(`temple_mm = $${paramIndex}`);
        values.push(this.parseMeasurement(updateData.temple_mm));
        paramIndex++;
      }

      if (updates.length === 0) {
        console.log("⚠️ No hay campos para actualizar");
        return await this.getFrameById(id);
      }

      // Agregar updated_at
      updates.push(`updated_at = NOW()`);

      // Agregar condiciones WHERE
      values.push(parseInt(id), userId);

      const query = `
        UPDATE frames 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      console.log("🗄️ Query de actualización:", query);
      console.log("🗄️ Valores de actualización:", values);

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        console.log(`❌ No se pudo actualizar el marco ${id}`);
        return null;
      }

      console.log("✅ FrameCRUD.updateFrame - Marco actualizado exitosamente");
      return this.mapRowToFrame(result.rows[0]);
    } catch (error: any) {
      console.error("❌ Error en FrameCRUD.updateFrame:");
      console.error("❌ Mensaje:", error.message);
      console.error("❌ Stack:", error.stack);
      throw error;
    } finally {
      client.release();
    }
  }

  // Eliminar marco
  public async deleteFrame(id: string, userId: number): Promise<boolean> {
    try {
      const query = `
        DELETE FROM frames 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      const result = await pool.query(query, [parseInt(id), userId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Error en deleteFrame:", error);
      throw error;
    }
  }

  // Activar/desactivar marco
  public async toggleFrameStatus(
    id: string,
    userId: number,
  ): Promise<any | null> {
    try {
      const query = `
        UPDATE frames 
        SET is_active = NOT is_active, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await pool.query(query, [parseInt(id), userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToFrame(result.rows[0]);
    } catch (error) {
      console.error("Error en toggleFrameStatus:", error);
      throw error;
    }
  }

  // Buscar marcos por nombre o estilo
  public async searchFrames(userId: number, query: string): Promise<Frame[]> {
    try {
      const searchQuery = `
        SELECT * FROM frames 
        WHERE user_id = $1 AND (
          LOWER(name) LIKE LOWER($2) OR 
          LOWER(style) LIKE LOWER($2) OR
          LOWER(description) LIKE LOWER($2)
        )
        ORDER BY created_at DESC
      `;

      const result = await pool.query(searchQuery, [userId, `%${query}%`]);
      return result.rows.map(row => this.mapRowToFrame(row));
    } catch (error) {
      console.error("Error en searchFrames:", error);
      throw error;
    }
  }

  // Obtener estadísticas de marcos
  public async getFrameStats(userId: number): Promise<{
    totalFrames: number;
    activeFrames: number;
    inactiveFrames: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
        FROM frames 
        WHERE user_id = $1
      `;

      const result = await pool.query(query, [userId]);
      const row = result.rows[0];

      return {
        totalFrames: parseInt(row.total) || 0,
        activeFrames: parseInt(row.active) || 0,
        inactiveFrames: parseInt(row.inactive) || 0,
      };
    } catch (error) {
      console.error("Error en getFrameStats:", error);
      throw error;
    }
  }
}

// Instancia única del CRUD de marcos
export const frameCRUD = new FrameCRUD();