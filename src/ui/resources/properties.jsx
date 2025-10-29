import React from 'react';
import { useTable, EditButton, DeleteButton, CreateButton, useForm } from '@refinedev/antd';
import { Table, Form, Input, InputNumber, Select, Upload, Button, Space, Checkbox, message } from 'antd';
import { supabase } from '../../lib/supabase';

const bucket = 'properties';

async function uploadFiles(fileList) {
  const urls = [];
  for (const f of fileList) {
    const path = `${crypto.randomUUID()}-${f.name}`;
    const file = f.originFileObj || f;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert:false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    urls.push({ url: data.publicUrl, sort_order: 0 });
  }
  return urls;
}

export const PropertiesList = () => {
  const { tableProps } = useTable({
    resource: 'properties',
    dataProviderName: 'default',
    syncWithLocation: true
  });
  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <CreateButton>Crear vivienda</CreateButton>
      </Space>
      <Table
        rowKey="id"
        {...tableProps}
        columns={[
          { title: 'Título', dataIndex: 'title' },
          { title: 'Ciudad', dataIndex: 'city' },
          { title: 'Precio', dataIndex: 'price', render: v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v) },
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

const PropertyFormInner = ({ form, onFinish, initialValues }) => (
  <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onFinish}>
    <Form.Item name="title" label="Título" rules={[{ required:true }]}><Input /></Form.Item>
    <Form.Item name="description" label="Descripción"><Input.TextArea rows={4}/></Form.Item>
    <Form.Item name="address" label="Dirección"><Input /></Form.Item>
    <Form.Item name="city" label="Ciudad" rules={[{ required:true }]}><Input /></Form.Item>
    <Form.Item name="price" label="Precio" rules={[{ required:true }]}><InputNumber min={0} style={{width:'100%'}}/></Form.Item>
    <Form.Item label="Habitaciones" name="rooms"><InputNumber min={0}/></Form.Item>
    <Form.Item label="Baños" name="baths"><InputNumber min={0}/></Form.Item>
    <Form.Item label="m²" name="area_m2"><InputNumber min={0}/></Form.Item>
    <Form.Item name="status" label="Estado" initialValue="venta">
      <Select options={[{value:'venta',label:'Venta'},{value:'alquiler',label:'Alquiler'}]} />
    </Form.Item>
    <Form.Item name="is_active" label="Publicar" valuePropName="checked">
      <Checkbox/>
    </Form.Item>

    <Form.Item label="Imágenes">
      <Form.Item name="images" valuePropName="fileList" getValueFromEvent={(e)=>e.fileList} noStyle>
        <Upload listType="picture" beforeUpload={()=>false} multiple>
          <Button>Subir imágenes</Button>
        </Upload>
      </Form.Item>
    </Form.Item>

    <Button type="primary" htmlType="submit">Guardar</Button>
  </Form>
);

export const PropertiesCreate = () => {
  const { form } = useForm({ resource: 'properties', redirect: 'list' });

  const handleFinish = async (values) => {
    try {
      const imgs = values.images?.length ? await uploadFiles(values.images) : [];
      const insert = { ...values };
      delete insert.images;
      const { data: prop, error } = await supabase.from('properties')
        .insert([insert]).select('id').single();
      if (error) throw error;
      if (imgs.length) {
        await supabase.from('property_images').insert(imgs.map(i => ({ ...i, property_id: prop.id })));
      }
      message.success('Vivienda creada');
      window.location.hash = '#/properties';
    } catch (e) {
      message.error(String(e.message || e));
    }
  };

  return <PropertyFormInner form={form.formProps.form} onFinish={handleFinish} />;
};

export const PropertiesEdit = () => {
  const { form, queryResult } = useForm({ resource: 'properties', action: 'edit' });
  const record = queryResult?.data?.data;

  const handleFinish = async (values) => {
    try {
      const imgs = values.images?.filter(x => x.originFileObj);
      if (imgs?.length) {
        const uploaded = await uploadFiles(imgs);
        await supabase.from('property_images').insert(uploaded.map(i => ({ ...i, property_id: record.id })));
      }
      const update = { ...values };
      delete update.images;
      const { error } = await supabase.from('properties').update(update).eq('id', record.id);
      if (error) throw error;
      message.success('Vivienda actualizada');
      window.location.hash = '#/properties';
    } catch (e) {
      message.error(String(e.message || e));
    }
  };

  return <PropertyFormInner form={form.formProps.form} onFinish={handleFinish} initialValues={record} />;
};
