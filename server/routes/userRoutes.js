import express from 'express'
import { signin, forgotPassword, resetPassword } from '../controllers/user.js'

const router = express.Router()

router.post('/signin', signin)
router.post('/forgot', forgotPassword);
router.post('/reset', resetPassword);

export default router