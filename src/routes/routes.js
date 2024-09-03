const waRoutes = require("./wa-routes");
const express = require("express");

const routes = express();
routes.get("/", (req, res) => {
  res.status(200).json({
    message: "success",
  });
});

routes.use("/api/v1", waRoutes);

export default routes;
