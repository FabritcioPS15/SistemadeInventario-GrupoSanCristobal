import { supabase } from '../lib/supabase';

// Script para agregar la columna password a la tabla users
export async function addPasswordColumn() {
  try {
    
    // Ejecutar la migración SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;'
    });

    if (error) {
      console.error('❌ Error agregando columna password:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    return false;
  }
}

// Función alternativa usando SQL directo
export async function addPasswordColumnDirect() {
  try {
    
    // Intentar agregar la columna directamente
    const { error } = await supabase
      .from('users')
      .select('password')
      .limit(1);

    if (error && error.message.includes('column "password" does not exist')) {
      return false;
    }

    return true;
  } catch (err) {
    console.error('❌ Error verificando columna:', err);
    return false;
  }
}

// Función para ejecutar desde la consola del navegador
(window as any).addPasswordColumn = addPasswordColumnDirect;

