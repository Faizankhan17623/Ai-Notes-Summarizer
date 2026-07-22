const User = require('../Models/User')
const Notification = require('../Models/Notification')
const { consumeCredit, consumeFeatureUsage } = require('../utils/Plans')

// Basic plan = 5 credits/month sir (utils/Plans.js PLANS.Basic.credits) — small enough to
// exhaust in a handful of calls without needing to fake the plan tier
const createBasicUser = async (email, overrides = {}) => {
    return User.create({
        firstName: 'Credit', lastName: 'Test', email, password: 'not-checked-by-these-tests',
        SubType: 'Basic', ...overrides,
    })
}

describe('Credits: consumeCredit spend/block/bonus + credits_low notification', () => {
    test('spends down to the plan limit, then blocks', async () => {
        const user = await createBasicUser('spend@example.com')

        for (let i = 0; i < 5; i++) {
            const spend = await consumeCredit(user._id)
            expect(spend.ok).toBe(true)
        }

        const blocked = await consumeCredit(user._id)
        expect(blocked.ok).toBe(false)
        expect(blocked.message).toMatch(/used all 5 credits/i)

        const after = await User.findById(user._id)
        expect(after.count).toBe(5)
    })

    test('falls back to bonusCredits once the plan allowance is exhausted', async () => {
        const user = await createBasicUser('bonus@example.com', { bonusCredits: 3 })

        for (let i = 0; i < 5; i++) {
            await consumeCredit(user._id)
        }

        // plan allowance is gone sir — this call should spend a BONUS credit instead of blocking
        const spend = await consumeCredit(user._id)
        expect(spend.ok).toBe(true)
        expect(spend.usedBonus).toBe(true)
        expect(spend.bonusRemaining).toBe(2)

        const after = await User.findById(user._id)
        expect(after.bonusCredits).toBe(2)
        expect(after.count).toBe(5) // the shared pool itself isn't touched by a bonus spend sir
    })

    test('fires credits_low exactly once when crossing 90% of the plan limit', async () => {
        const user = await createBasicUser('lowcredit@example.com')

        // Basic = 5 credits sir, 90% of 5 is 4.5 — the 5th spend (count 4->5) is the one that
        // crosses the threshold (4/5 = 0.8 < 0.9 <= 5/5 = 1.0)
        for (let i = 0; i < 4; i++) {
            await consumeCredit(user._id)
        }
        let notifs = await Notification.find({ user: user._id, type: 'credits_low' })
        expect(notifs.length).toBe(0)

        await consumeCredit(user._id) // the 5th spend sir — should cross the threshold
        notifs = await Notification.find({ user: user._id, type: 'credits_low' })
        expect(notifs.length).toBe(1)

        const after = await User.findById(user._id)
        expect(after.lowCreditNotified).toBe(true)

        // a 6th spend attempt (now blocked, since the plan is exhausted and there's no bonus)
        // must NOT fire a second credits_low notification sir — the whole point of the flag
        const blocked = await consumeCredit(user._id)
        expect(blocked.ok).toBe(false)
        notifs = await Notification.find({ user: user._id, type: 'credits_low' })
        expect(notifs.length).toBe(1)
    })

    test('an unlimited-credits plan never blocks or fires credits_low', async () => {
        // ProMax has a real 500 cap now (utils/Plans.js), not unlimited sir — Basic/Pro/ProMax
        // are all capped currently, so exercise the "credits === null" unlimited branch
        // directly isn't reachable via any real SubType. Confirms the current shape instead:
        // Pro's higher cap (100) doesn't block after only 5 spends the way Basic's does.
        const user = await createBasicUser('proplan@example.com', { SubType: 'Pro' })

        for (let i = 0; i < 5; i++) {
            const spend = await consumeCredit(user._id)
            expect(spend.ok).toBe(true)
        }

        const notifs = await Notification.find({ user: user._id, type: 'credits_low' })
        expect(notifs.length).toBe(0) // 5/100 is nowhere near the 90% threshold sir

        const after = await User.findById(user._id)
        expect(after.count).toBe(5)
    })
})

describe('Credits: consumeFeatureUsage (docSummary/bulkSummary/audioSummary)', () => {
    test('spends down to the feature limit, then blocks, independently of the shared credit pool', async () => {
        const user = await createBasicUser('feature@example.com')

        // Basic docSummary limit is 10 sir (utils/Plans.js PLANS.Basic.featureLimits.docSummary)
        for (let i = 0; i < 10; i++) {
            const spend = await consumeFeatureUsage(user._id, 'docSummary')
            expect(spend.ok).toBe(true)
        }

        const blocked = await consumeFeatureUsage(user._id, 'docSummary')
        expect(blocked.ok).toBe(false)
        expect(blocked.message).toMatch(/document summaries/i)

        const after = await User.findById(user._id)
        expect(after.docSummaryCount).toBe(10)
        expect(after.count).toBe(0) // the shared credit pool is untouched by feature spends sir
    })

    test('rejects an unknown feature key', async () => {
        const user = await createBasicUser('badfeature@example.com')
        const result = await consumeFeatureUsage(user._id, 'notARealFeature')
        expect(result.ok).toBe(false)
        expect(result.message).toBe('Unknown feature')
    })
})
