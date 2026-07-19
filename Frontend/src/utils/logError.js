// Safe replacement for console.error(label, axiosError) sir. The raw Axios error object
// carries error.config — which includes the outgoing request's headers, and every
// authenticated call sends Authorization: Bearer <JWT> there. Logging that object let
// anyone with DevTools open expand it and lift a live access token straight out of the
// console, no network sniffing needed. Same risk from error.response.data echoing back
// whatever the server sent (can include other request fields on some error paths).
//
// Only pull out what's actually useful for debugging: the human message and the HTTP
// status. Never the config, never the raw response body.
export function logError(label, error) {
    console.error(label, {
        message: error?.message,
        status: error?.response?.status,
    })
}
