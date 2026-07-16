import express from 'express'

import auth from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import { createInvoice, updateInvoice, deleteInvoice, getInvoice, getInvoices, getTotalCount } from '../controllers/invoices.js'

const router = express.Router()

router.get('/count', auth, requirePermission('invoicesView'), getTotalCount) //use to generate invoice serial number
router.get('/:id', auth, requirePermission('invoicesView'), getInvoice)
router.get('/', auth, requirePermission('invoicesView'), getInvoices)
router.post('/', auth, requirePermission('invoicesCreate'), createInvoice)
router.patch('/:id', auth, requirePermission('invoicesEdit'), updateInvoice)
router.delete('/:id', auth, requirePermission('invoicesDelete'), deleteInvoice)


export default router
