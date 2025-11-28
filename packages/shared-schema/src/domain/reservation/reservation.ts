// import {z} from 'zod';
//
// export const BookingEngineContactSchema = z.object({
//     email: z.string(),
//     phone: z.string(),
// });
//
// // Customer
// export const BookingEngineCustomerSchema = z.object({
//     firstName: z.string(),
//     lastName: z.string(),
//     title: z.string(),
//     comment: z.string().nullable(),
//     contact: BookingEngineContactSchema,
// });
//
// export type BookingEngineCustomer = z.infer<typeof BookingEngineCustomerSchema>;
//
// export const BookingEngineCompanySchema = z.object({
//     id: z.string(),
//     dic: z.string().optional().nullable(),
//     street: z.string().optional().nullable(),
//     city: z.string().optional().nullable(),
//     postalCode: z.string().optional().nullable(),
//     country: z.string().optional().nullable(),
//     name: z.string(),
//     comment: z.string().nullable(),
//     contact: BookingEngineContactSchema,
// });
//
// export type BookingEngineCompany = z.infer<typeof BookingEngineCompanySchema>;
//
// // Room
// export const BookingEngineRoomSchema = z.object({
//     code: z.string(),
//     roomCode: z.string(),
//     roomName: z.string(),
//     rateCode: z.string(),
//     nightCount: z.number().int(),
//     totalPrice: z.number(),
//     extras: z.array(z.any()), // adjust type if you know structure of extras
//     extrasPrice: z.number().optional().nullable(),
//     localTax: z.number().optional().nullable(),
//     rate: z.object({
//         id: z.number(),
//         code: z.string(),
//         name: z.string(),
//     }),
//     occupancy: z.object({
//         adultCount: z.number(),
//         child12to17Count: z.number(),
//         child6to11Count: z.number(),
//         child3to5Count: z.number(),
//         child0to2Count: z.number(),
//     }),
//     childrenAges: z.array(z.number()).optional().nullable(),
//     childrenBeddingPreference: z.array(z.object({
//         age: z.number(),
//         option: z.enum(['CRIB_REQUESTED', 'EXTRA_BED_REQUESTED', 'SHARES_BED_WITH_PARENTS']),
//     })).optional().nullable(),
//     preferredBedConfiguration: z.array(z.object({
//         quantity: z.number(),
//         name: z.enum(['Single bed','Double bed','Twin bed'])
//     })).optional().nullable()
// });
//
// export type BookingEngineRoom = z.infer<typeof BookingEngineRoomSchema>;
//
// // Booking
// export const BookingEngineCreatePaymentSchema = z.object({
//     paidAmount: z.number(),
//     paymentType: z.enum(['CREDIT_CARD', 'APPLE_PAY', 'GOOGLE_PAY']),
//     currency: z.string(),
// });
// export type BookingEngineCreatePayment = z.infer<typeof BookingEngineCreatePaymentSchema>;
//
// export const BookingEngineCreateVoucherTransactionSchema = z.object({
//     amount: z.object({
//         amount: z.number(),
//         currency: z.string(),
//     }),
//     transactionId: z.string(),
//     voucherNumber: z.string(),
//     status: z.enum(['SUCCESSFUL','FAILED','CREATED']),
//     errorMessage: z.string().optional().nullable()
// });
// export type BookingEngineCreateVoucherTransaction = z.infer<typeof BookingEngineCreateVoucherTransactionSchema>;
//
// export const BookingEngineCreateBookingSchema = z.object({
//     originId: z.string(),
//     totalAmount: z.number(),
//     dueAmount: z.number(),
//     paidAmount: z.number(),
//     payableAmount: z.number(),
//     action: z.literal('create'),
//     currency: z.string(),
//     date: z.string(),
//     paxCount: z.number().int(),
//     adultCount: z.number().int(),
//     childCount: z.number().int(),
//     infantCount: z.number().int(),
//     arrivalTime: z.string(),
//     departureTime: z.string(),
//     customer: BookingEngineCustomerSchema.optional().nullable(),
//     company: BookingEngineCompanySchema.optional().nullable(),
//     cancelLink: z.string().url(),
//     cancelConditions: z.string(),
//     rooms: z.array(BookingEngineRoomSchema),
//     vat: z.number(),
//     payment: BookingEngineCreatePaymentSchema.optional().nullable(),
//     voucherPayment: z.object({
//         amount: z.number(),
//         currency: z.string(),
//     }).optional().nullable(),
//     gatewayPayment: z.object({
//         amount: z.number(),
//         currency: z.string(),
//     }).optional().nullable(),
//     voucherTransactions: z.array(BookingEngineCreateVoucherTransactionSchema).optional().nullable(),
//     promoCode: z.string().optional().nullable(),
// });
// export const BookingEngineCancelBookingSchema = z.object({
//     originId: z.string(),
//     totalAmount: z.number(),
//     payableAmount: z.number(),
//     cancellationFees: z.number().optional().nullable(),
//     warrantyAmount: z.number().optional().nullable(),
//     action: z.literal('cancel'),
//     currency: z.string(),
//     date: z.string(),
//     paxCount: z.number().int(),
//     adultCount: z.number().int(),
//     childCount: z.number().int(),
//     infantCount: z.number().int(),
//     arrivalTime: z.string(),
//     departureTime: z.string(),
//     customer: BookingEngineCustomerSchema.optional().nullable(),
//     company: BookingEngineCompanySchema.optional().nullable(),
//     cancelConditions: z.string(),
//     rooms: z.array(BookingEngineRoomSchema),
//     vat: z.number(),
// });
//
// // Root schema
// export const BookingEngineCreateSchema = z.object({
//     id: z.string(),
//     hotelId: z.number().int(),
//     hotelCode: z.string(),
//     language: z.string(),
//     booking: BookingEngineCreateBookingSchema,
// });
//
// export type BookingEngineCreate = z.infer<typeof BookingEngineCreateSchema>;
//
// // Root schema
// export const BookingEngineCancelSchema = z.object({
//     id: z.string(),
//     hotelId: z.number().int(),
//     hotelCode: z.string(),
//     language: z.string(),
//     booking: BookingEngineCancelBookingSchema,
// });
//
// export type BookingEngineCancel = z.infer<typeof BookingEngineCancelSchema>;
//
// export const MyOreaNotifyRoomSchema = z.object({
//     count: z.number(),
//     extras: z.string().optional().nullable(),
//     nights: z.number(),
//     price: z.string(),
//     ratecode: z.string(),
//     type: z.string(),
// });
//
// export const MyOreaNotifyPaymentSchema = z.object({
//     type: z.enum(['voucher', 'card']),
//     amount: z.string(),
//     voucher: z.string().optional().nullable(),
// })
//
// export type MyOreaNotifyPayment = z.infer<typeof MyOreaNotifyPaymentSchema>;
//
// export const MyOreaCreateNotifyVariablesSchema = z.object({
//     hotelId: z.number(),
//     recipientName: z.string(),
//     reservationCode: z.string(),
//     arrivalDate: z.string(),
//     departureDate: z.string(),
//     countOfAdults: z.number(),
//     countOfChildren: z.number(),
//     countOfRooms: z.number(),
//     guestNote: z.string(),
//     localFees: z.string(),
//     total: z.string(),
//     remainsToPay: z.string(),
//     payed: z.string().optional().nullable(),
//     vat: z.string(),
//     cancelLink: z.string().url(),
//     cancelText: z.string(),
//     rooms: z.array(MyOreaNotifyRoomSchema),
//     payedDetail: z.array(MyOreaNotifyPaymentSchema)
// });
//
// export const MyOreaCancelNotifyVariablesSchema = z.object({
//     hotelId: z.number(),
//     recipientName: z.string(),
//     reservationCode: z.string(),
//     arrivalDate: z.string(),
//     departureDate: z.string(),
//     countOfAdults: z.number(),
//     countOfChildren: z.number(),
//     countOfRooms: z.number(),
//     total: z.string(),
//     vat: z.string(),
//     cancelText: z.string(),
//     cancellationFees: z.string().optional().nullable(),
//     warrantyAmount: z.string().optional().nullable(),
//     totalAmountToPay: z.string().optional().nullable(),
//     rooms: z.array(MyOreaNotifyRoomSchema),
//     localFees: z.string(),
// });
//
// export const MyOreaNotifyContactSchema = z.object({
//     email: z.string(),
// });
//
// export const MyOreaCreateNotifySchema = z.object({
//     templateId: z.number(),
//     language: z.string(),
//     variables: MyOreaCreateNotifyVariablesSchema,
//     contact: MyOreaNotifyContactSchema,
// });
//
// export type MyOreaCreateNotify = z.infer<typeof MyOreaCreateNotifySchema>;
//
// export const MyOreaCancelNotifySchema = z.object({
//     templateId: z.number(),
//     language: z.string(),
//     variables: MyOreaCancelNotifyVariablesSchema,
//     contact: MyOreaNotifyContactSchema,
// });
//
// export type MyOreaCancelNotify = z.infer<typeof MyOreaCancelNotifySchema>;
//
// export const BookingEngineExtrasHotelSchema = z.object({
//     id: z.number(),
//     name: z.string(),
//     code: z.string(),
//     orderPriority: z.number(),
//     detailUrl: z.string(),
// });
//
// export type BookingEngineExtrasHotel = z.infer<typeof BookingEngineExtrasHotelSchema>;
//
// export const BookingEngineExtrasItemSchema = z.object({
//     id: z.number(),
//     name: z.string(),
//     code: z.string(),
//     hotel: BookingEngineExtrasHotelSchema,
//     detailUrl: z.string(),
// });
//
// export type BookingEngineExtrasItem = z.infer<typeof BookingEngineExtrasItemSchema>;
//
// export const BookingEngineExtrasSchema = z.array(BookingEngineExtrasItemSchema);
//
// export type BookingEngineExtras = z.infer<typeof BookingEngineExtrasSchema>;