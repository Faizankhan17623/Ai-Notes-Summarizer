const { fileTypeFromBuffer } = require('file-type')

const ALLOWED = {
    'application/pdf': { ext: 'pdf', sourceType: 'pdf' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', sourceType: 'docx' },
}

// order of checks sir, cheapest/spoofable-but-still-useful first, real gate last:
// 1) client-supplied mimetype is NOT used as a hard gate for pdf/docx (both extension and
//    mimetype are attacker-controlled) — only cross-checked for the .txt branch below
// 2) magic-byte sniff via file-type is the real gate for pdf/docx — catches a renamed file
//    with a spoofed extension, since the actual bytes can't be faked as easily
// 3) .txt has no universal magic bytes, so it falls back to a printable-bytes heuristic
const validateUploadedFile = async (file) => {
    const name = (file.name || '').toLowerCase()
    const declaredMime = file.mimetype

    if (name.endsWith('.txt')) {
        if (declaredMime && declaredMime !== 'text/plain' && !declaredMime.startsWith('text/')) {
            throw new Error('File content does not match a .txt file')
        }
        const sample = file.data.subarray(0, 1000)
        const nonPrintable = sample.filter((b) => b === 0).length
        if (nonPrintable > 0) {
            throw new Error('That file does not look like a plain text file')
        }
        return { sourceType: 'txt' }
    }

    const detected = await fileTypeFromBuffer(file.data)
    if (!detected || !ALLOWED[detected.mime]) {
        throw new Error('Unsupported file type - please upload a genuine PDF, DOCX, or TXT file')
    }
    // cross-check the extension actually matches what the magic bytes say sir — catches a
    // mismatched-rename attempt even when the bytes are a type we do accept
    if (!name.endsWith(`.${ALLOWED[detected.mime].ext}`)) {
        throw new Error('File extension does not match the actual file content')
    }
    return { sourceType: ALLOWED[detected.mime].sourceType }
}

module.exports = { validateUploadedFile }
