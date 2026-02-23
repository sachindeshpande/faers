/**
 * Advanced Search Builder Component
 * Visual query builder for constructing search conditions
 */

import React from 'react';
import {
  Select,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Space,
  Card,
  Radio,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  GroupOutlined
} from '@ant-design/icons';
import { useSearchStore } from '../../stores/searchStore';
import type {
  SearchCondition,
  SearchConditionGroup,
  SearchOperator,
  SearchableField
} from '../../../shared/types/search.types';
import {
  generateConditionId,
  createEmptyCondition,
  OPERATOR_LABELS
} from '../../../shared/types/search.types';
import dayjs from 'dayjs';

const { Option } = Select;

interface ConditionBuilderProps {
  condition: SearchCondition;
  fields: SearchableField[];
  onChange: (condition: SearchCondition) => void;
  onDelete: () => void;
  canDelete: boolean;
}

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  condition,
  fields,
  onChange,
  onDelete,
  canDelete
}) => {
  const field = fields.find((f) => f.fieldPath === condition.field);
  const operators = field?.operators || ['contains', 'equals'];

  const handleFieldChange = (fieldPath: string) => {
    const newField = fields.find((f) => f.fieldPath === fieldPath);
    const newOperator = newField?.operators[0] || 'contains';
    onChange({
      ...condition,
      field: fieldPath,
      operator: newOperator,
      value: ''
    });
  };

  const handleOperatorChange = (operator: SearchOperator) => {
    onChange({ ...condition, operator, value: '' });
  };

  const handleValueChange = (value: unknown) => {
    onChange({ ...condition, value });
  };

  const renderValueInput = () => {
    if (!field) {
      return <Input disabled placeholder="Select a field first" style={{ width: 200 }} />;
    }

    // No value needed for these operators
    if (['is_null', 'is_not_null', 'is_true', 'is_false'].includes(condition.operator)) {
      return null;
    }

    switch (field.type) {
      case 'select':
        if (condition.operator === 'in' || condition.operator === 'not_in') {
          return (
            <Select
              mode="multiple"
              style={{ minWidth: 200 }}
              placeholder="Select values"
              value={Array.isArray(condition.value) ? condition.value : []}
              onChange={handleValueChange}
            >
              {field.options?.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          );
        }
        return (
          <Select
            style={{ width: 200 }}
            placeholder="Select value"
            value={condition.value as string}
            onChange={handleValueChange}
          >
            {field.options?.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        );

      case 'date':
        if (condition.operator === 'between') {
          return (
            <DatePicker.RangePicker
              value={
                Array.isArray(condition.value) && condition.value.length === 2
                  ? [dayjs(condition.value[0] as string), dayjs(condition.value[1] as string)]
                  : undefined
              }
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  handleValueChange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
                }
              }}
            />
          );
        }
        return (
          <DatePicker
            value={condition.value ? dayjs(condition.value as string) : undefined}
            onChange={(date) => handleValueChange(date?.format('YYYY-MM-DD'))}
          />
        );

      case 'number':
        if (condition.operator === 'between') {
          return (
            <Space>
              <InputNumber
                placeholder="From"
                value={(condition.value as number[])?.[0]}
                onChange={(val) => {
                  const current = Array.isArray(condition.value) ? condition.value : [null, null];
                  handleValueChange([val, current[1]]);
                }}
                style={{ width: 100 }}
              />
              <span>to</span>
              <InputNumber
                placeholder="To"
                value={(condition.value as number[])?.[1]}
                onChange={(val) => {
                  const current = Array.isArray(condition.value) ? condition.value : [null, null];
                  handleValueChange([current[0], val]);
                }}
                style={{ width: 100 }}
              />
            </Space>
          );
        }
        return (
          <InputNumber
            placeholder="Enter value"
            value={condition.value as number}
            onChange={handleValueChange}
            style={{ width: 150 }}
          />
        );

      case 'boolean':
        return null; // Boolean uses is_true/is_false operators

      default:
        return (
          <Input
            placeholder="Enter value"
            value={condition.value as string}
            onChange={(e) => handleValueChange(e.target.value)}
            style={{ width: 200 }}
          />
        );
    }
  };

  return (
    <Space wrap>
      <Select
        style={{ width: 200 }}
        placeholder="Select field"
        value={condition.field || undefined}
        onChange={handleFieldChange}
        showSearch
        filterOption={(input, option) =>
          (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
        }
      >
        {fields.map((f) => (
          <Option key={f.fieldPath} value={f.fieldPath}>
            {f.label}
          </Option>
        ))}
      </Select>

      <Select
        style={{ width: 160 }}
        value={condition.operator}
        onChange={handleOperatorChange}
      >
        {operators.map((op) => (
          <Option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </Option>
        ))}
      </Select>

      {renderValueInput()}

      {canDelete && (
        <Tooltip title="Remove condition">
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={onDelete}
          />
        </Tooltip>
      )}
    </Space>
  );
};

