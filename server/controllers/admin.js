import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

import User from '../models/userModel.js'

const SAFE_FIELDS = '-password -resetToken -expireToken'

const countOtherActiveAdmins = (excludeId) =>
    User.countDocuments({ _id: { $ne: excludeId }, role: 'admin', active: { $ne: false } })

export const listUsers = async (req, res) => {
    try {
        const users = await User.find({}, SAFE_FIELDS).sort({ _id: -1 })

        res.status(200).json({ data: users })
    } catch (error) {
        res.status(404).json({ message: error.message })
    }
}

export const createUser = async (req, res) => {
    const { name, email, password, role, permissions } = req.body

    try {
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' })
        }

        const existingUser = await User.findOne({ email })
        if (existingUser) return res.status(400).json({ message: 'A user with this email already exists' })

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role === 'admin' ? 'admin' : 'staff',
            permissions: permissions ?? {},
        })

        const { password: _password, resetToken, expireToken, ...safeUser } = user.toObject()

        res.status(201).json(safeUser)
    } catch (error) {
        res.status(409).json({ message: error.message })
    }
}

export const updateUser = async (req, res) => {
    const { id } = req.params
    const { name, role, permissions, active } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send('No user with that id')

    try {
        const target = await User.findById(id)
        if (!target) return res.status(404).json({ message: 'User not found' })

        const isSelf = String(req.currentUser._id) === String(target._id)
        const demotingSelf = isSelf && role !== undefined && role !== target.role
        const deactivatingSelf = isSelf && active === false

        if (demotingSelf || deactivatingSelf) {
            return res.status(400).json({ message: 'You cannot change your own role or active status' })
        }

        const losingAdmin = target.role === 'admin' && (role !== undefined && role !== 'admin')
        const losingActive = target.role === 'admin' && active === false

        if (losingAdmin || losingActive) {
            const remaining = await countOtherActiveAdmins(target._id)
            if (remaining === 0) {
                return res.status(400).json({ message: 'Cannot remove the last admin' })
            }
        }

        if (name !== undefined) target.name = name
        if (role !== undefined) target.role = role === 'admin' ? 'admin' : 'staff'
        if (permissions !== undefined) target.permissions = permissions
        if (active !== undefined) target.active = active

        await target.save()

        const { password: _password, resetToken, expireToken, ...safeUser } = target.toObject()

        res.json(safeUser)
    } catch (error) {
        res.status(409).json({ message: error.message })
    }
}

export const resetUserPassword = async (req, res) => {
    const { id } = req.params
    const { password } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send('No user with that id')
    if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12)
        const updated = await User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true })

        if (!updated) return res.status(404).json({ message: 'User not found' })

        res.json({ message: 'Password updated' })
    } catch (error) {
        res.status(409).json({ message: error.message })
    }
}

export const deleteUser = async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send('No user with that id')

    try {
        const target = await User.findById(id)
        if (!target) return res.status(404).json({ message: 'User not found' })

        if (String(req.currentUser._id) === String(target._id)) {
            return res.status(400).json({ message: 'You cannot delete your own account' })
        }

        if (target.role === 'admin') {
            const remaining = await countOtherActiveAdmins(target._id)
            if (remaining === 0) return res.status(400).json({ message: 'Cannot delete the last admin' })
        }

        await User.findByIdAndRemove(id)

        res.json({ message: 'User deleted successfully' })
    } catch (error) {
        res.status(409).json({ message: error.message })
    }
}
