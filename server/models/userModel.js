import mongoose from 'mongoose'

const permissionsSchema = {
    invoicesView: { type: Boolean, default: false },
    invoicesCreate: { type: Boolean, default: false },
    invoicesEdit: { type: Boolean, default: false },
    invoicesDelete: { type: Boolean, default: false },
    customersManage: { type: Boolean, default: false },
    settingsManage: { type: Boolean, default: false },
    bankAccountsManage: { type: Boolean, default: false },
}

const userSchema = mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    resetToken:String,
    expireToken:Date,
    role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
    active: { type: Boolean, default: true },
    permissions: { type: permissionsSchema, default: () => ({}) },
})

const User = mongoose.model('User', userSchema)

export default User