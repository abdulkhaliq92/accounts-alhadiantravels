import express from 'express'

import auth from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import { getClients, createClient, updateClient, deleteClient, getClient } from '../controllers/clients.js'

const router = express.Router()

router.get('/', auth, getClients)
router.get('/:id', auth, getClient)
router.post('/', auth, requirePermission('customersManage'), createClient)
router.patch('/:id', auth, requirePermission('customersManage'), updateClient)
router.delete('/:id', auth, requirePermission('customersManage'), deleteClient)

export default router
