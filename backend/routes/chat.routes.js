// routes/chat.routes.js
import { Router } from "express";
import { getHistory, getInbox, markRead, sharePost, editMessage, deleteMessage, reactMessage } from "../controllers/chat.controller.js";

// If you already have an auth middleware, plug it in here:
import isAuth from "../middlewares/isAuth.js";

const router = Router();


router.post("/share-post", isAuth, sharePost);
router.get("/history/:withUser", isAuth, getHistory);
router.get("/inbox", isAuth, getInbox);
router.patch("/read/:withUser", isAuth, markRead);
router.patch("/message/:id", isAuth, editMessage);
router.delete("/message/:id", isAuth, deleteMessage);
router.post("/message/:id/react", isAuth, reactMessage);

export default router;
