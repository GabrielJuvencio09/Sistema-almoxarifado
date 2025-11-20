// Em: app/modules/almoxarifado/nfeController.js

const xml2js = require("xml2js");
const logError = (msg, err) => console.error(msg, err);

// Esta é a função que "lê" o XML
async function parseNFe(req, res) {
  try {
   
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo XML enviado." });
    }

    const xmlData = req.file.buffer.toString("utf-8");

   
    const parser = new xml2js.Parser({
      explicitArray: false, // Simplifica o JSON final
      ignoreAttrs: true, // Ignora atributos do XML (ex: <tag versao="1.0">)
    });

    // 2. Traduz o XML para JSON
    const result = await parser.parseStringPromise(xmlData);

    // 3. Extrai os dados que queremos (este é o "caminho" dentro do XML da NF-e)
    const nfeProc = result.nfeProc;
    if (!nfeProc) {
      return res
        .status(400)
        .json({
          error: "XML de NF-e inválido (estrutura nfeProc não encontrada).",
        });
    }

    const NFe = nfeProc.NFe.infNFe;
    const emit = NFe.emit;
    const ide = NFe.ide; 
    const det = NFe.det; 

    // 4. Formata os dados para o nosso formulário
    const dadosFormatados = {
      invoiceNumber: ide.nNF,
      supplier: emit.xNome,
      issueDate: ide.dhEmi.split("T")[0], // Pega só a data (AAAA-MM-DD)

    
      items: (Array.isArray(det) ? det : [det]).map(item => ({
        
        productSku: item.prod.cProd.replace(/\//g, '-'), 
       
        productName: item.prod.xProd,
        quantity: parseFloat(item.prod.qCom),
        unitPrice: parseFloat(item.prod.vUnCom)
      })),
    };

    res.status(200).json(dadosFormatados);
  } catch (err) {
    logError("Erro ao processar XML da NF-e:", err);
    res.status(500).json({ error: "Erro interno ao processar o XML." });
  }
}

module.exports = {
  parseNFe,
};
