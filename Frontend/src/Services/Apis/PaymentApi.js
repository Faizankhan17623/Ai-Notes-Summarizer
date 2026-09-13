const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const PaymentData = {
    plans: BASE_URL + "/payment/plans",
    createOrder: BASE_URL + "/payment/order",
    verifyPayment: BASE_URL + "/payment/verify",
    history: BASE_URL + "/payment/history",
    cancelSubscription: BASE_URL + "/payment/cancel",
}
