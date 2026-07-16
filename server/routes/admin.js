import express from 'express'

import auth from '../middleware/auth.js'
import { requireAdmin } from '../middleware/permission.js'
import { listUsers, createUser, updateUser, resetUserPassword, deleteUser } from '../controllers/admin.js'

const router = express.Router()

router.use(auth, requireAdmin)

router.get('/users', listUsers)
router.post('/users', createUser)
router.patch('/users/:id', updateUser)
router.patch('/users/:id/password', resetUserPassword)
router.delete('/users/:id', deleteUser)

export default router
