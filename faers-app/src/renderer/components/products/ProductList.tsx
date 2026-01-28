/**
 * ProductList Component
 * Phase 4: Product Master for PSR Management
 *
 * Displays a list of products with filtering and CRUD operations.
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Popconfirm,
  Card,
  Row,
  Col,
  message
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useProducts, useProductActions, useProductModal } from '../../stores/productStore';
import type { ProductListItem, ApplicationType, MarketingStatus } from '../../../shared/types/product.types';
import ProductFormModal from './ProductFormModal';

const { Option } = Select;

const ProductList: React.FC = () => {
  const { products, totalProducts, isLoading, filter } = useProducts();
  const { fetchProducts, setFilter, clearFilter, deleteProduct } = useProductActions();
  const { openFormModal, isOpen } = useProductModal();

  const [searchText, setSearchText] = useState('');

  // Load products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle search
  const handleSearch = () => {
    setFilter({ search: searchText || undefined });
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (!e.target.value) {
      setFilter({ search: undefined });
    }
  };

  // Handle application type filter
  const handleAppTypeChange = (value: ApplicationType | undefined) => {
    setFilter({ applicationType: value });
  };

  // Handle marketing status filter
  const handleStatusChange = (value: MarketingStatus | undefined) => {
    setFilter({ marketingStatus: value });
  };

  // Handle show inactive toggle
  const handleShowInactiveChange = (value: boolean | undefined) => {
    setFilter({ isActive: value === undefined ? true : (value ? undefined : true) });
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    const result = await deleteProduct(id);
    if (result.success) {
      message.success('Product deactivated successfully');
    } else {
      message.error(result.error || 'Failed to deactivate product');
    }
  };

  // Handle pagination
  const handleTableChange = (page: number, pageSize: number) => {
    setFilter({
      offset: (page - 1) * pageSize,
      limit: pageSize
    });
  };

  // Table columns
  const columns: ColumnsType<ProductListItem> = [
    {
      title: 'Product Name',
      dataIndex: 'productName',
      key: 'productName',
      sorter: (a, b) => a.productName.localeCompare(b.productName)
    },
    {
      title: 'Active Ingredient',
      dataIndex: 'activeIngredient',
      key: 'activeIngredient'
    },
    {
      title: 'Application',
      key: 'application',
      render: (_, record) => (
        record.applicationNumber ? (
          <span>
            {record.applicationType && <Tag>{record.applicationType}</Tag>}
            {record.applicationNumber}
          </span>
        ) : '-'
      )
    },
    {
      title: 'Approval Date',
      dataIndex: 'usApprovalDate',
      key: 'usApprovalDate',
      render: (date: string | undefined) => date || '-'
    },
    {
      title: 'Company',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (name: string | undefined) => name || '-'
    },
    {
      title: 'Status',
      dataIndex: 'marketingStatus',
      key: 'marketingStatus',
      render: (status: MarketingStatus) => {
        const colors: Record<MarketingStatus, string> = {
          approved: 'green',
          withdrawn: 'red',
          pending: 'orange'
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Cases',
      dataIndex: 'caseCount',
      key: 'caseCount',
      align: 'center',
      render: (count: number | undefined) => count || 0
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openFormModal(record.id)}
            title="Edit"
          />
          <Popconfirm
            title="Deactivate Product"
            description="Are you sure you want to deactivate this product?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="Deactivate"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="product-list">
      <Card
        title="Product Master"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openFormModal()}
          >
            Add Product
          </Button>
        }
      >
        {/* Filters */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input
              placeholder="Search products..."
              value={searchText}
              onChange={handleSearchChange}
              onPressEnter={handleSearch}
              suffix={
                <SearchOutlined
                  style={{ cursor: 'pointer' }}
                  onClick={handleSearch}
                />
              }
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Application Type"
              allowClear
              style={{ width: '100%' }}
              value={filter.applicationType}
              onChange={handleAppTypeChange}
            >
              <Option value="NDA">NDA</Option>
              <Option value="BLA">BLA</Option>
              <Option value="ANDA">ANDA</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Marketing Status"
              allowClear
              style={{ width: '100%' }}
              value={filter.marketingStatus}
              onChange={handleStatusChange}
            >
              <Option value="approved">Approved</Option>
              <Option value="withdrawn">Withdrawn</Option>
              <Option value="pending">Pending</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Show Inactive"
              style={{ width: '100%' }}
              value={filter.isActive === undefined ? 'all' : (filter.isActive ? 'active' : 'inactive')}
              onChange={(value) => handleShowInactiveChange(value === 'all' ? undefined : value === 'active')}
            >
              <Option value="active">Active Only</Option>
              <Option value="all">Show All</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchProducts()}
              >
                Refresh
              </Button>
              <Button onClick={clearFilter}>Clear</Button>
            </Space>
          </Col>
        </Row>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: Math.floor((filter.offset || 0) / (filter.limit || 50)) + 1,
            pageSize: filter.limit || 50,
            total: totalProducts,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} products`,
            onChange: handleTableChange
          }}
          size="middle"
        />
      </Card>

      {/* Form Modal */}
      {isOpen && <ProductFormModal />}
    </div>
  );
};

export default ProductList;
