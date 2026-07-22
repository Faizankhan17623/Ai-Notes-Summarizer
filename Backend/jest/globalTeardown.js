// stops the in-memory MongoDB instance globalSetup.js started sir — runs once after the
// whole test run, not per-file
module.exports = async () => {
    if (global.__MONGOD__) {
        await global.__MONGOD__.stop()
    }
}
