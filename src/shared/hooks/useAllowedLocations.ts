import { useAuth } from '../../app/providers/AuthContext';

/**
 * Retorna el ID de la sede a la que pertenece el usuario actual.
 *
 * - null      → acceso a TODAS las sedes (roles: super_admin, gerencia, sistemas)
 * - string[]  → solo puede operar con la sede definida en `users.location_id`
 *               (array vacío si no tiene una sede asignada)
 *
 * Regla: los roles de acceso total nunca tienen restricciones de sede.
 * El resto de roles están limitados a la sede de `users.location_id`,
 * replicando el comportamiento del módulo de cámaras.
 */

const FULL_ACCESS_ROLES = ['super_admin', 'gerencia', 'sistemas'];

export function useAllowedLocations(): string[] | null {
  const { user } = useAuth();
  if (!user) return [];

  // Roles con acceso total a todas las sedes → sin restricción
  if (FULL_ACCESS_ROLES.includes(user.role)) return null;

  const ids = new Set<string>();

  if (user.location_id) {
    ids.add(user.location_id);
  }

  return Array.from(ids);
}
