import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fwlmqstseeidtlqprdne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bG1xc3RzZWVpZHRscXByZG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQwODksImV4cCI6MjA3NzI1MDA4OX0.Oe1B5Tl6UtMXnmpk6xoct6WltD21eCD9wKT2x2Y_U0A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  console.log('Creando usuario administrador de prueba...');
  
  try {
    // Crear usuario con email/password
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@llaveo.com',
      password: 'admin123456',
      options: {
        data: {
          full_name: 'Administrador LLAVEO'
        }
      }
    });

    if (authError) {
      console.error('Error creando usuario:', authError);
      return;
    }

    if (authData.user) {
      console.log('Usuario creado:', authData.user.email);
      
      // Crear perfil con rol de administrador
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: 'Administrador LLAVEO',
          role: 'admin'
        });

      if (profileError) {
        console.error('Error creando perfil:', profileError);
      } else {
        console.log('Perfil de administrador creado exitosamente');
        console.log('Email: admin@llaveo.com');
        console.log('Password: admin123456');
        console.log('Rol: admin');
      }
    }
  } catch (error) {
    console.error('Error inesperado:', error);
  }
}

createAdminUser();
