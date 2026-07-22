// Jest manual mock sir — file-type@21 is ESM-only and Jest's default CommonJS resolver can't
// require() it. Only utils/FileValidation.js touches this package (magic-byte file-upload
// validation), which none of the current test suites (auth/payments/credits) exercise — this
// stub just lets the require chain resolve cleanly when Routes/Notes.js -> controllers/AI.js
// -> utils/Parsers.js -> utils/FileValidation.js gets pulled in via app.js. If a future test
// needs real file-upload validation, replace this with a proper per-test mock of the specific
// return shape FileValidation.js expects instead of trying to make the real ESM package work
// under Jest's CommonJS transform.
module.exports = {
    fileTypeFromBuffer: async () => null,
}
