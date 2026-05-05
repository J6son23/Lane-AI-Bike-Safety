import { Router, type IRouter } from "express";
import healthRouter from "./health";
import acknowledgeRouter from "./acknowledge";
import analyzeHazardRouter from "./analyze-hazard";
import staffRouter from "./staff";
import dispatchReportRouter from "./dispatch-report";
import geocodeRouter from "./geocode";
import reportsMapRouter from "./reports-map";
import pedalPatrolReportRouter from "./pedal-patrol-report";
import aiSummarizeRouter from "./ai-summarize";

const router: IRouter = Router();

router.use(healthRouter);
router.use(acknowledgeRouter);
router.use(analyzeHazardRouter);
router.use(staffRouter);
router.use(dispatchReportRouter);
router.use(geocodeRouter);
router.use(reportsMapRouter);
router.use(pedalPatrolReportRouter);
router.use(aiSummarizeRouter);

export default router;
