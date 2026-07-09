import axios from "axios"

// withCredentials so the httpOnly auth cookie flows sir
export const axiosinstance = axios.create({
    withCredentials: true
})

export const apiConnector = (method, url, bodyData = null, headers = {}, params) => {
    return axiosinstance({
        method: `${method}`,
        url: `${url}`,
        data: bodyData ? bodyData : null,
        headers: headers ? headers : null,
        params: params ? params : null
    })
}
