const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const OAuthData = {
    // /start and /callback are real top-level navigations (<a href>), never fetched via XHR
    // sir — OAuth's redirect dance requires a full browser navigation, so those two are built
    // as plain URL strings + a provider name in the components, not called through apiConnector
    providers: BASE_URL + "/oauth/providers",
    session: BASE_URL + "/oauth/session",
    startUrl: (provider) => `${BASE_URL}/oauth/${provider}/start`,
}
