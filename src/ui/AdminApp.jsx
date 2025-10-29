import React from 'react';
import { Refine } from '@refinedev/core';
import { Layout } from 'antd';
import 'antd/dist/reset.css';
import { supabase } from '../lib/supabase.js';
import { hydrateClientFromServerSession } from '../lib/session-sync.js';
import { PropertiesList, PropertiesCreate, PropertiesEdit } from './resources/properties.jsx';
import { InquiriesList } from './resources/inquiries.jsx';

// Error Boundary para capturar errores de React
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '24px', 
          textAlign: 'center',
          minHeight: '100vh',
          background: '#F7FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h2 style={{ color: '#1A202C', marginBottom: '16px' }}>Error al cargar el panel</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>{this.state.error?.message || 'Ha ocurrido un error'}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '16px', 
              padding: '12px 24px', 
              cursor: 'pointer',
              background: '#EB9561',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '500'
            }}
          >
            Recargar página
          </button>
          <details style={{ marginTop: '24px', textAlign: 'left', maxWidth: '600px' }}>
            <summary style={{ cursor: 'pointer', color: '#666' }}>Detalles del error</summary>
            <pre style={{ 
              background: '#f0f0f0', 
              padding: '16px', 
              borderRadius: '8px', 
              overflow: 'auto',
              marginTop: '8px',
              fontSize: '12px'
            }}>
              {this.state.error?.stack || String(this.state.error)}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// Componente que renderiza las rutas de Refine basándose en la URL
function RefineRoutes() {
  const [resource, setResource] = React.useState('properties');
  const [action, setAction] = React.useState('list');

  React.useEffect(() => {
    // Leer de la URL (hash routing de Refine)
    const hash = window.location.hash;
    const match = hash.match(/#\/([^\/]+)(?:\/([^\/]+))?/);
    
    if (match) {
      const [, res, act] = match;
      setResource(res || 'properties');
      setAction(act || 'list');
    } else {
      // Si no hay hash, ir a properties por defecto
      window.location.hash = '#/properties';
    }

    // Escuchar cambios en el hash
    const handleHashChange = () => {
      const newHash = window.location.hash;
      const newMatch = newHash.match(/#\/([^\/]+)(?:\/([^\/]+))?/);
      if (newMatch) {
        const [, res, act] = newMatch;
        setResource(res || 'properties');
        setAction(act || 'list');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  try {
    if (resource === 'properties') {
      if (action === 'create') return <PropertiesCreate />;
      if (action === 'edit') return <PropertiesEdit />;
      return <PropertiesList />;
    }

    if (resource === 'inquiries') {
      return <InquiriesList />;
    }

    // Por defecto, mostrar properties list
    return <PropertiesList />;
  } catch (error) {
    console.error('Error en RefineRoutes:', error);
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h3 style={{ color: '#1A202C', marginBottom: '16px' }}>Error al cargar la vista</h3>
        <p style={{ color: '#666', marginBottom: '24px' }}>{error?.message || 'Error desconocido'}</p>
        <button 
          onClick={() => window.location.hash = '#/properties'} 
          style={{ 
            marginTop: '16px', 
            padding: '12px 24px',
            background: '#EB9561',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Volver a Propiedades
        </button>
      </div>
    );
  }
}

function AuthGate({ children }) {
  // Iniciar como false para evitar renderizar contenido antes de verificar autenticación
  const [ready, setReady] = React.useState(false);
  const [user, setUser] = React.useState(null);
  
  React.useEffect(() => {
    let active = true;

    // Verificar autenticación antes de mostrar contenido
    const initAuth = async () => {
      try {
        await hydrateClientFromServerSession(supabase);
        const { data } = await supabase.auth.getSession();
        if (active) {
          setUser(data.session?.user ?? null);
          setReady(true); // Solo marcar como ready después de verificar
        }
      } catch (error) {
        console.error('Error inicializando autenticación:', error);
        // Intentar obtener la sesión local como fallback
        try {
          const { data } = await supabase.auth.getSession();
          if (active) {
            setUser(data.session?.user ?? null);
            setReady(true);
          }
        } catch (e) {
          console.error('Error obteniendo sesión local:', e);
          // Aún así, marcar como ready para mostrar el login
          if (active) {
            setUser(null);
            setReady(true);
          }
        }
      }
    };

    // Cargar auth inmediatamente (no en background)
    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active) {
        setUser(session?.user ?? null);
        setReady(true);
      }
    });

    return () => {
      active = false;
      listener?.subscription.unsubscribe();
    };
  }, []);
  
  // Mostrar spinner de carga mientras se verifica autenticación
  if (!ready) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#F7FAFC'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E2E8F0',
            borderTop: '4px solid #EB9561',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#718096', fontSize: '14px' }}>Cargando...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#F7FAFC',
        position: 'relative',
        zIndex: 10,
        width: '100%'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #E2E8F0',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          margin: '0 16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              background: '#EB9561'
            }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '24px' }}>L</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#1A202C' }}>
              Panel de Administración
            </h1>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              Accede con tu cuenta de Google para gestionar las propiedades
            </p>
            <button
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'white',
                background: '#EB9561',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                e.target.style.transform = 'translateY(0)';
              }}
              onClick={() => supabase.auth.signInWithOAuth({ 
                provider: 'google', 
                options: { 
                  queryParams: { hd: import.meta.env.PUBLIC_ALLOWED_GOOGLE_DOMAIN } 
                }
              })}
            >
              Entrar con Google
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', background: '#F7FAFC', width: '100%' }}>
      {children}
    </div>
  );
}

