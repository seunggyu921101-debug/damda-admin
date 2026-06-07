import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Tabs,
  Card,
  Descriptions,
  Button,
  Tag,
  Table,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Avatar,
  message,
  Spin,
  Divider,
  List,
  Typography,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined, ShopOutlined, FileOutlined, FilePdfOutlined, FileImageOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import {
  getVendor,
  updateVendorStatus,
  updateVendorPassword,
  getSettlements,
  getCommissionHistories,
  updateCommissionRate,
  getVendorDocuments,
} from '@/services/vendorService'
import { getBusinessesByVendor, getProductsByBusiness, createBusiness, updateBusiness } from '@/services/businessService'
import type { Business, BusinessProduct, BusinessInsert, BusinessUpdate } from '@/services/businessService'
import { useAuthStore } from '@/stores/authStore'
import { formatPhoneNumber } from '@/utils/format'
import { VENDOR_STATUS_LABEL, DATE_FORMAT, DEFAULT_PAGE_SIZE } from '@/constants'
import type { Settlement, CommissionHistory, SettlementStatus, BusinessOwnerDocument } from '@/types'

const SALE_TYPE_LABEL: Record<string, string> = {
  daily_one: '당일 1건',
  time_slot: '시간대별',
  quantity: '개수별',
}

// 사업장에 속한 상품 테이블 (행 클릭 → 상품 상세)
function BusinessProductsTable({ businessId }: { businessId: string }) {
  const navigate = useNavigate()
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['businessProducts', businessId],
    queryFn: () => getProductsByBusiness(businessId),
  })

  const columns: ColumnsType<BusinessProduct> = [
    { title: '상품명', dataIndex: 'name', key: 'name' },
    { title: '카테고리', key: 'category', render: (_, r) => r.category?.name || '-' },
    {
      title: '판매방식',
      dataIndex: 'sale_type',
      key: 'sale_type',
      render: (v: string) => SALE_TYPE_LABEL[v] || v,
    },
    {
      title: '판매가',
      dataIndex: 'sale_price',
      key: 'sale_price',
      render: (v: number) => `${(v ?? 0).toLocaleString()}원`,
    },
    {
      title: '상태',
      key: 'status',
      render: (_, r) =>
        r.is_sold_out ? <Tag color="red">품절</Tag> : r.is_visible ? <Tag color="green">노출</Tag> : <Tag>숨김</Tag>,
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={products}
      rowKey="id"
      size="small"
      bordered
      loading={isLoading}
      pagination={false}
      locale={{ emptyText: '등록된 상품이 없습니다' }}
      onRow={(record) => ({
        onClick: () => navigate(`/products/${record.id}`),
        style: { cursor: 'pointer' },
      })}
    />
  )
}

