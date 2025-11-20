// Em: src/pages/Relatorios.jsx

import React, { useState, useEffect ,useMemo } from 'react';
import { Card, CardHeader, CardContent } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/modal/Modal'; 
import styles from './Relatorios.module.css'; 
import toast from 'react-hot-toast'; 

const API_URL = import.meta.env.VITE_API_BASE_URL;

const formatCurrency = (value) => {
  if (isNaN(value)) { return 'R$ 0,00'; }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR');
};


const getToday = () => new Date().toISOString().split('T')[0];

const get30DaysAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
};

export function RelatoriosPage() {
  // --- ESTADOS DE DADOS ---
  const [notasDoPeriodo, setNotasDoPeriodo] = useState([]);
  const [consumoDoPeriodo, setConsumoDoPeriodo] = useState([]);
  const [categorias, setCategorias] = useState([]); 
  const [fornecedores, setFornecedores] = useState([]); 
  
  // --- ESTADOS DE CONTROLE ---
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState(null); 

  // --- ESTADOS DOS FILTROS ---
  const [dataInicio, setDataInicio] = useState(get30DaysAgo());
  const [dataFim, setDataFim] = useState(getToday());
  const [filtroCategoria, setFiltroCategoria] = useState(''); 
  const [filtroFornecedor, setFiltroFornecedor] = useState(''); 

  // --- ESTADOS DO MODAL (NOVO) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Função para buscar os dados dos dropdowns
  const fetchListas = async () => {
    try {
      const requestOptions = { method: 'GET', credentials: 'include' };
      const [catRes, fornRes] = await Promise.all([
        fetch(`${API_URL}/api/almoxarifado/listas/categorias`, requestOptions),
        fetch(`${API_URL}/api/almoxarifado/listas/fornecedores`, requestOptions)
      ]);
      const catData = await catRes.json();
      const fornData = await fornRes.json();
      setCategorias(catData);
      setFornecedores(fornData);
    } catch (err) {
      console.error("Erro ao buscar listas de filtros:", err);
      
    }
  };

  // Função para buscar os dados dos relatórios
  const fetchRelatorios = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const requestOptions = { method: 'GET', credentials: 'include' };
      
      // Monta a URL com TODOS os parâmetros
      const queryParams = new URLSearchParams({
        dataInicio: dataInicio,
        dataFim: dataFim
      });
      if (filtroCategoria) queryParams.append('categoria', filtroCategoria);
      if (filtroFornecedor) queryParams.append('fornecedor', filtroFornecedor);
      
      const query = `?${queryParams.toString()}`;

      const [notasRes, consumoRes] = await Promise.all([
        fetch(`${API_URL}/api/almoxarifado/relatorios/gastos-mensais${query}`, requestOptions),
        fetch(`${API_URL}/api/almoxarifado/relatorios/consumo-destino${query}`, requestOptions)
      ]);

      if (!notasRes.ok || !consumoRes.ok) throw new Error('Falha ao buscar relatórios');
      
      const notasData = await notasRes.json();
      const consumoData = await consumoRes.json();
      
      setNotasDoPeriodo(notasData);
      setConsumoDoPeriodo(consumoData);
      
    } catch (err) {
      setError(err.message); 
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega os dados (listas e relatórios) na primeira vez
  useEffect(() => {
    fetchListas();
    fetchRelatorios();
  }, []);
  
  // --- FUNÇÃO DE CLIQUE DO MODAL  ---
  const handleDestinoClick = async (destination) => {
    setSelectedDestination(destination);
    setIsModalOpen(true);
    setIsModalLoading(true);
    setModalData([]); 
    
    try {
      const requestOptions = { method: 'GET', credentials: 'include' };
      
      // Prepara a query para a API de detalhes
      const queryParams = new URLSearchParams({
        dataInicio: dataInicio,
        dataFim: dataFim,
        destination: destination 
      });
      if (filtroCategoria) queryParams.append('categoria', filtroCategoria);
      
      const query = `?${queryParams.toString()}`;
      
      const res = await fetch(`${API_URL}/api/almoxarifado/relatorios/consumo-detalhado${query}`, requestOptions);
      
      if (!res.ok) {
         const errData = await res.json();
         throw new Error(errData.error || 'Falha ao buscar detalhes do consumo');
      }
      
      const data = await res.json();
      setModalData(data);
      
    } catch (err) {
      toast.error(`Erro ao buscar detalhes: ${err.message}`); 
      setIsModalOpen(false); 
    } finally {
      setIsModalLoading(false);
    }
  };


  // --- Dados Calculados (useMemo) ---
  const dadosDoPeriodo = useMemo(() => {
    const totalNotas = notasDoPeriodo.length;
    const totalGasto = notasDoPeriodo.reduce((sum, nota) => sum + parseFloat(nota.totalValue), 0);
    return { totalNotas, totalGasto };
  }, [notasDoPeriodo]);


  if (error) return <div className={styles.error}>Erro: {error}</div>; 


  return (
    <div className={styles.relatoriosContainer}>
      
      
  {/* --- 1. O FILTRO DE DATA + CATEGORIA + FORNECEDOR --- */}
  <Card className={styles.filtroCard}>
        <CardContent className={styles.filtroForm}>
          {/* Datas */}
          <div className={styles.inputGroup}>
            <label htmlFor="dataInicio">Data Início:</label>
            <input type="date" id="dataInicio" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={styles.dateInput}/>
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="dataFim">Data Fim:</label>
            <input type="date" id="dataFim" value={dataFim} onChange={e => setDataFim(e.target.value)} className={styles.dateInput}/>
          </div>
          
          {/* Categoria (só afeta Consumo) */}
          <div className={styles.inputGroup}>
            <label htmlFor="filtroCategoria">Categoria:</label>
            <select id="filtroCategoria" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className={styles.select}>
              <option value="">Todas</option>
              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          
          {/* Fornecedor (só afeta Gastos) */}
          <div className={styles.inputGroup}>
            <label htmlFor="filtroFornecedor">Fornecedor:</label>
            <select id="filtroFornecedor" value={filtroFornecedor} onChange={e => setFiltroFornecedor(e.target.value)} className={styles.select}>
              <option value="">Todos</option>
              {fornecedores.map(forn => <option key={forn} value={forn}>{forn}</option>)}
            </select>
          </div>
          
          <Button onClick={fetchRelatorios} disabled={isLoading} className={styles.filtroButton}>
            {isLoading ? 'Buscando...' : 'Buscar Relatório'}
          </Button>
        </CardContent>
      </Card>

      {/* --- 2. OS CARDS (Resumo do Período) --- */}
      {dadosDoPeriodo && (
        <div className={styles.statsGrid}>
          <Card className={styles.statCardMoney}>
            <CardContent className={styles.statCard}>
              <p>Total Gasto no Período</p>
              <span>{formatCurrency(dadosDoPeriodo.totalGasto)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={styles.statCard}>
              <p>Total de Notas no Período</p>
              <span>{dadosDoPeriodo.totalNotas}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- 3. AS TABELAS (Relatório Detalhado) --- */}
      <div className={styles.tabelasGrid}>
        {/* Tabela 1: Notas Fiscais do Período */}
        <Card>
          <CardHeader>
            <h2>Notas Fiscais no Período</h2>
          </CardHeader>
          <CardContent>
          
            <div className={styles.tableScrollWrapper}> 
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Nº NF</th>
                    <th>Fornecedor</th>
                    <th>Data Rec.</th>
                    <th>Valor da Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan="4">Carregando...</td></tr>
                  ) : notasDoPeriodo.length === 0 ? (
                    <tr><td colSpan="4">Nenhuma NF neste período.</td></tr>
                  ) : (
                    notasDoPeriodo.map(nota => (
                      <tr key={nota.id}>
                        <td>{nota.invoiceNumber}</td>
                        <td>{nota.supplier}</td>
                        <td>{new Date(nota.receivedDate).toLocaleDateString('pt-BR')}</td>
                        <td className={styles.valorTotal}>{formatCurrency(nota.totalValue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tabela 2: Consumo por Destino no Período */}
        <Card>
          <CardHeader>
            <h2>Consumo por Destino no Período</h2>
          </CardHeader>
          <CardContent>
            <div className={styles.tableScrollWrapper}>
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Destino (Departamento)</th>
                    <th>Total de Retiradas (un.)</th>
                    <th>Nº de Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan="3">Carregando...</td></tr>
                  ) : consumoDoPeriodo.length === 0 ? (
                    <tr><td colSpan="3">Nenhuma saída neste período.</td></tr>
                  ) : (
                    consumoDoPeriodo.map((item, index) => (
                      <tr 
                        key={index}
                        className={styles.clickableRow} 
                        onClick={() => handleDestinoClick(item.destination)} 
                        title="Clique para ver os detalhes" 
                      >
                        <td className={styles.mesAno}>{item.destination}</td>
                        <td className={styles.valorTotalConsumo}>{item.totalUnidades}</td>
                        <td>{item.totalMovimentacoes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- 4. MODAL DE DETALHES DE CONSUMO  --- */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2>Detalhes do Consumo: {selectedDestination}</h2>
        <p>
          Mostrando todos os itens enviados para este destino no período selecionado
          {filtroCategoria && ` (categoria: ${filtroCategoria})`}.
        </p>
        
        {/* Reutiliza o estilo de scroll, mas com altura menor */}
        <div className={styles.tableScrollWrapper} style={{ maxHeight: '60vh' }}> 
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>SKU</th>
                <th>Produto</th>
                <th>Qtd.</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {isModalLoading ? (
                <tr><td colSpan="5">Carregando detalhes...</td></tr>
              ) : modalData.length === 0 ? (
                <tr><td colSpan="5">Nenhum item encontrado.</td></tr>
              ) : (
                modalData.map((item, index) => (
                  <tr key={index}>
                    <td>{formatDateTime(item.date)}</td>
                    <td>{item.sku}</td>
                    <td>{item.name}</td>
                    <td className={styles.valorTotalConsumo}>{item.quantity}</td>
                    <td>{item.responsible}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Button onClick={() => setIsModalOpen(false)} style={{ width: "100%", marginTop: "1rem" }}>
          Fechar
        </Button>
      </Modal>

    </div>
  );
}