// 테스트용 목 데이터

export const MOCK_ORDERS = {
  data: Array.from({ length: 47 }, (_, i) => ({
    orderId: `ORD-2024-${String(i + 1).padStart(4, '0')}`,
    orderedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    totalPrice: Math.floor(Math.random() * 50000) + 10000,
    status: 'ACCEPT',
    orderItems: [
      {
        vendorItemId: `ITEM-${(i % 5) + 1}`,
        salesPrice: Math.floor(Math.random() * 50000) + 10000,
        quantity: Math.floor(Math.random() * 3) + 1,
      }
    ]
  }))
};

export const MOCK_RETURNS = {
  data: Array.from({ length: 4 }, (_, i) => ({
    cancelId: `CAN-2024-${String(i + 1).padStart(4, '0')}`,
    cancelCompletedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    refundPrice: Math.floor(Math.random() * 50000) + 10000,
    cancelType: 'RETURN',
  }))
};

export const MOCK_PRODUCTS = {
  data: [
    { sellerProductId: 1, sellerProductName: '프리미엄 무선 이어폰', status: 'APPROVED',
      items: [{ vendorItemId: 'ITEM-1', itemName: '프리미엄 무선 이어폰 (블랙)', originalPrice: 45000, salePrice: 38000, stockQuantity: 24 }] },
    { sellerProductId: 2, sellerProductName: '휴대용 보조배터리 10000mAh', status: 'APPROVED',
      items: [{ vendorItemId: 'ITEM-2', itemName: '휴대용 보조배터리 10000mAh', originalPrice: 28000, salePrice: 22000, stockQuantity: 51 }] },
    { sellerProductId: 3, sellerProductName: '스테인리스 텀블러 500ml', status: 'APPROVED',
      items: [
        { vendorItemId: 'ITEM-3', itemName: '스테인리스 텀블러 500ml (실버)', originalPrice: 18000, salePrice: 14900, stockQuantity: 38 },
        { vendorItemId: 'ITEM-3B', itemName: '스테인리스 텀블러 500ml (블랙)', originalPrice: 18000, salePrice: 14900, stockQuantity: 12 },
      ]},
    { sellerProductId: 4, sellerProductName: '천연 비누 3종 세트', status: 'APPROVED',
      items: [{ vendorItemId: 'ITEM-4', itemName: '천연 비누 3종 세트', originalPrice: 15000, salePrice: 12500, stockQuantity: 67 }] },
    { sellerProductId: 5, sellerProductName: '캠핑용 접이식 의자', status: 'APPROVED',
      items: [{ vendorItemId: 'ITEM-5', itemName: '캠핑용 접이식 의자 (카키)', originalPrice: 35000, salePrice: 29900, stockQuantity: 15 }] },
  ]
};

export const MOCK_SETTLEMENT = {
  data: Array.from({ length: 23 }, (_, i) => ({
    orderId: `ORD-2024-${String(i + 1).padStart(4, '0')}`,
    orderDate: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().slice(0, 10),
    productName: ['프리미엄 무선 이어폰', '휴대용 보조배터리', '스테인리스 텀블러', '천연 비누 세트', '캠핑용 접이식 의자'][i % 5],
    sellingPrice: Math.floor(Math.random() * 50000) + 10000,
    commissionFee: Math.floor(Math.random() * 5000) + 1000,
    shippingFee: 3000,
    settlementAmount: Math.floor(Math.random() * 40000) + 8000,
  }))
};