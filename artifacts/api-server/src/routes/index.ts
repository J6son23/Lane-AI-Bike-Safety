import { Router, type IRouter } from "express";
import healthRouter from "./health";
import acknowledgeRouter from "./acknowledge";

const router: IRouter = Router();

router.use(healthRouter);
router.use(acknowledgeRouter);

export default router;
