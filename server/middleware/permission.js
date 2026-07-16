export const requirePermission = (key) => (req, res, next) => {
    const user = req.currentUser

    if (!user) return res.status(401).json({ message: 'Not authenticated' })
    if (user.role === 'admin' || user.permissions?.[key]) return next()

    res.status(403).json({ message: 'You do not have permission to do this' })
}

export const requireAdmin = (req, res, next) => {
    const user = req.currentUser

    if (!user) return res.status(401).json({ message: 'Not authenticated' })
    if (user.role === 'admin') return next()

    res.status(403).json({ message: 'Admin access required' })
}
