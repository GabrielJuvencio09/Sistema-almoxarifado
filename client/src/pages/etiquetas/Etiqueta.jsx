

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Barcode from 'react-barcode'; 
import styles from './Etiqueta.module.css';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export function EtiquetaPage() {
  const { sku } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sku) return;
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_URL}/api/almoxarifado/produtos/${sku}`, { 
          credentials: 'include' 
        });
        if (!res.ok) throw new Error('Produto não encontrado');
        const data = await res.json();
        setProduct(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchProduct();
  }, [sku]);

  useEffect(() => {
    if (product) {
      
      setTimeout(() => {
        window.print();
      }, 500); 
    }
  }, [product]);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!product) return <div>Carregando etiqueta...</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.etiqueta}>
        <div className={styles.header}>
          {product.category.toUpperCase()}
        </div>
        <div className={styles.content}>
          <div className={styles.productName}>{product.name}</div>
          {product.description && (
            <div className={styles.description}>{product.description}</div>
          )}
        </div>
        <div className={styles.footer}>
          {/* --- 2. SUBSTITUA O TEXTO PELO COMPONENTE --- */}
          <Barcode 
            value={product.sku} 
            width={2}          
            height={50}         
            fontSize={14}       
            margin={5}
            displayValue={true} 
          />
        </div>
      </div>
    </div>
  );
}