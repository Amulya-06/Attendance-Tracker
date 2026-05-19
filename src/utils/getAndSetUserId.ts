export function getAndSetUserId() {
    let userId = localStorage.getItem("userId")

    if (!userId) {
        userId = crypto.randomUUID()
        localStorage.setItem("userId", userId)
    }

    return userId
}