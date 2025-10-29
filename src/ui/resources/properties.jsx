import React from 'react';
import { useTable, EditButton, DeleteButton, CreateButton, useForm } from '@refinedev/antd';
import {
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  Button,
  Space,
  Checkbox,
  message,
  Typography,
  Empty,
  Spin,
  Popconfirm,
} from 'antd';
import { getSupabaseClient } from '../../lib/supabase-client';

const bucket = 'properties';

async function uploadFiles(fileList, sortOrderStart = 0) {
  const supabase = getSupabaseClient();
  const uploads = [];
  for (const f of fileList) {
    const path = `${crypto.randomUUID()}-${f.name}`;
    const file = f.originFileObj || f;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    uploads.push({ url: data.publicUrl, sort_order: sortOrderStart + uploads.length });
  }
  return uploads;
}

export const PropertiesList = () => {
  const { tableProps } = useTable({
    resource: 'properties',
    dataProviderName: 'default',
    syncWithLocation: true,
  });
  
  
  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <CreateButton resource="properties">
          Crear vivienda
        </CreateButton>
      </Space>
      <Table
        rowKey="id"
        {...tableProps}
        columns={[
          { title: 'Título', dataIndex: 'title' },
          { title: 'Ciudad', dataIndex: 'city' },
          {
            title: 'Precio',
            dataIndex: 'price',
            render: (value) =>
              typeof value === 'number'
                ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
                : '—',
          },
          { title: 'Estado', dataIndex: 'status' },
          { title: 'Activa', dataIndex: 'is_active', render: v => v ? 'Sí' : 'No' },
          { title: 'Acciones', dataIndex: 'actions',
            render: (_, r) => (<Space>
              <EditButton recordItemId={r.id} />
              <DeleteButton recordItemId={r.id} />
            </Space>)
          }
        ]}
      />
    </div>
  );
};

const PropertyFormInner = ({
  form,
  onFinish,
  initialValues,
  existingImages = [],
  onRemoveExistingImage,
  submitText = 'Guardar',
  loading = false,
}) => {
  React.useEffect(() => {
    if (initialValues && form) {
      try {
        form.setFieldsValue(initialValues);
      } catch (error) {
        console.warn('Error setting form fields:', error);
      }
    }
  }, [form, initialValues]);

  return (
    <Spin spinning={loading} tip="Guardando...">
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={initialValues}>
        <Form.Item name="title" label="Título" rules={[{ required: true, message: 'Introduce un título' }]}> 
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Descripción">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item name="address" label="Dirección">
          <Input />
        </Form.Item>
        <Form.Item name="city" label="Ciudad" rules={[{ required: true, message: 'Introduce la ciudad' }]}> 
          <Input />
        </Form.Item>
        <Form.Item name="price" label="Precio" rules={[{ required: true, message: 'Introduce el precio' }]}> 
          <InputNumber min={0} style={{ width: '100%' }} prefix="€" />
        </Form.Item>
        <Form.Item label="Habitaciones" name="rooms">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Baños" name="baths">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="m²" name="area_m2">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="status" label="Estado">
          <Select
            options={[
              { value: 'venta', label: 'Venta' },
              { value: 'alquiler', label: 'Alquiler' },
            ]}
            placeholder="Selecciona el estado"
          />
        </Form.Item>
        <Form.Item name="is_active" label="Publicar" valuePropName="checked">
          <Checkbox>Visible en la web</Checkbox>
        </Form.Item>

        {existingImages.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={5}>Imágenes actuales</Typography.Title>
            <div
              style={{
                display: 'grid',
                gap: 16,
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              }}
            >
              {existingImages
                .slice()
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((img) => (
                  <div
                    key={img.id ?? img.url}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      background: '#FFFFFF',
                    }}
                  >
                    <img src={img.url} alt="Imagen de la vivienda" style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                    {onRemoveExistingImage ? (
                      <Popconfirm
                        title="Eliminar imagen"
                        description="Esta acción no se puede deshacer"
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onRemoveExistingImage(img.id)}
                      >
                        <Button type="text" danger style={{ width: '100%' }}>
                          Eliminar
                        </Button>
                      </Popconfirm>
                    ) : (
                      <Button type="text" disabled style={{ width: '100%' }}>
                        Imagen existente
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ) : (
          onRemoveExistingImage ? (
            <Empty description="Sin imágenes actuales" style={{ marginBottom: 24 }} />
          ) : null
        )}

        <Form.Item label="Añadir nuevas imágenes">
          <Form.Item name="images" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList} noStyle>
            <Upload listType="picture" beforeUpload={() => false} multiple accept="image/*">
              <Button>Seleccionar imágenes</Button>
            </Upload>
          </Form.Item>
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit">
            {submitText}
          </Button>
          <Button onClick={() => window.history.back()}>Cancelar</Button>
        </Space>
      </Form>
    </Spin>
  );
};

