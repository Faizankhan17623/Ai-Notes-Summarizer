// RFC 4180 field quoting sir — wraps in quotes only when needed (comma/quote/newline
// present), doubles any embedded quotes, so a name/message containing a comma doesn't
// silently shift columns in Excel/Sheets
const escapeCsvField = (value) => {
    const s = value === null || value === undefined ? '' : String(value)
    if (/[",\n\r]/.test(s)) {
        return `"${s.replaceAll('"', '""')}"`
    }
    return s
}

// columns: [{ key: 'email', label: 'Email' }] — key can be a dotted path (e.g. 'user.email')
// sir, label becomes the header row; pass get(row) instead of key for computed columns
export const toCsv = (rows, columns) => {
    const header = columns.map((c) => escapeCsvField(c.label)).join(',')
    const body = rows.map((row) =>
        columns.map((c) => {
            const value = c.get ? c.get(row) : c.key.split('.').reduce((v, k) => v?.[k], row)
            return escapeCsvField(value)
        }).join(',')
    )
    // leading BOM sir — makes Excel detect UTF-8 correctly instead of mangling non-ASCII
    // names/messages, harmless no-op for every other CSV reader
    return '﻿' + [header, ...body].join('\r\n')
}

export const downloadCsv = (filename, csvString) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}
