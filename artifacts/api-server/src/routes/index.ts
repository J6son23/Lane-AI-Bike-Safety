import { Router, type IRouter } from "express";
import healthRouter from "./health";
import acknowledgeRouter from "./acknowledge";
import analyzeHazardRouter from "./analyze-hazard";
import staffRouter from "./staff";

const router: IRouter = Router();

router.use(healthRouter);
router.use(acknowledgeRouter);
router.use(analyzeHazardRouter);
router.use(staffRouter);

export default router;
