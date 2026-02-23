export function formatVoucher(voucher: {
  id: string;
  code: string | null;
  number: string;
  hotel: number;
  lang: string;
  createdAt: string | null;
  usedAt: string | null;
  canceledAt: string | null;
  paidAt: string | null;
  variableSymbol: number;
  active: boolean;
  price: number;
  purchasePrice: number;
  currency: string;
  validity: string;
  paymentType: string;
  deliveryType: string;
  deliveryPrice: number;
  note: string | null;
  format: string;
  gift: string | null;
  giftMessage: string | null;
  usedIn: string | null;
  reservationNumber: string | null;
  valueTotal: number;
  valueRemaining: number;
  valueUsed: number;
  applicableInBookolo: boolean;
  isPrivateType: boolean;
  isFreeType: boolean;
  customerData: Record<string, unknown>;
  giftData: Record<string, unknown>;
  version: number;
  updatedAt: string | null;
}) {
  return {
    id: voucher.id,
    code: voucher.code,
    number: voucher.number,
    hotel: voucher.hotel,
    lang: voucher.lang,
    createdAt: voucher.createdAt,
    usedAt: voucher.usedAt,
    canceledAt: voucher.canceledAt,
    paidAt: voucher.paidAt,
    variableSymbol: voucher.variableSymbol,
    active: voucher.active,
    price: voucher.price,
    purchasePrice: voucher.purchasePrice,
    currency: voucher.currency,
    validity: voucher.validity,
    paymentType: voucher.paymentType,
    deliveryType: voucher.deliveryType,
    deliveryPrice: voucher.deliveryPrice,
    note: voucher.note,
    format: voucher.format,
    gift: voucher.gift,
    giftMessage: voucher.giftMessage,
    usedIn: voucher.usedIn,
    reservationNumber: voucher.reservationNumber,
    valueTotal: voucher.valueTotal,
    valueRemaining: voucher.valueRemaining,
    valueUsed: voucher.valueUsed,
    applicableInBookolo: voucher.applicableInBookolo,
    isPrivateType: voucher.isPrivateType,
    isFreeType: voucher.isFreeType,
    customerData: voucher.customerData,
    giftData: voucher.giftData,
    version: voucher.version,
    updatedAt: voucher.updatedAt,
  };
}
