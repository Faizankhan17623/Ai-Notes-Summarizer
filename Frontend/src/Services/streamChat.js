import { getCsrfToken } from "./apiConnector.js"

// axios can't easily consume a streaming response body in the browser sir, so the
// token-by-token chat reply uses a plain fetch() against the SSE routes instead
// (Backend/Routes/Chat.js: POST .../message/stream and .../regenerate/stream).
// Still sends the same auth (bearer + httpOnly cookie) and CSRF header as apiConnector.
export const streamChatMessage = async ({ url, body, token, onToken, onDone, onError, onTranscript }) => {
    // FormData (voice-mode audio upload) needs the browser to set its own multipart
    // Content-Type/boundary header sir — only set it ourselves for the plain-JSON case
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData
    let response
    try {
        response = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: {
                ...(isFormData ? {} : { "Content-Type": "application/json" }),
                Authorization: `Bearer ${token}`,
                "x-csrf-token": getCsrfToken() || "",
            },
            body: isFormData ? body : JSON.stringify(body || {}),
        })
    } catch (networkErr) {
        onError({ response: null, message: networkErr.message })
        return
    }

    if (!response.ok || !response.body) {
        // stream never started sir — the backend responded with plain JSON (400/403/404/etc)
        let data = null
        try { data = await response.json() } catch { /* non-JSON error body, fall through with data=null */ }
        onError({ response: { status: response.status, data } })
        return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let boundary
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)

            const eventLine = rawEvent.split("\n").find((l) => l.startsWith("event: "))
            const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data: "))
            if (!dataLine) continue

            const eventName = eventLine ? eventLine.slice("event: ".length).trim() : "message"
            let payload
            try {
                payload = JSON.parse(dataLine.slice("data: ".length))
            } catch {
                continue
            }

            if (eventName === "transcript") {
                onTranscript?.(payload.text)
            } else if (eventName === "token") {
                onToken(payload.token)
            } else if (eventName === "done") {
                onDone(payload.reply)
                return
            } else if (eventName === "error") {
                onError({ response: { status: 502, data: { success: false, message: payload.message } } })
                return
            }
        }
    }
}