export default function AdminApp() {
  const handleSignOut = React.useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'same-origin'
      });
    } catch (apiError) {
      console.error('Error al limpiar la sesión del servidor:', apiError);
    }

    if (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión');
    }
  }, []);

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', background: '#F7FAFC', position: 'relative', zIndex: 1 }}>
        <AuthGate>
          <Refine
          resources={[
            { name: 'properties' },
            { name: 'inquiries' },
          ]}
          options={{ syncWithLocation: true }}
        dataProvider={{
          default: {
            getList: async ({ resource, pagination, sorters, filters, meta }) => {
              let query = supabase.from(resource);
              
              // Para consultas, incluir información de la propiedad
              if (resource === 'inquiries') {
                query = query.select(`
                  *,
                  property:properties(title, id)
                `);
              } else if (resource === 'properties') {
                // Para propiedades, incluir imágenes
                query = query.select(`
                  *,
                  property_images(url, sort_order, id)
                `);
              } else {
                query = query.select('*');
              }
              
              if (pagination) {
                const { current = 1, pageSize = 10 } = pagination;
                query = query.range((current - 1) * pageSize, current * pageSize - 1);
              }
              
              if (sorters && sorters.length > 0) {
                const sorter = sorters[0];
                query = query.order(sorter.field, { ascending: sorter.order === 'asc' });
              } else if (resource === 'inquiries') {
                query = query.order('created_at', { ascending: false });
              } else if (resource === 'properties') {
                query = query.order('created_at', { ascending: false });
              }
              
              // Aplicar filtros si existen
              if (filters && filters.length > 0) {
                filters.forEach(filter => {
                  if (filter.operator === 'eq') {
                    query = query.eq(filter.field, filter.value);
                  } else if (filter.operator === 'ne') {
                    query = query.neq(filter.field, filter.value);
                  } else if (filter.operator === 'gte') {
                    query = query.gte(filter.field, filter.value);
                  } else if (filter.operator === 'lte') {
                    query = query.lte(filter.field, filter.value);
                  }
                });
              }
              
              const { data, error, count } = await query;
              if (error) throw error;
              
              // Obtener el total para paginación correcta
              const countQuery = supabase.from(resource).select('*', { count: 'exact', head: true });
              if (filters && filters.length > 0) {
                filters.forEach(filter => {
                  if (filter.operator === 'eq') {
                    countQuery.eq(filter.field, filter.value);
                  } else if (filter.operator === 'ne') {
                    countQuery.neq(filter.field, filter.value);
                  } else if (filter.operator === 'gte') {
                    countQuery.gte(filter.field, filter.value);
                  } else if (filter.operator === 'lte') {
                    countQuery.lte(filter.field, filter.value);
                  }
                });
              }
              const { count: totalCount } = await countQuery;
              
              return { data: data || [], total: totalCount || 0 };
            },
            getOne: async ({ resource, id, meta }) => {
              let query = supabase.from(resource);
              
              // Incluir relaciones según el recurso
              if (resource === 'properties') {
                query = query.select(`
                  *,
                  property_images(url, sort_order, id)
                `);
              } else if (resource === 'inquiries') {
                query = query.select(`
                  *,
                  property:properties(title, id)
                `);
              } else {
                query = query.select('*');
              }
              
              const { data, error } = await query.eq('id', id).single();
              if (error) throw error;
              return { data };
            },
            create: async ({ resource, variables, meta }) => {
              const { data, error } = await supabase.from(resource).insert(variables).select().single();
              if (error) throw error;
              return { data };
            },
            update: async ({ resource, id, variables, meta }) => {
              const { data, error } = await supabase.from(resource).update(variables).eq('id', id).select().single();
              if (error) throw error;
              return { data };
            },
            deleteOne: async ({ resource, id, meta }) => {
              const { error } = await supabase.from(resource).delete().eq('id', id);
              if (error) throw error;
              return { data: { id } };
            },
          }
        }}
      >
        <Layout style={{ minHeight: '100vh', background: '#F7FAFC' }}>
          <Layout.Sider 
            width={280} 
            style={{
              background: '#FFFFFF',
              borderRight: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Logo Section */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#EB9561',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                L
              </div>
              <div>
                <div style={{color: '#1A202C', fontWeight: 'bold', fontSize: '18px'}}>
                  {import.meta.env.PUBLIC_BRAND_NAME || 'LLAVE'}
                </div>
                <div style={{color: '#718096', fontSize: '12px', fontWeight: '500'}}>
                  Administración
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <div style={{ padding: '16px' }}>
              <nav>
                <div style={{ marginBottom: '8px' }}>
                  <a 
                    href="#/properties" 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      color: '#4A5568',
                      textDecoration: 'none',
                      fontWeight: '500',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#F7FAFC';
                      e.target.style.color = '#EB9561';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = '#4A5568';
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    Viviendas
                  </a>
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <a 
                    href="#/inquiries" 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      color: '#4A5568',
                      textDecoration: 'none',
                      fontWeight: '500',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#F7FAFC';
                      e.target.style.color = '#EB9561';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = '#4A5568';
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    Consultas
                  </a>
                </div>
                
                <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                  <a 
                    href="/" 
                    target="_blank"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      color: '#4A5568',
                      textDecoration: 'none',
                      fontWeight: '500',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#F7FAFC';
                      e.target.style.color = '#EB9561';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = '#4A5568';
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                    Ir al sitio
                  </a>
                </div>
                
                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    color: '#E53E3E',
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '14px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#FED7D7';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Salir
                </button>
              </nav>
            </div>
          </Layout.Sider>
          
          <Layout.Content style={{ 
            padding: '32px', 
            minHeight: '100vh', 
            background: '#F7FAFC',
            overflow: 'auto'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              minHeight: 'calc(100vh - 64px)',
              padding: '24px'
            }}>
              <RefineRoutes />
            </div>
          </Layout.Content>
        </Layout>
      </Refine>
      </AuthGate>
      </div>
    </ErrorBoundary>
  );
}