// 사업주 상세 - '상품 관리' 탭 (사업장 → 상품 계층, 사업장 등록/수정 포함)
function VendorBusinessesTab({ vendorId }: { vendorId: string }) {
  const queryClient = useQueryClient()
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['vendorBusinesses', vendorId],
    queryFn: () => getBusinessesByVendor(vendorId),
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Business | null>(null)
  const [bizForm] = Form.useForm()

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      editing
        ? updateBusiness(editing.id, values as BusinessUpdate)
        : createBusiness({ business_owner_id: vendorId, ...values } as BusinessInsert),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorBusinesses', vendorId] })
      message.success(editing ? '사업장이 수정되었습니다' : '사업장이 등록되었습니다')
      setModalOpen(false)
      bizForm.resetFields()
      setEditing(null)
    },
    onError: (e: Error) => message.error(e.message),
  })

  const openCreate = () => {
    setEditing(null)
    bizForm.resetFields()
    bizForm.setFieldsValue({ is_visible: true })
    setModalOpen(true)
  }
  const openEdit = (biz: Business) => {
    setEditing(biz)
    bizForm.setFieldsValue(biz)
    setModalOpen(true)
  }
  const handleSubmit = async () => {
    try {
      const values = await bizForm.validateFields()
      saveMutation.mutate(values)
    } catch {
      // validation error
    }
  }

  return (
    <>
      <div style={{ marginBottom: 12, textAlign: 'right' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          사업장 등록
        </Button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : businesses.length === 0 ? (
        <div style={{ padding: 16, background: '#fafafa', borderRadius: 6 }}>
          <Typography.Text type="secondary">등록된 사업장이 없습니다. '사업장 등록'으로 추가하세요.</Typography.Text>
        </div>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {businesses.map((biz: Business) => (
            <Card key={biz.id} size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <ShopOutlined style={{ color: '#1677ff' }} />
                <Typography.Text strong style={{ fontSize: 15 }}>
                  {biz.name}
                </Typography.Text>
                <Tag color={biz.is_visible ? 'green' : 'default'}>{biz.is_visible ? '노출' : '숨김'}</Tag>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {biz.address}
                  {biz.address_detail ? ` ${biz.address_detail}` : ''}
                </Typography.Text>
                <Button size="small" icon={<EditOutlined />} style={{ marginLeft: 'auto' }} onClick={() => openEdit(biz)}>
                  사업장 수정
                </Button>
              </div>
              <BusinessProductsTable businessId={biz.id} />
            </Card>
          ))}
        </Space>
      )}

      <Modal
        title={editing ? '사업장 수정' : '사업장 등록'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false)
          bizForm.resetFields()
          setEditing(null)
        }}
        confirmLoading={saveMutation.isPending}
        okText={editing ? '저장' : '등록'}
        cancelText="취소"
        destroyOnClose
      >
        <Form form={bizForm} layout="vertical">
          <Form.Item name="name" label="사업장명" rules={[{ required: true, message: '사업장명을 입력하세요' }]}>
            <Input placeholder="예: 아이키친 용인동백점" />
          </Form.Item>
          <Form.Item name="is_visible" label="노출 여부" valuePropName="checked">
            <Switch checkedChildren="노출" unCheckedChildren="숨김" />
          </Form.Item>
          <Space>
            <Form.Item name="zipcode" label="우편번호">
              <Input style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="region" label="지역">
              <Input style={{ width: 180 }} placeholder="예: 경기 용인시" />
            </Form.Item>
          </Space>
          <Form.Item name="address" label="주소">
            <Input placeholder="도로명 주소" />
          </Form.Item>
          <Form.Item name="address_detail" label="상세주소">
            <Input placeholder="건물명, 층, 호수 등" />
          </Form.Item>
          <Form.Item name="contact_phone" label="연락처">
            <Input style={{ width: 200 }} placeholder="사업장 연락처" />
          </Form.Item>
          <Form.Item name="intro" label="소개">
            <Input.TextArea rows={2} placeholder="사업장 소개" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export function VendorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { admin } = useAuthStore()

  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [settlementPage, setSettlementPage] = useState(1)

  const [commissionForm] = Form.useForm()
  const [passwordForm] = Form.useForm()

  // 사업주 정보 조회
  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => getVendor(id!),
    enabled: !!id,
  })

  // 정산 내역 조회
  const { data: settlementsData } = useQuery({
    queryKey: ['settlements', id, settlementPage],
    queryFn: () => getSettlements(id!, { page: settlementPage, pageSize: DEFAULT_PAGE_SIZE }),
    enabled: !!id,
  })

  // 수수료 변경 이력 조회
  const { data: commissionHistories } = useQuery({
    queryKey: ['commissionHistories', id],
    queryFn: () => getCommissionHistories(id!),
    enabled: !!id,
  })

  // 문서 목록 조회
  const { data: documents = [] } = useQuery({
    queryKey: ['vendorDocuments', id],
    queryFn: () => getVendorDocuments(id!),
    enabled: !!id,
  })

  // 상태 변경
  const statusMutation = useMutation({
    mutationFn: (status: 'active' | 'inactive') => updateVendorStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', id] })
      message.success('상태가 변경되었습니다')
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  // 수수료 변경
  const commissionMutation = useMutation({
    mutationFn: ({ rate, reason }: { rate: number; reason: string }) =>
      updateCommissionRate(id!, rate, reason, admin!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', id] })
      queryClient.invalidateQueries({ queryKey: ['commissionHistories', id] })
      setIsCommissionModalOpen(false)
      commissionForm.resetFields()
      message.success('수수료가 변경되었습니다')
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  // 비밀번호 변경
  const passwordMutation = useMutation({
    mutationFn: (password: string) => updateVendorPassword(id!, password),
    onSuccess: () => {
      setIsPasswordModalOpen(false)
      passwordForm.resetFields()
      message.success('비밀번호가 변경되었습니다')
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  const handlePasswordSubmit = async () => {
    try {
      const values = await passwordForm.validateFields()
      passwordMutation.mutate(values.password)
    } catch {
      // validation error
    }
  }

  const handleCommissionSubmit = async () => {
    try {
      const values = await commissionForm.validateFields()
      commissionMutation.mutate({ rate: values.new_rate, reason: values.reason })
    } catch {
      // validation error
    }
  }

  const settlementColumns: ColumnsType<Settlement> = [
    {
      title: '정산 기간',
      key: 'period',
      render: (_, record) =>
        `${dayjs(record.settlement_period_start).format(DATE_FORMAT)} ~ ${dayjs(record.settlement_period_end).format(DATE_FORMAT)}`,
    },
    {
      title: '총 매출',
      dataIndex: 'total_sales',
      key: 'total_sales',
      render: (v: number) => `${v.toLocaleString()}원`,
    },
    {
      title: '수수료',
      dataIndex: 'commission_amount',
      key: 'commission_amount',
      render: (v: number, record) => `${v.toLocaleString()}원 (${record.commission_rate}%)`,
    },
    {
      title: '환불',
      dataIndex: 'refund_amount',
      key: 'refund_amount',
      render: (v: number) => `${v.toLocaleString()}원`,
    },
    {
      title: '정산금',
      dataIndex: 'settlement_amount',
      key: 'settlement_amount',
      render: (v: number) => <strong>{v.toLocaleString()}원</strong>,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: SettlementStatus) => (
        <Tag color={status === 'completed' ? 'green' : 'orange'}>
          {status === 'completed' ? '정산완료' : '대기중'}
        </Tag>
      ),
    },
    {
      title: '정산일',
      dataIndex: 'settled_at',
      key: 'settled_at',
      render: (date: string | null) => (date ? dayjs(date).format(DATE_FORMAT) : '-'),
    },
  ]

  const commissionColumns: ColumnsType<CommissionHistory> = [
    {
      title: '변경일',
      dataIndex: 'effective_date',
      key: 'effective_date',
      render: (date: string) => dayjs(date).format(DATE_FORMAT),
    },
    {
      title: '이전 수수료',
      dataIndex: 'previous_rate',
      key: 'previous_rate',
      render: (v: number) => `${v}%`,
    },
    {
      title: '변경 수수료',
      dataIndex: 'new_rate',
      key: 'new_rate',
      render: (v: number) => `${v}%`,
    },
    {
      title: '변경 사유',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string | null) => reason || '-',
    },
    {
      title: '변경자',
      key: 'changed_by',
      render: (_, record) => record.admin?.name || '-',
    },
  ]

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!vendor) {
    return <div>사업주를 찾을 수 없습니다</div>
  }

  const tabItems = [
    {
      key: 'info',
      label: '기본 정보',
      children: (
        <>
          <div style={{ marginBottom: 12, textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button icon={<LockOutlined />} onClick={() => setIsPasswordModalOpen(true)}>
              비밀번호 변경
            </Button>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/vendors/${id}/edit`)}>
              수정
            </Button>
          </div>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="사업자명">{vendor.name}</Descriptions.Item>
            <Descriptions.Item label="상태">
              <Space>
                <Tag color={vendor.status === 'active' ? 'green' : 'default'}>
                  {VENDOR_STATUS_LABEL[vendor.status]}
                </Tag>
                <Switch
                  checked={vendor.status === 'active'}
                  onChange={(checked) => statusMutation.mutate(checked ? 'active' : 'inactive')}
                  loading={statusMutation.isPending}
                />
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="사업자번호">{vendor.business_number}</Descriptions.Item>
            <Descriptions.Item label="대표자">{vendor.representative}</Descriptions.Item>
            <Descriptions.Item label="담당자">{vendor.contact_name}</Descriptions.Item>
            <Descriptions.Item label="연락처">{formatPhoneNumber(vendor.contact_phone)}</Descriptions.Item>
            <Descriptions.Item label="이메일">{vendor.email}</Descriptions.Item>
            <Descriptions.Item label="수수료율">
              <Space>
                <span>{vendor.commission_rate}%</span>
                <Button size="small" onClick={() => setIsCommissionModalOpen(true)}>
                  변경
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="주소" span={2}>
              {vendor.address}
              {vendor.address_detail && ` ${vendor.address_detail}`}
              {vendor.zipcode && ` (${vendor.zipcode})`}
            </Descriptions.Item>
            <Descriptions.Item label="은행명">{vendor.bank_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="계좌번호">{vendor.bank_account || '-'}</Descriptions.Item>
            <Descriptions.Item label="예금주">{vendor.bank_holder || '-'}</Descriptions.Item>
            <Descriptions.Item label="세금계산서 E-Mail">{vendor.tax_email || '-'}</Descriptions.Item>
            <Descriptions.Item label="가입일">
              {dayjs(vendor.created_at).format(DATE_FORMAT)}
            </Descriptions.Item>
          </Descriptions>

          <h4 style={{ marginTop: 24, marginBottom: 12 }}>사업자 서류 ({documents.length}개)</h4>
          {documents.length > 0 ? (
            <List
              size="small"
              bordered
              dataSource={documents}
              renderItem={(doc: BusinessOwnerDocument) => (
                <List.Item>
                  <Space>
                    {doc.mime_type?.includes('pdf') ? (
                      <FilePdfOutlined style={{ color: '#ff4d4f' }} />
                    ) : doc.mime_type?.includes('image') ? (
                      <FileImageOutlined style={{ color: '#1890ff' }} />
                    ) : (
                      <FileOutlined />
                    )}
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      {doc.file_name}
                    </a>
                    {doc.file_size && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        ({(doc.file_size / 1024 / 1024).toFixed(2)} MB)
                      </Typography.Text>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          ) : (
            <div style={{ padding: 16, background: '#fafafa', borderRadius: 6 }}>
              <Typography.Text type="secondary">등록된 서류가 없습니다</Typography.Text>
            </div>
          )}
        </>
      ),
    },
    {
      key: 'products',
      label: '상품 관리',
      children: <VendorBusinessesTab vendorId={id!} />,
    },
    {
      key: 'settlements',
      label: '정산 내역',
      children: (
        <Table
          columns={settlementColumns}
          dataSource={settlementsData?.data || []}
          rowKey="id"
          size="small"
          bordered
          pagination={{
            current: settlementPage,
            pageSize: DEFAULT_PAGE_SIZE,
            total: settlementsData?.total || 0,
            showTotal: (total) => `총 ${total}개`,
            onChange: (page) => setSettlementPage(page),
            size: 'small',
          }}
        />
      ),
    },
    {
      key: 'commission',
      label: '수수료 이력',
      children: (
        <>
          <div style={{ marginBottom: 12, textAlign: 'right' }}>
            <Button type="primary" onClick={() => setIsCommissionModalOpen(true)}>
              수수료 변경
            </Button>
          </div>
          <Table
            columns={commissionColumns}
            dataSource={commissionHistories || []}
            rowKey="id"
            size="small"
            bordered
            pagination={false}
          />
        </>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Avatar
          src={vendor.logo_url}
          icon={!vendor.logo_url && <ShopOutlined />}
          size={48}
          style={{ backgroundColor: vendor.logo_url ? undefined : '#f0f0f0', color: '#999' }}
        />
        <h2 style={{ margin: 0 }}>{vendor.name}</h2>
      </div>

      <Tabs items={tabItems} />

      <Divider />

      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vendors')}>
        목록으로
      </Button>

      {/* 수수료 변경 모달 */}
      <Modal
        title="수수료 변경"
        open={isCommissionModalOpen}
        onOk={handleCommissionSubmit}
        onCancel={() => {
          setIsCommissionModalOpen(false)
          commissionForm.resetFields()
        }}
        confirmLoading={commissionMutation.isPending}
        okText="변경"
        cancelText="취소"
      >
        <Form form={commissionForm} layout="vertical">
          <Form.Item label="현재 수수료율">
            <strong>{vendor.commission_rate}%</strong>
          </Form.Item>
          <Form.Item
            name="new_rate"
            label="변경할 수수료율"
            rules={[
              { required: true, message: '수수료율을 입력하세요' },
              { type: 'number', min: 5, max: 15, message: '5~15% 사이여야 합니다' },
            ]}
          >
            <InputNumber min={5} max={15} step={0.5} addonAfter="%" style={{ width: 120 }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="변경 사유"
            rules={[{ required: true, message: '변경 사유를 입력하세요' }]}
          >
            <Input.TextArea rows={3} placeholder="수수료 변경 사유를 입력하세요" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 비밀번호 변경 모달 */}
      <Modal
        title="비밀번호 변경"
        open={isPasswordModalOpen}
        onOk={handlePasswordSubmit}
        onCancel={() => {
          setIsPasswordModalOpen(false)
          passwordForm.resetFields()
        }}
        confirmLoading={passwordMutation.isPending}
        okText="변경"
        cancelText="취소"
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item label="사업주">
            <strong>{vendor.name}</strong> ({vendor.email})
          </Form.Item>
          <Form.Item
            name="password"
            label="새 비밀번호"
            rules={[
              { required: true, message: '비밀번호를 입력하세요' },
              { min: 6, message: '6자 이상 입력해주세요' },
            ]}
          >
            <Input.Password placeholder="6자 이상 입력" style={{ width: 240 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
