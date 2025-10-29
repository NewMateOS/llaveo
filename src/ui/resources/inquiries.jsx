import React from 'react';
import { useTable } from '@refinedev/antd';
import { Table, Tag, Space } from 'antd';

export const InquiriesList = () => {
  const { tableProps } = useTable({ 
    resource: 'inquiries',
    dataProviderName: 'default',
    syncWithLocation: true
  });

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
            render: (status) => (
              <Tag color={status === 'responded' ? 'green' : 'orange'}>
                {status === 'responded' ? 'Respondida' : 'Pendiente'}
              </Tag>
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
            </div>
          ),
          rowExpandable: (record) => true,
        }}
      />
    </div>
  );
};
