const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwlmqstseeidtlqprdne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bG1xc3RzZWVpZHRscXByZG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQwODksImV4cCI6MjA3NzI1MDA4OX0.Oe1B5Tl6UtMXnmpk6xoct6WltD21eCD9wKT2x2Y_U0A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('Creating database tables...');
  
  try {
    // Insert sample properties directly
    const properties = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Apartamento en el centro de Madrid',
        description: 'Hermoso apartamento en el corazón de Madrid con vistas espectaculares',
        price: 350000,
        city: 'Madrid',
        address: 'Calle Gran Vía, 123',
        rooms: 3,
        baths: 2,
        area_m2: 85,
        status: 'venta',
        is_active: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        title: 'Casa con jardín en Barcelona',
        description: 'Casa familiar con jardín privado en zona residencial',
        price: 450000,
        city: 'Barcelona',
        address: 'Carrer de la Pau, 45',
        rooms: 4,
        baths: 3,
        area_m2: 120,
        status: 'venta',
        is_active: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        title: 'Piso moderno en Valencia',
        description: 'Apartamento completamente reformado con acabados de lujo',
        price: 280000,
        city: 'Valencia',
        address: 'Calle Colón, 67',
        rooms: 2,
        baths: 2,
        area_m2: 75,
        status: 'venta',
        is_active: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        title: 'Estudio en Sevilla',
        description: 'Estudio perfecto para jóvenes profesionales',
        price: 150000,
        city: 'Sevilla',
        address: 'Calle Sierpes, 89',
        rooms: 1,
        baths: 1,
        area_m2: 45,
        status: 'venta',
        is_active: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        title: 'Chalet en Bilbao',
        description: 'Chalet independiente con garaje y jardín',
        price: 380000,
        city: 'Bilbao',
        address: 'Calle Iparraguirre, 12',
        rooms: 5,
        baths: 4,
        area_m2: 180,
        status: 'venta',
        is_active: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        title: 'Ático en Málaga',
        description: 'Ático con terraza privada y vistas al mar',
        price: 320000,
        city: 'Málaga',
        address: 'Paseo de la Farola, 34',
        rooms: 3,
        baths: 2,
        area_m2: 95,
        status: 'venta',
        is_active: true
      }
    ];

    // Insert properties
    const { data: insertedProperties, error: propertiesError } = await supabase
      .from('properties')
      .insert(properties);

    if (propertiesError) {
      console.error('Error inserting properties:', propertiesError);
    } else {
      console.log('Properties inserted successfully:', insertedProperties?.length || properties.length);
    }

    // Insert property images
    const images = [
      { property_id: '550e8400-e29b-41d4-a716-446655440001', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop', sort_order: 0 },
      { property_id: '550e8400-e29b-41d4-a716-446655440001', url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop', sort_order: 1 },
      { property_id: '550e8400-e29b-41d4-a716-446655440002', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop', sort_order: 0 },
      { property_id: '550e8400-e29b-41d4-a716-446655440002', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop', sort_order: 1 },
      { property_id: '550e8400-e29b-41d4-a716-446655440003', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop', sort_order: 0 },
      { property_id: '550e8400-e29b-41d4-a716-446655440004', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop', sort_order: 0 },
      { property_id: '550e8400-e29b-41d4-a716-446655440005', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop', sort_order: 0 },
      { property_id: '550e8400-e29b-41d4-a716-446655440006', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop', sort_order: 0 }
    ];

    const { data: insertedImages, error: imagesError } = await supabase
      .from('property_images')
      .insert(images);

    if (imagesError) {
      console.error('Error inserting images:', imagesError);
    } else {
      console.log('Images inserted successfully:', insertedImages?.length || images.length);
    }

    console.log('Database setup completed!');
    
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

createTables();
