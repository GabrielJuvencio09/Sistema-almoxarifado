import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "../../components/Card/Card";
import { useAuth } from "../../context/AuthContext";
import { AlertTriangle } from 'lucide-react';
import styles from "./Dashboard.module.css";
import { useApi } from '../../hooks/useApi';

const API_URL = import.meta.env.VITE_API_BASE_URL;


export function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: isLoadingStats, error: errorStats } = useApi('/api/almoxarifado/stats');
  
  
  const { 
    data: productData, 
    isLoading: isLoadingProducts, 
    error: errorProducts 
  } = useApi('/api/almoxarifado/produtos?limit=20&lowStock=true');
  

 
  const products = productData?.items || [];

  const isLoading = isLoadingStats || isLoadingProducts;
  const error = errorStats || errorProducts;

  
       
  if (isLoading) {
    return <div>Carregando dados do almoxarifado...</div>;
  }

  if (error) {
    return <div className={styles.error}>Erro: {error}</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bem-vindo ao sistema, {user?.nome}!</p>
      
      {/* Alerta de Estoque */}
      {stats && (stats.lowStock > 0 || stats.outOfStock > 0) && (
        <div className={styles.alert}>
          <AlertTriangle />
          <strong>Alerta de Estoque:</strong> 
          Você tem {stats.lowStock} produto(s) com estoque baixo e {stats.outOfStock} produto(s) esgotado(s).
          A tabela abaixo mostra os {products.length} mais críticos.
        </div>
      )}

      {/* Cards de Estatísticas */}
      {stats && (
        <div className={styles.statsGrid}>
          <Card>
            <CardContent className={styles.statCard}>
              <p>Total de Produtos</p>
              <span>{stats.totalProducts}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={styles.statCard}>
              <p>Estoque Baixo</p>
              <span className={stats.lowStock > 0 ? styles.warning : ""}>
                {stats.lowStock}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={styles.statCard}>
              <p>Esgotados</p>
              <span className={stats.outOfStock > 0 ? styles.danger : ""}>
                {stats.outOfStock}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela de Estoque Crítico */}
      <Card style={{ marginTop: "2rem" }}>
        <CardHeader>
          <h2>Estoque Crítico (Itens com Estoque Baixo ou Esgotado)</h2>
        </CardHeader>
        <CardContent>
          <table className={styles.productTable}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Est. Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {/* A verificação agora é em 'products' */}
              {products.length === 0 ? (
                <tr>
                  <td colSpan="5">Nenhum produto com estoque baixo ou esgotado.</td>
                </tr>
              ) : (
                products.map((product) => ( // Mapeia 'products'
                  <tr key={product.sku}>
                    <td>{product.sku}</td>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td
                      className={
                        product.quantity <= product.minStock
                          ? product.quantity === 0
                            ? styles.danger
                            : styles.warning
                          : ""
                      }>
                      {product.quantity}
                    </td>
                    <td>{product.minStock}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}