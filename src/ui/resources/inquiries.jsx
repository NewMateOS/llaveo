import React from 'react';
import { useTable } from '@refinedev/antd';
import { Table, Tag, Space, Alert, Select, message, Popconfirm } from 'antd';
import { getSupabaseClient } from '../../lib/supabase-client';

// Componente para manejar el cambio de estado de una consulta
const StatusSelect = ({ inquiryId, initialStatus, onUpdate }) => {
  const [currentStatus, setCurrentStatus] = React.useState(initialStatus || 'pending');
  const [loading, setLoading] = React.useState(false);
  
  // Actualizar el estado local si cambia initialStatus desde fuera
  React.useEffect(() => {
    setCurrentStatus(initialStatus || 'pending');
  }, [initialStatus]);
  
  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('inquiries')
        .update({ status: newStatus })
        .eq('id', inquiryId);
      
      if (error) throw error;
      
      setCurrentStatus(newStatus);
      message.success('Estado actualizado correctamente');
      // Notificar al componente padre para recargar
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      message.error('Error al actualizar el estado: ' + (error.message || error));
      // Revertir el cambio en caso de error
      setCurrentStatus(initialStatus || 'pending');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Select
      value={currentStatus}
      onChange={handleStatusChange}
      loading={loading}
      style={{ width: '100%' }}
      options={[
        { value: 'pending', label: 'Pendiente' },
        { value: 'responded', label: 'Respondida' },
        { value: 'archived', label: 'Archivada' }
      ]}
    />
  );
};

export const InquiriesList = () => {
  const { tableProps, tableQueryResult } = useTable({ 
    resource: 'inquiries',
    dataProviderName: 'default',
    syncWithLocation: true
  });

  // Mostrar errores si los hay
  if (tableQueryResult?.isError) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error al cargar las consultas"
          description={tableQueryResult?.error?.message || 'No se pudieron cargar las consultas. Verifica que tengas permisos para acceder a esta tabla.'}
          type="error"
          showIcon
        />
        <div style={{ marginTop: '16px' }}>
          <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(tableQueryResult?.error, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 'bold' }}>Consultas de Propiedades</h2>
      <Table 
        rowKey="id" 
        {...tableProps}
        columns={[
          { 
            title: 'Fecha', 
            dataIndex: 'created_at', 
            render: (date) => new Date(date).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          },
          { 
            title: 'Propiedad', 
            dataIndex: 'property_id',
            render: (propertyId, record) => (
              <div>
                <div style={{ fontWeight: 'bold' }}>{record.property?.title || 'Propiedad eliminada'}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>ID: {propertyId}</div>
              </div>
            )
          },
          { 
            title: 'Cliente', 
            dataIndex: 'name',
            render: (name, record) => (
              <div>
                <div style={{ fontWeight: 'bold' }}>{name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{record.email}</div>
                {record.phone && (
                  <div style={{ fontSize: '12px', color: '#666' }}>{record.phone}</div>
                )}
              </div>
            )
          },
          { 
            title: 'Mensaje', 
            dataIndex: 'message',
            render: (message) => message ? (
              <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {message}
              </div>
            ) : (
              <Tag color="default">Sin mensaje</Tag>
            )
          },
          {
            title: 'Estado',
            dataIndex: 'status',
            width: 180,
            render: (status, record) => (
              <StatusSelect 
                inquiryId={record.id} 
                initialStatus={status || 'pending'}
                onUpdate={() => tableQueryResult?.refetch?.()}
              />
            )
          }
        ]}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '16px 0' }}>
              <h4 style={{ marginBottom: 8 }}>Detalles completos:</h4>
              <div style={{ marginBottom: 8 }}>
                <strong>Email:</strong> {record.email}
              </div>
              {record.phone && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Teléfono:</strong> {record.phone}
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <strong>Propiedad:</strong> {record.property?.title || 'Propiedad eliminada'}
              </div>
              {record.message && (
                <div>
                  <strong>Mensaje:</strong>
                  <div style={{ marginTop: 4, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                    {record.message}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <strong>Estado actual:</strong> 
                <Tag 
                  color={
                    (record.status || 'pending') === 'responded' ? 'green' : 
                    (record.status || 'pending') === 'archived' ? 'default' : 'orange'
                  }
                  style={{ marginLeft: 8 }}
                >
                  {(record.status || 'pending') === 'responded' ? 'Respondida' : 
                   (record.status || 'pending') === 'archived' ? 'Archivada' : 'Pendiente'}
                </Tag>
              </div>
            </div>
          ),
          rowExpandable: (record) => true,
        }}
      />
    </div>
  );
};
