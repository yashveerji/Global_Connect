import express from "express"
import { getCurrentUser, getprofile, getSuggestedUser, search, updateProfile, getLastSeen, removeProfileImage, removeCoverImage } from "../controllers/user.controllers.js"
import isAuth from "../middlewares/isAuth.js"
import upload from "../middlewares/multer.js"

let userRouter=express.Router()

userRouter.get("/currentuser",isAuth,getCurrentUser)
userRouter.put("/updateprofile",isAuth,upload.fields([
   {name:"profileImage",maxCount:1} ,
   {name:"coverImage",maxCount:1}
]),updateProfile)
userRouter.get("/profile/:userName",isAuth,getprofile)
userRouter.get("/search",isAuth,search)
userRouter.get("/suggestedusers",isAuth,getSuggestedUser)
userRouter.get("/:id/last-seen", isAuth, getLastSeen)
userRouter.delete("/profile-image", isAuth, removeProfileImage)
userRouter.delete("/cover-image", isAuth, removeCoverImage)
export default userRouter