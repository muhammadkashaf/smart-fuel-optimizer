// Explicit local-only UI test server. Uses no database and no real routing credentials.
import app from "../../app.js";
import { installPlannerFixture } from "./plannerFixture.js";

process.env.JWT_SECRET = "planner-preview-test-only";
installPlannerFixture();
app.listen(5055, "127.0.0.1", () => console.log("Isolated planner preview API: http://127.0.0.1:5055"));
