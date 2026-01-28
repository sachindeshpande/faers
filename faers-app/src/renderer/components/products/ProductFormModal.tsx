/**
 * ProductFormModal Component
 * Phase 4: Product Master for PSR Management
 *
 * Modal form for creating and editing products.
 */

import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Spin
} from 'antd';
import dayjs from 'dayjs';
import { useProductModal, useSelectedProduct, useProductActions } from '../../stores/productStore';
import type { CreateProductDTO, UpdateProductDTO } from '../../../shared/types/product.types';

const { Option } = Select;

const ProductFormModal: React.FC = () => {
  const [form] = Form.useForm();
  const { isOpen, editingProductId, closeFormModal } = useProductModal();
  const { product, isLoading } = useSelectedProduct();
  const { createProduct, updateProduct, fetchProduct } = useProductActions();

  const isEditing = editingProductId !== null;

  // Load product data when editing
  useEffect(() => {
    if (isEditing && editingProductId) {
      fetchProduct(editingProductId);
    }
  }, [editingProductId]);

  // Populate form when product is loaded
  useEffect(() => {
    if (product && isEditing) {
      form.setFieldsValue({
        productName: product.productName,
        activeIngredient: product.activeIngredient,
        applicationType: product.applicationType,
        applicationNumber: product.applicationNumber,
        usApprovalDate: product.usApprovalDate ? dayjs(product.usApprovalDate) : undefined,
        marketingStatus: product.marketingStatus,
        companyName: product.companyName
      });
    } else if (!isEditing) {
      form.resetFields();
      form.setFieldsValue({
        marketingStatus: 'approved'
      });
    }
  }, [product, isEditing, form]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const data: CreateProductDTO | UpdateProductDTO = {
        productName: values.productName,
        activeIngredient: values.activeIngredient || undefined,
        applicationType: values.applicationType || undefined,
        applicationNumber: values.applicationNumber || undefined,
        usApprovalDate: values.usApprovalDate
          ? values.usApprovalDate.format('YYYY-MM-DD')
          : undefined,
        marketingStatus: values.marketingStatus,
        companyName: values.companyName || undefined
      };

      if (isEditing && editingProductId) {
        const result = await updateProduct(editingProductId, data);
        if (result.success) {
          message.success('Product updated successfully');
          closeFormModal();
        } else {
          message.error(result.error || 'Failed to update product');
        }
      } else {
        const result = await createProduct(data as CreateProductDTO);
        if (result.success) {
          message.success('Product created successfully');
          closeFormModal();
        } else {
          message.error(result.error || 'Failed to create product');
        }
      }
    } catch (error) {
      // Form validation error
      console.error('Form validation error:', error);
    }
  };

  // Handle modal close
  const handleCancel = () => {
    form.resetFields();
    closeFormModal();
  };

  return (
    <Modal
      title={isEditing ? 'Edit Product' : 'Add Product'}
      open={isOpen}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText={isEditing ? 'Update' : 'Create'}
      width={600}
      destroyOnClose
    >
      <Spin spinning={isLoading && isEditing}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            marketingStatus: 'approved'
          }}
        >
          <Form.Item
            name="productName"
            label="Product Name"
            rules={[{ required: true, message: 'Please enter product name' }]}
          >
            <Input placeholder="Enter product name" />
          </Form.Item>

          <Form.Item
            name="activeIngredient"
            label="Active Ingredient"
          >
            <Input placeholder="Enter active ingredient(s)" />
          </Form.Item>

          <Form.Item
            name="applicationType"
            label="Application Type"
          >
            <Select placeholder="Select application type" allowClear>
              <Option value="NDA">NDA (New Drug Application)</Option>
              <Option value="BLA">BLA (Biologics License Application)</Option>
              <Option value="ANDA">ANDA (Abbreviated New Drug Application)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="applicationNumber"
            label="Application Number"
          >
            <Input placeholder="e.g., 123456" />
          </Form.Item>

          <Form.Item
            name="usApprovalDate"
            label="US Approval Date"
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Select approval date"
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Form.Item
            name="marketingStatus"
            label="Marketing Status"
            rules={[{ required: true, message: 'Please select marketing status' }]}
          >
            <Select>
              <Option value="approved">Approved</Option>
              <Option value="withdrawn">Withdrawn</Option>
              <Option value="pending">Pending</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="companyName"
            label="Company Name"
          >
            <Input placeholder="Enter company/MAH name" />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default ProductFormModal;
