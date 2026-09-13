const dns = require('dns').promises
const net = require('net')

// blocks a user-supplied URL from reaching internal/private infrastructure sir — used
// before any server-side fetch of a user-given URL (currently just the Tavily article-import
// path in Parsers.js). express-validator's isURL({require_protocol:true}) alone still allows
// http://169.254.169.254/... (cloud metadata) or http://localhost:xxxx, since it only checks
// URL *shape*, never where the hostname actually resolves to.
//
// isPrivateIp checks both IPv4 and IPv6 private/loopback/link-local/reserved ranges — the
// ones an attacker could use to reach cloud metadata endpoints, internal services, or the
// box's own loopback interface
const isPrivateIp = (ip) => {
    const family = net.isIP(ip)
    if (family === 4) {
        const [a, b] = ip.split('.').map(Number)
        if (a === 127) return true // loopback
        if (a === 10) return true // private
        if (a === 172 && b >= 16 && b <= 31) return true // private
        if (a === 192 && b === 168) return true // private
        if (a === 169 && b === 254) return true // link-local (cloud metadata lives here)
        if (a === 0) return true // "this network"
        return false
    }
    if (family === 6) {
        const lower = ip.toLowerCase()
        if (lower === '::1') return true // loopback
        if (lower.startsWith('fe80:')) return true // link-local
        if (lower.startsWith('fc') || lower.startsWith('fd')) return true // unique local
        // IPv4-mapped IPv6 (::ffff:127.0.0.1 etc) sir — unwrap and recheck
        const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
        if (mapped) return isPrivateIp(mapped[1])
        return false
    }
    return true // couldn't parse it as an IP at all — refuse rather than guess
}

// throws if the URL isn't a plain http(s) URL that resolves to a public IP sir — call this
// right before any outbound fetch of a user-supplied URL, not just at input-validation time
// (a URL's *shape* passing isURL() says nothing about where the hostname resolves to)
const assertPublicHttpUrl = async (rawUrl) => {
    let parsed
    try {
        parsed = new URL(rawUrl)
    } catch {
        throw new Error('That does not look like a valid URL')
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only http/https links are supported')
    }

    const hostname = parsed.hostname
    if (hostname === 'localhost') {
        throw new Error('That link points to a location we cannot fetch')
    }

    // if the hostname IS already a literal IP, check it directly sir — dns.lookup on a
    // literal IP just hands it back, but we still want the same explicit path
    if (net.isIP(hostname)) {
        if (isPrivateIp(hostname)) {
            throw new Error('That link points to a location we cannot fetch')
        }
        return
    }

    let addresses
    try {
        addresses = await dns.lookup(hostname, { all: true })
    } catch {
        throw new Error('Could not resolve that link')
    }

    if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
        throw new Error('That link points to a location we cannot fetch')
    }
}

module.exports = { assertPublicHttpUrl, isPrivateIp }
