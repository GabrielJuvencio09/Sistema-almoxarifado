const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser"); 
require("dotenv").config();


const almoxarifadoRoutes = require("./src/routes/almoxarifado.routes");

const { authRouter } = require("./src/middlewares/auth");

const app = express();


app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser()); 

// Rotas
app.use("/auth", authRouter); 
app.use("/api/almoxarifado", almoxarifadoRoutes); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
