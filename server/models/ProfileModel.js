import mongoose from 'mongoose'

const bankAccountSchema = {
    label: String,
    bankName: String,
    accountTitle: String,
    accountNumber: String,
    iban: String,
    swiftCode: String,
    branchAddress: String,
    currency: String,
    isDefault: Boolean,
    notes: String,
}

const profileSchema = mongoose.Schema({
    name: String,
    email: {type: String, required: true, unique: true},
    phoneNumber: String,
    businessName: String,
    contactAddress: String,
    paymentDetails: String,
    logo: String,
    website: String,
    userId: [String],
    bankAccounts: [bankAccountSchema],
})

const Profile = mongoose.model('Profile', profileSchema)

export default Profile