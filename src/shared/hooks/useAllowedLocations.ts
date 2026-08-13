import { useAuth } from '../../app/providers/AuthContext';

/**
 * Retorna los IDs de sedes a los que tiene acceso el usuario actual.
 * - null => acceso a todas las sedes (super admin o sin restricción)
 * - string[] => solo puede operar con estas sedes
 */
export function useAllowedLocations(): string[] | null {
  const { user } = useAuth();
  if (!user) return null;
  const ids = user.location_ids;
  return ids && ids.length > 0 ? ids : null;
}