export const PropertiesCreate = () => {
  const { form, formProps, onFinish } = useForm({ 
    resource: 'properties', 
    redirect: false,
    action: 'create'
  });

  const handleFinish = async (values) => {
    try {
      const formValues = { ...values };
      const fileList = formValues.images || [];
      delete formValues.images;

      if (!formValues.status) {
        formValues.status = 'venta';
      }

      if (typeof formValues.is_active === 'undefined') {
        formValues.is_active = true;
      }

      // Primero crear la propiedad usando Supabase directamente (para obtener el ID)
      const supabase = getSupabaseClient();
      const { data: prop, error } = await supabase
        .from('properties')
        .insert([formValues])
        .select('id')
        .single();
      
      if (error) throw error;

      // Subir las imágenes
      if (fileList.length && prop?.id) {
        const uploaded = await uploadFiles(fileList, 0);
        if (uploaded.length) {
          await supabase.from('property_images').insert(
            uploaded.map((img) => ({ ...img, property_id: prop.id })),
          );
        }
      }

      // Llamar al onFinish de Refine para que maneje el redirect y estado
      if (onFinish) {
        await onFinish({ ...formValues, id: prop.id });
      }

      message.success('Vivienda creada');
    } catch (e) {
      console.error('Error creating property', e);
      message.error(String(e.message || e));
    }
  };

  return (
    <PropertyFormInner
      form={form}
      onFinish={handleFinish}
      initialValues={{ status: 'venta', is_active: true }}
      existingImages={[]}
      submitText="Crear vivienda"
    />
  );
};

export const PropertiesEdit = () => {
  const { form, queryResult, onFinish } = useForm({ 
    resource: 'properties', 
    action: 'edit',
    redirect: false // Deshabilitar redirect automático
  });
  const record = queryResult?.data?.data;
  const [existingImages, setExistingImages] = React.useState([]);
  const removedImageIdsRef = React.useRef(new Set());

  React.useEffect(() => {
    if (record?.property_images) {
      setExistingImages(record.property_images);
    } else {
      setExistingImages([]);
    }
  }, [record]);

  const handleRemoveExistingImage = React.useCallback((id) => {
    if (!id) return;
    removedImageIdsRef.current.add(id);
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleFinish = async (values) => {
    if (!record) return;
    try {
      const formValues = { ...values };
      const fileList = (formValues.images || []).filter((file) => file.originFileObj);
      delete formValues.images;

      // Actualizar usando Supabase directamente
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('properties')
        .update(formValues)
        .eq('id', record.id);
      
      if (error) throw error;

      // Llamar al onFinish de Refine si existe
      if (onFinish) {
        await onFinish({ ...formValues, id: record.id });
      }

      // Manejar las imágenes por separado
      const removedIds = Array.from(removedImageIdsRef.current);
      if (removedIds.length) {
        await supabase.from('property_images').delete().in('id', removedIds);
        removedImageIdsRef.current.clear();
      }

      if (fileList.length) {
        const uploaded = await uploadFiles(fileList, existingImages.length);
        if (uploaded.length) {
          await supabase.from('property_images').insert(
            uploaded.map((img) => ({ ...img, property_id: record.id })),
          );
        }
      }

      message.success('Vivienda actualizada');
    } catch (e) {
      console.error('Error updating property', e);
      message.error(String(e.message || e));
    }
  };

  if (queryResult?.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
        <Spin tip="Cargando vivienda..." />
      </div>
    );
  }

  if (!record) {
    return <Empty description="No se encontró la vivienda" />;
  }

  return (
    <PropertyFormInner
      form={form}
      onFinish={handleFinish}
      initialValues={record}
      existingImages={existingImages}
      onRemoveExistingImage={handleRemoveExistingImage}
      submitText="Guardar cambios"
    />
  );
};
