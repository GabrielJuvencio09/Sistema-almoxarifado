const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../controllers/almoxarifadoController");
const nfeController = require("../controllers/nfeController");
const { verificarAutenticacao } = require("../middlewares/auth");

const upload = multer({ storage: multer.memoryStorage() });
router.use(verificarAutenticacao);

// GETS
router.use(verificarAutenticacao);
router.get("/stats", controller.getStats);
router.get("/produtos", controller.getProdutos); 
router.get("/produtos-lista", controller.getProdutosLista); 
router.get("/movimentacoes", controller.getMovimentacoes); 
router.get("/movimentacoes/export", controller.exportMovimentacoes); 
router.get("/notas-fiscais", controller.getNotasFiscais);
router.get("/produtos/:sku", controller.getProdutoPorSku);
router.get("/stats/hoje", controller.getStatsDoDia);
router.get("/relatorios/gastos-mensais", controller.getGastosMensais); 
router.get("/relatorios/consumo-destino", controller.getConsumoPorDestino); 
router.get("/relatorios/consumo-detalhado", controller.getConsumoDetalhado);
router.get("/listas/categorias", controller.getCategorias);
router.get("/listas/fornecedores", controller.getFornecedores);
router.get("/provisionamento", controller.getProvisionamento);

//POST
router.post("/movimentacoes", controller.addMovimentacao);
router.post("/produtos", controller.addProduto);
router.post("/notas-fiscais", controller.addNotaFiscal);
router.post(
  "/parse-nfe",
  upload.single("file"), 
  nfeController.parseNFe
);

//PUT
router.put("/produtos/:sku", controller.updateProduto);

//DELETE
router.delete("/produtos/:sku", controller.deleteProduto);

module.exports = router;