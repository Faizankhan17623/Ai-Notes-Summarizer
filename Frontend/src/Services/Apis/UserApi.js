const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const UserData = {
    sendOtp: BASE_URL + "/Send-otp",
    createUser: BASE_URL + "/Createuser",
    login: BASE_URL + "/Login",
    forgotPassword: BASE_URL + "/forgot-password",
    resetPassword: BASE_URL + "/reset-password",
    profile: BASE_URL + "/profile",
    updateFirstName: BASE_URL + "/profile/first-name",
    updateLastName: BASE_URL + "/profile/last-name",
    updateDigestPreference: BASE_URL + "/profile/digest-preference",
    updateDailyGoal: BASE_URL + "/profile/daily-goal",
    modelCatalog: BASE_URL + "/profile/model-catalog",
    updateModel: BASE_URL + "/profile/model",
    completeOnboarding: BASE_URL + "/profile/onboarding-complete",
    updatePassword: BASE_URL + "/profile/password",
    deleteAccount: BASE_URL + "/profile",
    recoverAccount: BASE_URL + "/profile/recover",
    apiKey: BASE_URL + "/api-key",
    logout: BASE_URL + "/logout",
    csrfToken: BASE_URL + "/csrf-token",
    visit: BASE_URL + "/visit",
}