interface ConditionGroupBuilderProps {
  group: SearchConditionGroup;
  fields: SearchableField[];
  onChange: (group: SearchConditionGroup) => void;
  onDelete?: () => void;
  level?: number;
}

const ConditionGroupBuilder: React.FC<ConditionGroupBuilderProps> = ({
  group,
  fields,
  onChange,
  onDelete,
  level = 0
}) => {
  const isCondition = (item: SearchCondition | SearchConditionGroup): item is SearchCondition => {
    return 'field' in item;
  };

  const handleLogicChange = (logic: 'AND' | 'OR') => {
    onChange({ ...group, logic });
  };

  const handleConditionChange = (index: number, condition: SearchCondition) => {
    const newConditions = [...group.conditions];
    newConditions[index] = condition;
    onChange({ ...group, conditions: newConditions });
  };

  const handleGroupChange = (index: number, subGroup: SearchConditionGroup) => {
    const newConditions = [...group.conditions];
    newConditions[index] = subGroup;
    onChange({ ...group, conditions: newConditions });
  };

  const handleDelete = (index: number) => {
    const newConditions = group.conditions.filter((_, i) => i !== index);
    onChange({ ...group, conditions: newConditions });
  };

  const addCondition = () => {
    onChange({
      ...group,
      conditions: [...group.conditions, createEmptyCondition()]
    });
  };

  const addGroup = () => {
    const newGroup: SearchConditionGroup = {
      id: generateConditionId(),
      logic: 'AND',
      conditions: [createEmptyCondition()]
    };
    onChange({
      ...group,
      conditions: [...group.conditions, newGroup]
    });
  };

  return (
    <Card
      size="small"
      style={{
        marginBottom: 8,
        backgroundColor: level % 2 === 0 ? '#fafafa' : '#fff',
        borderLeft: level > 0 ? '3px solid #1890ff' : undefined
      }}
      extra={
        onDelete && (
          <Button type="text" danger icon={<DeleteOutlined />} onClick={onDelete}>
            Remove Group
          </Button>
        )
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <span>Match</span>
          <Radio.Group
            value={group.logic}
            onChange={(e) => handleLogicChange(e.target.value)}
            size="small"
          >
            <Radio.Button value="AND">All (AND)</Radio.Button>
            <Radio.Button value="OR">Any (OR)</Radio.Button>
          </Radio.Group>
          <span>of the following conditions:</span>
        </Space>

        {group.conditions.map((item, index) => (
          <div key={isCondition(item) ? item.id : item.id} style={{ marginLeft: 16 }}>
            {isCondition(item) ? (
              <ConditionBuilder
                condition={item}
                fields={fields}
                onChange={(cond) => handleConditionChange(index, cond)}
                onDelete={() => handleDelete(index)}
                canDelete={group.conditions.length > 1}
              />
            ) : (
              <ConditionGroupBuilder
                group={item}
                fields={fields}
                onChange={(g) => handleGroupChange(index, g)}
                onDelete={() => handleDelete(index)}
                level={level + 1}
              />
            )}
          </div>
        ))}

        <Space style={{ marginLeft: 16 }}>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addCondition}
            size="small"
          >
            Add Condition
          </Button>
          {level < 2 && (
            <Button
              type="dashed"
              icon={<GroupOutlined />}
              onClick={addGroup}
              size="small"
            >
              Add Group
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
};

export const AdvancedSearchBuilder: React.FC = () => {
  const { advancedQuery, searchableFields, setConditions } = useSearchStore();

  const handleConditionsChange = (conditions: SearchConditionGroup) => {
    setConditions(conditions);
  };

  if (!advancedQuery.conditions) {
    return null;
  }

  return (
    <div>
      <ConditionGroupBuilder
        group={advancedQuery.conditions}
        fields={searchableFields}
        onChange={handleConditionsChange}
      />
    </div>
  );
};
