// lib/services/userService.ts
import { userCRUD } from '@/lib/crud/userCrud';
import { authService } from '@/lib/services/authService';

export class UserService {
  // Obtener todos los usuarios (solo admin)
  public async getAllUsers(): Promise<{
    success: boolean;
    users?: any[];
    message?: string;
  }> {
    try {
      if (!authService.hasPermission('admin')) {
        return {
          success: false,
          message: 'No tienes permisos para acceder a esta función'
        };
      }

      const users = await userCRUD.getAllUsers();
      return {
        success: true,
        users: users.map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })
      };
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return {
        success: false,
        message: 'Error al obtener usuarios'
      };
    }
  }

  // Obtener usuario por ID
  public async getUserById(id: number): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    try {
      const currentUser = authService.isAdmin();
      const requestingOwnData = (await authService.verifySession()).user?.id === id;

      if (!currentUser && !requestingOwnData) {
        return {
          success: false,
          message: 'No tienes permisos para ver este usuario'
        };
      }

      const user = await userCRUD.getUserById(id);
      if (!user) {
        return {
          success: false,
          message: 'Usuario no encontrado'
        };
      }

      const { password, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword
      };
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      return {
        success: false,
        message: 'Error al obtener usuario'
      };
    }
  }

  // Actualizar usuario
  public async updateUser(id: number, userData: any): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    try {
      const currentUser = authService.isAdmin();
      const requestingOwnData = (await authService.verifySession()).user?.id === id;

      if (!currentUser && !requestingOwnData) {
        return {
          success: false,
          message: 'No tienes permisos para actualizar este usuario'
        };
      }

      if (!currentUser) {
        delete userData.role;
        delete userData.isActive;
        delete userData.subscription?.plan;
        delete userData.subscription?.status;
      }

      const updatedUser = await userCRUD.updateUser(id, userData);
      if (!updatedUser) {
        return {
          success: false,
          message: 'Error al actualizar usuario'
        };
      }

      const { password, ...userWithoutPassword } = updatedUser;
      return {
        success: true,
        user: userWithoutPassword
      };
    } catch (error: any) {
      console.error('Error al actualizar usuario:', error);
      return {
        success: false,
        message: error.message || 'Error al actualizar usuario'
      };
    }
  }

  // Activar/desactivar usuario (solo admin)
  public async toggleUserStatus(id: number): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      if (!authService.hasPermission('admin')) {
        return {
          success: false,
          message: 'No tienes permisos para esta acción'
        };
      }

      const user = await userCRUD.toggleUserStatus(id);
      if (!user) {
        return {
          success: false,
          message: 'Usuario no encontrado'
        };
      }

      return {
        success: true,
        message: `Usuario ${user.isActive ? 'activado' : 'desactivado'} correctamente`
      };
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      return {
        success: false,
        message: 'Error al cambiar estado del usuario'
      };
    }
  }

  // Cambiar plan de suscripción (solo admin)
  public async changeUserPlan(id: number, newPlan: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      if (!authService.hasPermission('admin')) {
        return {
          success: false,
          message: 'No tienes permisos para esta acción'
        };
      }

      const user = await userCRUD.changePlan(id, newPlan as any);
      if (!user) {
        return {
          success: false,
          message: 'Usuario no encontrado'
        };
      }

      return {
        success: true,
        message: `Plan cambiado a ${newPlan} correctamente`
      };
    } catch (error) {
      console.error('Error al cambiar plan:', error);
      return {
        success: false,
        message: 'Error al cambiar plan'
      };
    }
  }

  // Buscar usuarios (solo admin)
  public async searchUsers(query: string): Promise<{
    success: boolean;
    users?: any[];
    message?: string;
  }> {
    try {
      if (!authService.hasPermission('admin')) {
        return {
          success: false,
          message: 'No tienes permisos para esta acción'
        };
      }

      const users = await userCRUD.searchUsers(query);
      return {
        success: true,
        users: users.map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })
      };
    } catch (error) {
      console.error('Error al buscar usuarios:', error);
      return {
        success: false,
        message: 'Error al buscar usuarios'
      };
    }
  }

  // Obtener estadísticas (solo admin)
  public async getStats(): Promise<{
    success: boolean;
    stats?: any;
    message?: string;
  }> {
    try {
      if (!authService.hasPermission('admin')) {
        return {
          success: false,
          message: 'No tienes permisos para esta acción'
        };
      }

      const stats = await userCRUD.getStats();
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        success: false,
        message: 'Error al obtener estadísticas'
      };
    }
  }

  // Obtener usuarios con filtros (solo admin)
  public async getUsersWithFilters(filters: any): Promise<{
    success: boolean;
    users?: any[];
    message?: string;
  }> {
    try {
      if (!authService.hasPermission('admin')) {
        return {
          success: false,
          message: 'No tienes permisos para esta acción'
        };
      }

      const users = await userCRUD.getUsersWithFilters(filters);
      return {
        success: true,
        users: users.map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })
      };
    } catch (error) {
      console.error('Error al obtener usuarios con filtros:', error);
      return {
        success: false,
        message: 'Error al obtener usuarios'
      };
    }
  }
}

// Instancia única del servicio de usuarios
export const userService = new UserService();