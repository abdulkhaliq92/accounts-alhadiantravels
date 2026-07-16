import express from 'express'

import auth from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import {
  getProfile,
  getSharedProfile,
  createProfile,
  updateProfile,
  updateBankAccounts,
  deleteProfile,
} from '../controllers/profile.js'

const router = express.Router()

router.get('/shared', auth, getSharedProfile)
router.get('/:id', auth, getProfile)
router.post('/', auth, requirePermission('settingsManage'), createProfile)
router.patch('/:id', auth, requirePermission('settingsManage'), updateProfile)
router.patch('/:id/bank-accounts', auth, requirePermission('bankAccountsManage'), updateBankAccounts)
router.delete('/:id', auth, requirePermission('settingsManage'), deleteProfile)

export default router
