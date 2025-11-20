// Em: src/pages/Historico.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '../../components/Card/Card';
import { Input } from '../../components/Input/Input'; 
import { Button } from '../../components/Button/Button'; 
import { Pagination } from '../../components/Paginacao/Pagination'; 
import styles from './Historico.module.css';

import toast from 'react-hot-toast'; 

const API_URL = import.meta.env.VITE_API_BASE_URL;

// (NOVO) Hook de Debounce
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};


export function HistoricoPage() {
  // --- (NOVO) Estados da Tabela e Paginação ---
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // --- Estados dos Filtros ---
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroProduto, setFiltroProduto] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [filtroDetalhes, setFiltroDetalhes] = useState('');

 
  const debouncedProduto = useDebounce(filtroProduto, 500);
  const debouncedResponsavel = useDebounce(filtroResponsavel, 500);
  const debouncedDetalhes = useDebounce(filtroDetalhes, 500);


  const formatData = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };


  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 15, // Histórico pode ter mais itens por página
        tipo: filtroTipo,
        produto: debouncedProduto,
        responsavel: debouncedResponsavel,
        detalhes: debouncedDetalhes,
      });

      const response = await fetch(`${API_URL}/api/almoxarifado/movimentacoes?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Falha ao buscar histórico");
      }
      
      const data = await response.json();
      setMovements(data.items);
      setTotalPages(data.totalPages);

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filtroTipo, debouncedProduto, debouncedResponsavel, debouncedDetalhes]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

 
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroTipo, debouncedProduto, debouncedResponsavel, debouncedDetalhes]);





  
  const handleExportCSV = async () => {
    toast('Preparando exportação...');
    
    try {
      const params = new URLSearchParams({
        tipo: filtroTipo,
        produto: debouncedProduto,
        responsavel: debouncedResponsavel,
        detalhes: debouncedDetalhes,
      });

      const response = await fetch(`${API_URL}/api/almoxarifado/movimentacoes/export?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Falha ao exportar dados");
      }

      const allMovements = await response.json(); // Pega todos os itens

      if (allMovements.length === 0) {
        toast('Nenhum dado para exportar.');
        return;
      }

      const headers = [
        "ID", "Tipo", "Produto", "SKU", "Quantidade", "Responsável", 
        "Data/Hora", "Destino (Saída)", "Recolhido por (Saída)", "Retirado por (Saída)"
      ];

      const rows = allMovements.map(mov => {
        const dataFormatada = formatData(mov.date);
        return [
          mov.id,
          mov.type,
          `"${mov.productName}"`,
          mov.sku,
          mov.quantity,
          `"${mov.responsible}"`,
          `"${dataFormatada}"`,
          `"${mov.destination || ''}"`,
          `"${mov.collector || ''}"`,
          `"${mov.withdrawnBy || ''}"`
        ].join(','); 
      });

      const csvContent = [headers.join(','), ...rows].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `historico_movimentacoes_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      toast.error(`Erro ao exportar: ${err.message}`);
    }
  };


  if (error && !movements) return <div className={styles.error}>Erro: {error}</div>;

  return (
    <Card>
      <CardHeader>
        <h2>Histórico de Movimentações</h2>
      </CardHeader>
      <CardContent>

        {/* --- BARRA DE FILTROS --- */}
        <div className={styles.filtroContainer}>
          
          {/* Filtro 1: Tipo */}
          <div className={styles.filtroGrupo}>
            <label htmlFor="filtroTipo" className={styles.label}>Filtrar por tipo:</label>
            <select
              id="filtroTipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className={styles.select}
            >
              <option value="todos">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>

          {/* Filtro 2: Produto/SKU */}
          <Input
            label="Produto ou SKU:"
            id="filtroProduto"
            type="text"
            value={filtroProduto}
            onChange={(e) => setFiltroProduto(e.target.value)}
            className={styles.filtroInput} 
            placeholder="Filtrar produto..."
          />

          {/* Filtro 3: Responsável */}
          <Input
            label="Responsável:"
            id="filtroResponsavel"
            type="text"
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
            className={styles.filtroInput}
            placeholder="Filtrar responsável..."
          />

          {/* Filtro 4: Detalhes da Saída */}
          <Input
            label="Detalhes da Saída:"
            id="filtroDetalhes"
            type="text"
            value={filtroDetalhes}
            onChange={(e) => setFiltroDetalhes(e.target.value)}
            className={styles.filtroInput}
            placeholder="Filtrar destino, recolha..."
          />

          {/* Botão de Exportar */}
          <Button onClick={handleExportCSV} className={styles.exportButton}>
            Exportar (CSV)
          </Button>
        </div>

        {/* Tabela de Dados */}
        <div className={styles.tableScrollWrapper}> 
          {isLoading && <p>Carregando histórico...</p>}
          {!isLoading && error && <p className={styles.error}>{error}</p>}
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Produto</th>
                <th>SKU</th>
                <th>Qtd.</th>
                <th>Responsável</th>
                <th>Data/Hora</th>
                <th>Detalhes (Saída)</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && movements.length === 0 ? (
                <tr>
                  <td colSpan="7">Nenhum registro encontrado para os filtros aplicados.</td>
                </tr>
              ) : (
                movements.map((mov) => ( // <-- Mapeia 'movements'
                  <tr key={mov.id}>
                    <td>
                      <span
                        className={
                          mov.type === 'entrada' ? styles.entrada : styles.saida
                        }
                      >
                        {mov.type.toUpperCase()}
                      </span>
                    </td>
                    <td>{mov.productName}</td>
                    <td>{mov.sku}</td>
                    <td>{mov.quantity}</td>
                    <td>{mov.responsible}</td>
                    <td>{formatData(mov.date)}</td>
                    <td>
                      {mov.type === 'saida' ? (
                        `${mov.destination || ''} (Rec: ${mov.collector || ''} / Ret: ${mov.withdrawnBy || ''})`
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* --- (NOVO) PAGINAÇÃO --- */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </CardContent>
    </Card>
  );
}