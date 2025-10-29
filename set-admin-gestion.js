// Script para verificar y actualizar el usuario gestion@llaveo.pro a administrador
// Ejecutar con: node set-admin-gestion.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fwlmqstseeidtlqprdne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bG1xc3RzZWVpZHRscXByZG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQwODksImV4cCI6MjA3NzI1MDA4OX0.Oe1B5Tl6UtMXnmpk6xoct6WltD21eCD9wKT2x2Y_U0A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAndSetAdmin() {
  console.log('🔍 Verificando usuario gestion@llaveo.pro...\n');
  
  try {
    // Intentar buscar el perfil directamente
    // Primero necesitamos encontrar el ID del usuario
    // Como no podemos consultar auth.users directamente sin service_role,
    // vamos a intentar buscar perfiles que puedan corresponder
    
    // Opción 1: Si el usuario ya tiene un perfil, actualizarlo
    // Necesitamos buscar primero el usuario autenticado o usar SQL directo
    
    console.log('⚠️  Nota: Este script necesita ejecutarse con autenticación.');
    console.log('📋 Para hacer administrador a gestion@llaveo.pro, ejecuta el SQL en Supabase Dashboard:\n');
    console.log('-- Ejecutar en Supabase Dashboard > SQL Editor');
    console.log('');
    console.log('UPDATE public.profiles');
    console.log('SET role = \'admin\'');
    console.log('WHERE id IN (');
    console.log('  SELECT id FROM auth.users WHERE email = \'gestion@llaveo.pro\'');
    console.log(');');
    console.log('');
    console.log('-- Si el perfil no existe, crearlo:');
    console.log('INSERT INTO public.profiles (id, full_name, role)');
    console.log('SELECT ');
    console.log('  id,');
    console.log('  \'Gestión LLAVEO\',');
    console.log('  \'admin\'');
    console.log('FROM auth.users');
    console.log('WHERE email = \'gestion@llaveo.pro\'');
    console.log('AND NOT EXISTS (');
    console.log('  SELECT 1 FROM public.profiles WHERE id = auth.users.id');
    console.log(')');
    console.log('ON CONFLICT (id) DO UPDATE SET role = \'admin\';');
    console.log('');
    console.log('-- Verificar resultado:');
    console.log('SELECT ');
    console.log('  u.email,');
    console.log('  p.role,');
    console.log('  p.full_name,');
    console.log('  CASE ');
    console.log('    WHEN p.role = \'admin\' THEN \'✅ Es administrador\'');
    console.log('    ELSE \'❌ No es administrador\'');
    console.log('  END as status');
    console.log('FROM auth.users u');
    console.log('LEFT JOIN public.profiles p ON u.id = p.id');
    console.log('WHERE u.email = \'gestion@llaveo.pro\';');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyAndSetAdmin();
