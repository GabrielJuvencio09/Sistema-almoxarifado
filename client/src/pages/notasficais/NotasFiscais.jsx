// Em: src/pages/NotasFiscais.jsx

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "../../components/Card/Card";
import { Input } from "../../components/Input/Input";
import { Button } from "../../components/Button/Button";
import { Tabs, Tab } from "../../components/Tabs/Tabs";
import { InputFile } from "../../components/InputFile/InputFile";
import { Modal } from "../../components/modal/Modal";
import { TrendingUp, TrendingDown, DollarSign, Barcode } from "lucide-react";
import AsyncSelect from 'react-select/async'; 
import styles from "./NotasFiscais.module.css";
import toast from 'react-hot-toast'; 

const API_URL = import.meta.env.VITE_API_BASE_URL;


const formatCurrency = (value) => {
  if (isNaN(value)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function NotasFiscaisPage() {

  const [allNotas, setAllNotas] = useState([]);
 
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 


  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [isPreCadastroOpen, setIsPreCadastroOpen] = useState(false);
  const [itensParaCadastrar, setItensParaCadastrar] = useState([]);
  const [nfOriginal, setNfOriginal] = useState(null); 


  const [statsDoDia, setStatsDoDia] = useState(null);


  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState([]); 


  const [selectedItem, setSelectedItem] = useState(null); 
  const [currentItemQty, setCurrentItemQty] = useState("");
  const [currentItemPrice, setCurrentItemPrice] = useState("");

  // --- 1. FUNÇÃO DE BUSCA DE DADOS ---
  const fetchData = async () => {
    try {
      const requestOptions = { method: "GET", credentials: "include" };

     
      const [notasRes, statsDiaRes] = await Promise.all([
        fetch(`${API_URL}/api/almoxarifado/notas-fiscais`, requestOptions),
        fetch(`${API_URL}/api/almoxarifado/stats/hoje`, requestOptions),
      ]);
      if (!notasRes.ok || !statsDiaRes.ok)
        throw new Error("Falha ao buscar dados iniciais");

      const notasData = await notasRes.json();
    
      const statsDiaData = await statsDiaRes.json();

      setAllNotas(notasData);
      
      setStatsDoDia(statsDiaData);
    } catch (err) {
      toast.error(err.message); 
    } finally {
      setIsLoading(false); 
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, []);


  const loadOptions = async (inputValue) => {
    if (!inputValue || inputValue.length < 2) {
      return [];
    }
    try {
      const params = new URLSearchParams({ search: inputValue, limit: 10 });
      const res = await fetch(`${API_URL}/api/almoxarifado/produtos?${params.toString()}`, { 
        credentials: 'include' 
      });
      if (!res.ok) throw new Error('Falha ao buscar produtos');
      const data = await res.json(); 
      
      return data.items.map(product => ({
        ...product,
        value: product.sku,
        label: `${product.name} (SKU: ${product.sku})` 
      }));

    } catch (error) {
      toast.error(`Erro ao buscar produtos: ${error.message}`);
      return [];
    }
  };


  // --- 2. FUNÇÕES DO FORMULÁRIO MANUAL ---
  const handleAddItem = () => {
   
    if (!selectedItem || !currentItemQty || !currentItemPrice) {
      toast.error("Preencha todos os campos do item (Produto, Qtd e Preço)."); 
      return;
    }
    

    const newItem = {
      productSku: selectedItem.sku, 
      productName: selectedItem.name, 
      quantity: parseInt(currentItemQty, 10),
      unitPrice: parseFloat(currentItemPrice),
    };

    setItems([...items, newItem]);
    
 
    setSelectedItem(null); 
    setCurrentItemQty("");
    setCurrentItemPrice("");
  };

  const limparFormularioManual = () => {
    setInvoiceNumber("");
    setSupplier("");
    setIssueDate("");
    setItems([]);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !invoiceNumber ||
      !supplier ||
      !issueDate ||
      !receivedDate ||
      items.length === 0
    ) {
      toast.error("Preencha todos os dados e adicione itens antes de registrar."); 
      return;
    }

    setIsSubmitting(true);
 
    const notaData = {
      invoiceNumber,
      supplier,
      issueDate,
      receivedDate,
      items,
    };

    try {
      const response = await fetch(
        `${API_URL}/api/almoxarifado/notas-fiscais`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(notaData),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no servidor");

      toast.success(data.message); 
      limparFormularioManual();
      fetchData(); 
    } catch (err) {
      toast.error(`Erro: ${err.message}`); 
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 3. FUNÇÕES DE IMPORTAÇÃO DE XML ---

  const generateSKU = (category) => {
  
    const prefix = (category || "OUT").substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleFileParse = async (file) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/almoxarifado/parse-nfe`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao ler XML");

      const res = await fetch(`${API_URL}/api/almoxarifado/produtos-lista`, { credentials: 'include' });
      const allProductsList = await res.json();
      const skusNoBanco = new Set(allProductsList.map((p) => p.sku));

      const skusDoXML = data.items.map((item) => ({
        ...item,
        productSku: item.productSku.replace(/\//g, "-"),
      }));

      const skusFaltantesUnicos = [
        ...new Set(
          skusDoXML
            .filter((item) => !skusNoBanco.has(item.productSku))
            .map((item) => item.productSku)
        ),
      ];

      if (skusFaltantesUnicos.length > 0) {
        const itensParaModal = skusFaltantesUnicos.map((skuFaltante) => {
          const itemDoXML = skusDoXML.find((i) => i.productSku === skuFaltante);
          return {
            sku_original_xml: itemDoXML.productSku, 
            sku: "", 
            name: itemDoXML.productName,
            category: "Outros",
            minStock: 10,
            fator_embalagem: 1, 
          };
        });

        setItensParaCadastrar(itensParaModal);
        setNfOriginal(data); 
        setIsPreCadastroOpen(true); 
      } else {
        setInvoiceNumber(data.invoiceNumber);
        setSupplier(data.supplier);
        setIssueDate(data.issueDate);
        setItems(skusDoXML); 
        toast.success( 
          'NF-e importada! Todos os SKUs já existem. Verifique os dados e clique em "Registrar NF".'
        );
      }
    } catch (err) {
      toast.error(`Erro: ${err.message}`); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSalvarPreCadastro = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (itensParaCadastrar.some((item) => !item.sku)) {
      toast.error( 
        'Por favor, preencha ou gere o "Nosso SKU" para todos os itens novos.'
      );
      setIsSubmitting(false);
      return;
    }

    try {
      for (const item of itensParaCadastrar) {
        const produtoParaCadastrar = {
          sku: item.sku, 
          name: item.name,
          category: item.category,
          minStock: item.minStock,
          fator_embalagem: item.fator_embalagem,
        };
        const response = await fetch(`${API_URL}/api/almoxarifado/produtos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(produtoParaCadastrar), 
        });
        if (!response.ok) {
          const data = await response.json();
          if (response.status !== 409) {
            throw new Error(`Erro ao cadastrar ${item.sku}: ${data.error}`);
          }
        }
      }

      const skuMap = new Map(
        itensParaCadastrar.map((item) => [item.sku_original_xml, item.sku])
      );
      const itensTraduzidos = nfOriginal.items.map((itemXML) => {
        const skuLimpo = itemXML.productSku.replace(/\//g, "-");
        const nossoSku = skuMap.get(skuLimpo); 
        return {
          ...itemXML,
          productSku: nossoSku || skuLimpo,
        };
      });

      toast.success("Novos produtos cadastrados! Agora vamos registrar a NF."); 
      setInvoiceNumber(nfOriginal.invoiceNumber);
      setSupplier(nfOriginal.supplier);
      setIssueDate(nfOriginal.issueDate);
      setItems(itensTraduzidos); 
      setIsPreCadastroOpen(false); 
      setNfOriginal(null); 
    } catch (err) {
      toast.error(`Erro no pré-cadastro: ${err.message}`); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreCadastroChange = (index, field, value) => {
    const novos = [...itensParaCadastrar];
    const item = novos[index];
    if (field === "minStock" || field === "fator_embalagem") {
      item[field] = parseInt(value, 10) || 0;
    } else if (field === "sku") {
      item[field] = value.toUpperCase().replace(/\//g, "-"); 
    } else {
      item[field] = value;
    }
    setItensParaCadastrar(novos);
  };

  const handleGerarSkuNoModal = (index, categoria) => {
    const novoSku = generateSKU(categoria);
    handlePreCadastroChange(index, "sku", novoSku);
  };

  const handleVerDetalhes = (nota) => {
    setNotaSelecionada(nota); 
    setIsDetalhesOpen(true); 
  };
  
  const selectStyles = {
    control: (base) => ({
      ...base,
      fontSize: '1rem',
      borderColor: '#ced4da',
      padding: '0.375rem 0.5rem', 
      minHeight: 'calc(0.75rem * 2 + 1rem * 1.5)',
      boxShadow: 'none',
      '&:hover': { borderColor: '#ced4da' }
    }),
    option: (base, state) => ({ ...base, fontSize: '0.9rem', backgroundColor: state.isFocused ? '#f0f2f5' : 'white', color: '#333' }),
    placeholder: (base) => ({ ...base, color: '#6c757d' }),
    menu: (base) => ({ ...base, zIndex: 10 }), 
  };

  if (isLoading) return <div>Carregando dados das Notas Fiscais...</div>;

  return (
    <div>
      {statsDoDia && (
        <div className={styles.statsGrid}>
         <Card className={styles.statCardGreen}>
            <CardContent className={styles.statCard}>
              <div className={styles.statHeader}>
                <p>Entradas (Hoje)</p>
                <TrendingUp />
              </div>
              <span>{statsDoDia.entradasHoje}</span>
            </CardContent>
          </Card>
          <Card className={styles.statCardRed}>
            <CardContent className={styles.statCard}>
              <div className={styles.statHeader}>
                <p>Saídas (Hoje)</p>
                <TrendingDown />
              </div>
              <span>{statsDoDia.saidasHoje}</span>
            </CardContent>
          </Card>
          <Card className={styles.statCardMoney}>
            <CardContent className={styles.statCard}>
              <div className={styles.statHeader}>
                <p>Gastos (Hoje)</p>
                <DollarSign />
              </div>
              <span className={styles.moneyText}>
                {formatCurrency(statsDoDia.gastosHoje)}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      <div className={styles.nfContainer}>
        <Card className={styles.formCard}>
          <Tabs>
            <Tab label="Registro Manual">
              <CardHeader>
                <h2>Registrar Nota Fiscal</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className={styles.formGrid}>
                  
                  <Input
                    label="Nº da Nota Fiscal"
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                  />
                  <Input
                    label="Fornecedor"
                    id="supplier"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    required
                  />
                  <Input
                    label="Data de Emissão"
                    id="issueDate"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                  />
                  <Input
                    label="Data de Recebimento"
                    id="receivedDate"
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    required
                  />

                  <div className={styles.itemSection}>
                    <h4>Itens da Nota</h4>
                    
                    {items.length > 0 && (
                      <table className={styles.itemTable}>
                        <thead>
                          <tr>
                            <th>Produto</th> <th>Qtd</th> <th>Vlr. Un.</th>{" "}
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={index}>
                              <td>
                                {item.productName} ({item.productSku})
                              </td>
                              <td>{item.quantity} un.</td>
                              <td>{formatCurrency(item.unitPrice)}</td>
                              <td>
                                <Button
                                  type="button"
                                  className={styles.deleteButton}
                                  onClick={() =>
                                    setItems(
                                      items.filter((_, i) => i !== index)
                                    )
                                  }>
                                  X
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    
                
                    <div className={styles.itemForm}>
                     
                      <AsyncSelect
                        loadOptions={loadOptions}
                        value={selectedItem}
                        onChange={setSelectedItem}
                        placeholder="Buscar produto..."
                        styles={selectStyles}
                        noOptionsMessage={({ inputValue }) => 
                          inputValue.length < 2 ? "Digite ao menos 2 letras" : "Nenhum produto encontrado"
                        }
                      />
                      
                      <div className={styles.itemInput_form}> 
                        <input
                          type="number"
                          placeholder="Qtd"
                          value={currentItemQty}
                          onChange={(e) => setCurrentItemQty(e.target.value)}
                          className={styles.itemInput}
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Preço Unit."
                          value={currentItemPrice}
                          onChange={(e) => setCurrentItemPrice(e.target.value)}
                          className={styles.itemInput}
                        />
                      </div>
                      
                      <Button
                        type="button"
                        onClick={handleAddItem}
                        className={styles.addButton}>
                        + Adicionar Item
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={styles.submitButton}>
                    {isSubmitting
                      ? "Salvando..."
                      : "Registrar NF e Atualizar Estoque"}
                  </Button>
                </form>
              </CardContent>
            </Tab>

           
            <Tab label="Importar NF-e (XML)">
              <CardHeader>
                <h2>Importar Nota Fiscal (XML)</h2>
              </CardHeader>
              <CardContent>
                <InputFile onFileSelect={handleFileParse} />
                {isSubmitting && !isPreCadastroOpen && (
                  <p className={styles.loadingText}>Processando XML...</p>
                )}
              </CardContent>
            </Tab>
          </Tabs>
        </Card>

     
        <Card className={styles.tableCard}>
         
          <CardHeader>
            <h2>Notas Fiscais Registradas</h2>
          </CardHeader>
          <CardContent>
            {allNotas.length === 0 ? (
              <p>Nenhuma NF registrada.</p>
            ) : (
              <table className={styles.productTable}>
                <thead>
                  <tr>
                    <th>Nº NF</th>
                    <th>Fornecedor</th>
                    <th>Data Rec.</th>
                    <th>Itens</th>
                    <th>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {allNotas.map((nota) => (
                    <tr
                      key={nota.id}
                      className={styles.clickableRow}
                      onClick={() => handleVerDetalhes(nota)}
                      title="Clique para ver os detalhes">
                      <td>{nota.invoiceNumber}</td>
                      <td>{nota.supplier}</td>
                      <td>
                        {new Date(nota.receivedDate).toLocaleDateString(
                          "pt-BR"
                        )}
                      </td>
                      <td>{nota.items.length}</td>
                      <td>{formatCurrency(nota.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

      
        <Modal
          isOpen={isPreCadastroOpen}
          onClose={() => setIsPreCadastroOpen(false)}>
         
          <form onSubmit={handleSalvarPreCadastro}>
            <h2>Produtos Não Encontrados</h2>
            <p>
              Revise os itens do XML, defina o **Nosso SKU** (pode gerar um) e
              confirme os dados.
            </p>

            <div className={styles.modalContent}>
              {itensParaCadastrar.map((item, index) => (
                <div key={item.sku_original_xml} className={styles.modalItem}>
                  <Input
                    label="SKU Fornecedor (XML)"
                    id={`pre-sku-xml-${index}`}
                    value={item.sku_original_xml}
                    readOnly
                  />

                  <div className={styles.skuWrapperModal}>
                    <Input
                      label="Nosso SKU (Obrigatório)"
                      id={`pre-sku-${index}`}
                      name="sku"
                      value={item.sku}
                      onChange={(e) =>
                        handlePreCadastroChange(index, "sku", e.target.value)
                      }
                      required
                    />
                    <Button
                      type="button"
                      onClick={() =>
                        handleGerarSkuNoModal(index, item.category)
                      }
                      className={styles.generateButtonModal}
                      title="Gerar SKU">
                      <Barcode size={18} />
                    </Button>
                  </div>

                  <Input
                    label="Nome do Produto (Revise)"
                    id={`pre-name-${index}`}
                    name="name"
                    value={item.name}
                    onChange={(e) =>
                      handlePreCadastroChange(index, "name", e.target.value)
                    }
                    required
                  />
                  <div className={styles.inputGroup}>
                    <label htmlFor={`pre-cat-${index}`}>Categoria</label>
                    <select
                      id={`pre-cat-${index}`}
                      name="category"
                      value={item.category}
                      onChange={(e) =>
                        handlePreCadastroChange(
                          index,
                          "category",
                          e.target.value
                        )
                      }
                      className={styles.select}>
                      <option value="Outros">Outros</option>
                      <option value="Papelaria">Papelaria</option>
                      <option value="Informatica">Informática</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Escritorio">Escritório</option>
                    </select>
                  </div>
                  <Input
                    label="Estoque Mínimo"
                    id={`pre-min-${index}`}
                    type="number"
                    name="minStock"
                    min="0"
                    value={item.minStock}
                    onChange={(e) =>
                      handlePreCadastroChange(index, "minStock", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Fator de Embalagem (Unidades)"
                    id={`pre-fator-${index}`}
                    type="number"
                    name="fator_embalagem"
                    min="1"
                    value={item.fator_embalagem}
                    onChange={(e) =>
                      handlePreCadastroChange(
                        index,
                        "fator_embalagem",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>
              ))}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              style={{ width: "100%", marginTop: "1rem" }}>
              {isSubmitting
                ? "Cadastrando..."
                : "Cadastrar Novos Itens e Continuar"}
            </Button>
          </form>
        </Modal>

       
        <Modal isOpen={isDetalhesOpen} onClose={() => setIsDetalhesOpen(false)}>
          
          {notaSelecionada && (
            <div className={styles.detalhesModal}>
              <CardHeader className={styles.detalhesHeader}>
                <h2>Detalhes da NF: {notaSelecionada.invoiceNumber}</h2>
              </CardHeader>
              <CardContent>
            
                <div className={styles.detalhesGrid}>
                  <strong>Fornecedor:</strong>
                  <p>{notaSelecionada.supplier}</p>
                  <strong>Data Emissão:</strong>
                  <p>{new Date(notaSelecionada.issueDate).toLocaleDateString("pt-BR")}</p>
                  <strong>Data Recebimento:</strong>
                  <p>{new Date(notaSelecionada.receivedDate).toLocaleDateString("pt-BR")}</p>
                  <strong>Valor Total:</strong>
                  <p>{formatCurrency(notaSelecionada.totalValue)}</p>
                  {notaSelecionada.notes && (
                    <>
                      <strong>Observações:</strong>
                      <p>{notaSelecionada.notes}</p>
                    </>
                  )}
                </div>
            
                <h4 className={styles.detalhesSubtitulo}>
                  Itens da Nota ({notaSelecionada.items.length})
                </h4>
                <div className={styles.tableScrollWrapper}>
                  <table className={styles.itemTable}>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>SKU</th>
                        <th>Qtd (Compra)</th>
                        <th>Vlr. Un. (Real)</th>
                        <th>Total Item</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notaSelecionada.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.productName}</td>
                          <td>{item.productSku}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unitPrice)}</td>
                          <td>
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  onClick={() => setIsDetalhesOpen(false)}
                  style={{ width: "100%", marginTop: "1.5rem" }}>
                  Fechar
                </Button>
              </CardContent>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}