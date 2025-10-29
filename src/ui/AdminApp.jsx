import React from 'react';
import { Refine, useResource } from '@refinedev/core';
import { Layout } from 'antd';
import 'antd/dist/reset.css';
import { supabase } from '../lib/supabase';
import { hydrateClientFromServerSession } from '../lib/session-sync';
import { PropertiesList, PropertiesCreate, PropertiesEdit } from './resources/properties';
import { InquiriesList } from './resources/inquiries';

// Componente que renderiza las rutas de Refine
function RefineRoutes() {
  const { resource, action } = useResource();

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
}

function AuthGate({ children }) {
  const [ready, setReady] = React.useState(false);
  const [user, setUser] = React.useState(null);
  React.useEffect(() => {
    let active = true;

    const initAuth = async () => {
      await hydrateClientFromServerSession(supabase);
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      listener?.subscription.unsubscribe();
    };
  }, []);
  if (!ready) return null;
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm" style={{background: '#EB9561'}}>
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{color: '#1A202C'}}>Panel de Administración</h1>
            <p className="text-gray-600 mb-8">Accede con tu cuenta de Google para gestionar las propiedades</p>
            <button
              className="w-full py-3 px-4 rounded-lg text-sm font-medium text-white shadow-sm hover:shadow-md transition-all duration-200"
              style={{background: '#EB9561'}}
              onClick={() => supabase.auth.signInWithOAuth({ provider:'google', options: { queryParams:{ hd: import.meta.env.PUBLIC_ALLOWED_GOOGLE_DOMAIN }}})}
            >
              Entrar con Google
            </button>
          </div>
        </div>
      </div>
    );
  }
  return children;
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
    <AuthGate>
      <Refine
        resources={[
          { name: 'properties', list: PropertiesList, create: PropertiesCreate, edit: PropertiesEdit },
          { name: 'inquiries', list: InquiriesList },
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
              }
              
              const { data, error } = await query;
              if (error) throw error;
              
              return { data, total: data.length };
            },
            getOne: async ({ resource, id, meta }) => {
              const { data, error } = await supabase.from(resource).select('*').eq('id', id).single();
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
  );
}
