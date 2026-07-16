import jwt from "jsonwebtoken"
import dotenv from 'dotenv'

import User from '../models/userModel.js'

dotenv.config()
const SECRET = process.env.SECRET;

const auth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1]

        if (!token) return res.status(401).json({ message: 'Not authenticated' })

        const isCustomAuth = token.length < 500

        let decodeData;

        //If token is custom token do this
        if(token && isCustomAuth) {
            decodeData = jwt.verify(token, SECRET)

            req.userId = decodeData?.id

        } else {
            //Else of token is google token then do this
            decodeData = jwt.decode(token)

            req.userId = decodeData?.sub
        }

        if (!req.userId) return res.status(401).json({ message: 'Invalid token' })

        const user = await User.findById(req.userId)

        if (!user) return res.status(401).json({ message: 'Not authenticated' })
        if (user.active === false) return res.status(403).json({ message: 'Account disabled' })

        req.currentUser = user

        next()

    } catch (error) {
        res.status(401).json({ message: 'Not authenticated' })
    }
}

export default auth
