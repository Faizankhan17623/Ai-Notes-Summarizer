import { logError } from "../../utils/logError.js"
import { apiConnector } from "../apiConnector.js"
import { AnalyticsData } from "../Apis/AnalyticsApi.js"
import { setAnalytics, setLoading } from "../../Slices/analyticsSlice.js"

const { me } = AnalyticsData

export function GetMyAnalytics(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", me, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAnalytics(response.data.analytics))
        } catch (error) {
            logError("Error fetching analytics", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}
