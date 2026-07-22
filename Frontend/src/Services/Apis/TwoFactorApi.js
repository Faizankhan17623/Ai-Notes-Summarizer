const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const TwoFactorData = {
    setup: BASE_URL + "/2fa/setup",
    enable: BASE_URL + "/2fa/enable",
    disable: BASE_URL + "/2fa/disable",
    verify: BASE_URL + "/2fa/verify",
}
