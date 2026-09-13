const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const FeedbackData = {
    submit: BASE_URL + "/feedback",   // + /:type ('bug' | 'feature')
    mine: BASE_URL + "/reports/mine",
}
