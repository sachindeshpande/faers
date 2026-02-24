import React, { useEffect } from 'react';
import { Table, Button, Tag, Space, Input } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useStudyStore } from '../../stores/studyStore';
import type { StudyListItem } from '../../../shared/types/study.types';

const { Search } = Input;

interface StudyListProps {
  onSelect: (study: StudyListItem) => void;
  onCreate: () => void;
}

const StudyList: React.FC<StudyListProps> = ({ onSelect, onCreate }) => {
  const { studies, isLoading, fetchStudies, setFilter } = useStudyStore();

  useEffect(() => { fetchStudies(); }, []);

  const columns = [
    { title: 'Study ID', dataIndex: 'studyId', key: 'studyId', sorter: (a: StudyListItem, b: StudyListItem) => a.studyId.localeCompare(b.studyId) },
    { title: 'Protocol', dataIndex: 'protocolNumber', key: 'protocolNumber' },
    { title: 'Title', dataIndex: 'studyTitle', key: 'studyTitle', ellipsis: true },
    { title: 'Phase', dataIndex: 'phase', key: 'phase' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'active' ? 'green' : s === 'completed' ? 'blue' : 'default'}>{s}</Tag> },
    { title: 'Blinded', dataIndex: 'isBlinded', key: 'isBlinded', render: (b: boolean) => b ? <Tag color="orange">Blinded</Tag> : <Tag>Open</Tag> },
    { title: 'Sites', dataIndex: 'siteCount', key: 'siteCount' },
    { title: 'Actions', key: 'actions', render: (_: any, record: StudyListItem) => <Button type="link" onClick={() => onSelect(record)}>View</Button> }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Search placeholder="Search studies..." allowClear onSearch={(v) => { setFilter({ search: v }); fetchStudies({ search: v }); }} style={{ width: 300 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>New Study</Button>
      </div>
      <Table columns={columns} dataSource={studies} rowKey="id" loading={isLoading} size="small"
        onRow={(record) => ({ onClick: () => onSelect(record) })}
        pagination={{ pageSize: 20, showTotal: (t) => `${t} studies` }} />
    </div>
  );
};

export default StudyList;
