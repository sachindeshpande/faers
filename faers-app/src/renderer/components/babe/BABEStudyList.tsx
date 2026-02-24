import React, { useEffect } from 'react';
import { Table, Button, Tag, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useBABEStore } from '../../stores/babeStore';

const { Search } = Input;

interface Props { onSelect: (id: number) => void; onCreate: () => void; }

const BABEStudyList: React.FC<Props> = ({ onSelect, onCreate }) => {
  const { studies, isLoading, fetchStudies, setFilter } = useBABEStore();
  useEffect(() => { fetchStudies(); }, []);

  const columns = [
    { title: 'Protocol', dataIndex: 'protocolNumber', key: 'protocolNumber' },
    { title: 'Test Product', dataIndex: 'testProductName', key: 'testProductName' },
    { title: 'Reference Product', dataIndex: 'referenceProductName', key: 'referenceProductName' },
    { title: 'Active Ingredient', dataIndex: 'activeIngredient', key: 'activeIngredient' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'active' ? 'green' : 'default'}>{s}</Tag> },
    { title: 'Actions', key: 'actions', render: (_: any, record: any) => <Button type="link" onClick={() => onSelect(record.id)}>View</Button> }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Search placeholder="Search BA/BE studies..." allowClear onSearch={(v) => { setFilter({ search: v }); fetchStudies({ search: v }); }} style={{ width: 300 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>New BA/BE Study</Button>
      </div>
      <Table columns={columns} dataSource={studies} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 20 }} />
    </div>
  );
};

export default BABEStudyList;
