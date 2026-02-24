import React, { useEffect } from 'react';
import { Table, Button, Tag, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDeviationStore } from '../../stores/deviationStore';

const { Search } = Input;

interface Props { studyId?: number; onSelect: (id: number) => void; onCreate: () => void; }

const DeviationList: React.FC<Props> = ({ studyId, onSelect, onCreate }) => {
  const { deviations, isLoading, fetchDeviations, setFilter } = useDeviationStore();
  useEffect(() => { fetchDeviations(studyId ? { studyId } : undefined); }, [studyId]);

  const categoryColors: Record<string, string> = { inclusion_exclusion: 'red', informed_consent: 'orange', prohibited_med: 'volcano', dose_modification: 'gold', visit_schedule: 'blue', specimen: 'cyan', other: 'default' };

  const columns = [
    { title: 'ID', dataIndex: 'deviationId', key: 'deviationId' },
    { title: 'Date', dataIndex: 'deviationDate', key: 'deviationDate' },
    { title: 'Subject', dataIndex: 'subjectNumber', key: 'subjectNumber' },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (c: string) => <Tag color={categoryColors[c] || 'default'}>{c.replace(/_/g, ' ')}</Tag> },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Linked Cases', dataIndex: 'linkedCaseCount', key: 'linkedCaseCount' },
    { title: 'Actions', key: 'actions', render: (_: any, r: any) => <Button type="link" onClick={() => onSelect(r.id)}>View</Button> }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Search placeholder="Search deviations..." allowClear onSearch={(v) => { setFilter({ search: v }); fetchDeviations({ search: v, studyId }); }} style={{ width: 300 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>New Deviation</Button>
      </div>
      <Table columns={columns} dataSource={deviations} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 20 }} />
    </div>
  );
};

export default DeviationList;
