// Em: src/pages/provisionamento/Provisionamento.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/modal/Modal'; 
import { HelpCircle } from 'lucide-react'; 
import styles from './Provisionamento.module.css';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export function ProvisionamentoPage() {
  // --- Estados de Dados ---
  const [data, setData] = useState([]);
  
  // --- Estados de Controle ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Estado do Filtro ---
  const [periodo, setPeriodo] = useState('30'); 

  // ---  Estado do Modal de Ajuda ---
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Função para buscar os dados do relatório
  const fetchProvisionamento = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const requestOptions = { method: 'GET', credentials: 'include' };
      
      const queryParams = new URLSearchParams({ periodo: periodo });
      const query = `?${queryParams.toString()}`;

      const res = await fetch(`${API_URL}/api/almoxarifado/provisionamento${query}`, requestOptions);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Falha ao buscar relatório');
      }
      
      const data = await res.json();
      setData(data);
      
    } catch (err) {
      setError(err.message);
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [periodo]); 

  
  useEffect(() => {
    fetchProvisionamento();
  }, [fetchProvisionamento]);


  const formatarDias = (dias) => {
    if (dias === null || dias === undefined) {
      return <span className={styles.diasNenhum}>N/A (sem consumo)</span>;
    }
    const d = Math.floor(dias);
    if (d === 0) {
      return <span className={styles.diasCritico}>ESGOTADO (ou abaixo do mínimo)</span>;
    }
    if (d <= 15) {
      return <span className={styles.diasAlerta}>{d} dias</span>;
    }
    return <span className={styles.diasOk}>{d} dias</span>;
  };
  

  const formatarConsumo = (consumo) => {
    if (consumo === 0) return "0 / dia";
    
    return `${parseFloat(consumo.toFixed(2))} / dia`;
  };


  if (error && !data) return <div className={styles.error}>Erro: {error}</div>;

  return (
    <div className={styles.relatoriosContainer}>
      
      <CardHeader>
        {/* ---  Cabeçalho com botão de ajuda --- */}
        <div className={styles.headerComAjuda}>
          <h2>Provisionamento de Estoque (Previsão de Compras)</h2>
          <button 
            onClick={() => setIsHelpOpen(true)} 
            className={styles.helpButton} 
            title="Entenda como funciona"
          >
            <HelpCircle size={24} />
          </button>
        </div>
      </CardHeader>
      
      {/* --- Filtro de Período --- */}
      <Card className={styles.filtroCard}>
        <CardContent className={styles.filtroForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="periodo">Calcular consumo médio com base nos últimos:</label>
            <select 
              id="periodo" 
              value={periodo} 
              onChange={e => setPeriodo(e.target.value)} 
              className={styles.select}
            >
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
            </select>
          </div>
          
          <Button onClick={fetchProvisionamento} disabled={isLoading} className={styles.filtroButton}>
            {isLoading ? 'Calculando...' : 'Recalcular'}
          </Button>
        </CardContent>
      </Card>

      {/* --- Tabela de Provisionamento --- */}
      <Card>
        <CardHeader>
          <h2>Relatório de Necessidade de Compras</h2>
          <p>Itens ordenados pelos mais críticos (menos dias de stock restante).</p>
        </CardHeader>
        <CardContent>
          <div className={styles.tableScrollWrapper}> 
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Produto (SKU)</th>
                  <th>Stock Atual</th>
                  <th>Stock Mínimo</th>
                  <th>Consumo Médio (base {periodo} dias)</th>
                  <th>Dias de Stock Restante</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="5">Carregando e calculando dados...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan="5">Nenhum item com consumo registado no período.</td></tr>
                ) : (
                  data.map(item => (
                    <tr key={item.sku}>
                      <td>
                        <strong>{item.name}</strong>
                        <br/>
                        <small>{item.sku}</small>
                      </td>
                      <td>{item.quantity} un.</td>
                      <td>{item.minStock} un.</td>
                      <td>{formatarConsumo(item.consumoMedioDiario)}</td>
                      <td className={styles.diasCell}>
                        {formatarDias(item.diasRestantes)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ---  Modal de Ajuda --- */}
      <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)}>
        <h2>Como funciona o Provisionamento?</h2>
        <div className={styles.modalContent}>
          <p>Esta página analisa o seu histórico de saídas para prever quando o seu stock vai acabar, ajudando a decidir <strong>o que</strong> e <strong>quando</strong> comprar.</p>
          
          <h4>1. Período de Cálculo</h4>
          <p>Você escolhe o período (ex: 30, 60 ou 90 dias) que o sistema usará como base para analisar o consumo dos seus produtos.</p>

          <h4>2. Consumo Médio Diário</h4>
          <p>O sistema calcula o consumo de cada item. A fórmula é simples:</p>
          <p className={styles.formula}>Total de Saídas no Período / (Nº de Dias do Período)</p>
          <p><strong>Ex:</strong> 600 saídas nos últimos 30 dias = 20 unidades/dia.</p>

          <h4>3. Dias de Stock Restante</h4>
          <p>Esta é a previsão principal. Ela calcula quantos dias o seu stock "útil" (acima do mínimo) vai durar, com base no consumo médio.</p>
          <p className={styles.formula}>(Stock Atual - Stock Mínimo) / (Consumo Médio Diário)</p>
          <p><strong>Ex:</strong> (500 un. - 100 un.) / 20 un./dia = 20 dias restantes.</p>

          <h4>O que as cores significam?</h4>
          <ul>
            <li><strong className={styles.diasCritico}>ESGOTADO:</strong> O stock atual já está abaixo do mínimo. Compre imediatamente.</li>
            <li><strong className={styles.diasAlerta}>ALERTA (Laranja):</strong> Restam 15 dias ou menos de stock. Prepare a compra.</li>
            <li><strong className={styles.diasOk}>OK (Verde):</strong> Restam mais de 15 dias de stock.</li>
          </ul>

          <Button onClick={() => setIsHelpOpen(false)} style={{ width: "100%", marginTop: "1.5rem" }}>
            Entendido
          </Button>
        </div>
      </Modal>

    </div>
  );
}