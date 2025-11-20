// Em: src/pages/Movimentacao.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardContent } from '../../components/Card/Card';
import { Input } from '../../components/Input/Input'; 
import { Button } from '../../components/Button/Button';
import AsyncSelect from 'react-select/async'; 
import styles from './Movimentacao.module.css'; 
import toast from 'react-hot-toast'; 

const API_URL = import.meta.env.VITE_API_BASE_URL;

export function MovimentacaoPage() {
  const { user } = useAuth(); 

  const [type, setType] = useState('entrada'); 
  
  const [quantity, setQuantity] = useState('');
  const [responsible, setResponsible] = useState(user?.nome || ''); 

  const [destination, setDestination] = useState('');
  const [collector, setCollector] = useState('');
  const [withdrawnBy, setWithdrawnBy] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState(null); 

  useEffect(() => {
    if (user?.nome) {
      setResponsible(user.nome);
    }
  }, [user]); 

  
  const loadOptions = async (inputValue) => {
    if (!inputValue || inputValue.length < 2) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        search: inputValue,
        limit: 10,
      });
      const res = await fetch(`${API_URL}/api/almoxarifado/produtos?${params.toString()}`, { 
        credentials: 'include' 
      });
      if (!res.ok) throw new Error('Falha ao buscar produtos');
      
      const data = await res.json(); 
      
      return data.items.map(product => ({
        ...product, 
        value: product.sku,
        label: `${product.name} (SKU: ${product.sku}) - Estoque: ${product.quantity}`
      }));

    } catch (error) {
      toast.error(`Erro ao buscar produtos: ${error.message}`);
      return [];
    }
  };


 
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!selectedProduct) {
      toast.error('Por favor, selecione um produto válido.'); 
      return;
    }
  
    const q_saida = parseInt(quantity, 10); 
  
    if (type === 'saida' && q_saida > selectedProduct.quantity) {
      toast.error( 
        `Erro: Estoque insuficiente! Atual: ${selectedProduct.quantity}, Solicitado: ${q_saida}`
      );
      return; 
    }
  
    setIsLoading(true);
  
    const movementData = {
      productSku: selectedProduct.sku, 
      quantity: q_saida, 
      type: type,      
      responsible: responsible, 
      ...(type === 'saida' && {
        destination: destination,
        collector: collector,
        withdrawnBy: withdrawnBy,
      }),
    };
  
    try {
      const response = await fetch(`${API_URL}/api/almoxarifado/movimentacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(movementData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha no servidor');
      }

      toast.success(data.message); 
      
      
      setQuantity('');
      setDestination('');
      setCollector('');
      setWithdrawnBy('');
      setSelectedProduct(null); 



    } catch (error) {
      toast.error(`Erro: ${error.message}`); 
    } finally {
      setIsLoading(false);
    }
  };

  
  const selectStyles = {
    control: (base) => ({
      ...base,
      fontSize: '1rem',
      borderColor: '#ced4da',
      padding: '0.375rem 0.5rem', 
      minHeight: 'calc(0.75rem * 2 + 1rem * 1.5)',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#ced4da',
      }
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.9rem',
      backgroundColor: state.isFocused ? '#f0f2f5' : 'white',
      color: '#333',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#6c757d',
    }),
  };
    

  return (
    <Card>
      <CardHeader>
        <h2>Registrar Movimentação</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className={styles.formGrid}>

          {/* LINHA 1: TIPO E PRODUTO */}
          <div className={styles.inputGroup}>
            <label htmlFor="type">Tipo de Movimentação</label>
            <select 
              id="type" 
              value={type} 
              onChange={(e) => setType(e.target.value)} 
              className={styles.select}
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>

        
          <div className={styles.inputGroup}>
            <label htmlFor="productSku">Produto</label>
            <AsyncSelect
              id="productSku"
              cacheOptions 
              defaultOptions 
              loadOptions={loadOptions} 
              value={selectedProduct} 
              onChange={setSelectedProduct} 
              placeholder="Digite 2+ letras para buscar..."
              loadingMessage={() => "Buscando..."}
              noOptionsMessage={({ inputValue }) => 
                inputValue.length < 2 ? "Digite ao menos 2 letras" : "Nenhum produto encontrado"
              }
              styles={selectStyles} 
            />
            {selectedProduct && (
              <small>Estoque atual: {selectedProduct.quantity}</small>
            )}
          </div>

          {/* LINHA 2: QUANTIDADE E RESPONSÁVEL */}
          <Input
            label="Quantidade"
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            disabled={!selectedProduct}
          />

          <Input
            label="Responsável (Registro)"
            id="responsible"
            type="text"
            value={responsible} 
            required
            readOnly 
            style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }} 
          />

          {/* LINHA 3: CAMPOS DE SAÍDA (condicional) */}
          {type === 'saida' && (
            <>
              <Input
                label="Destino (Departamento/Loja)"
                id="destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                disabled={!selectedProduct}
              />
              <Input
                label="Responsável pela Recolha"
                id="collector"
                type="text"
                value={collector}
                onChange={(e) => setCollector(e.target.value)}
                required
                disabled={!selectedProduct}
              />
              <Input
                label="Responsável pela Retirada (Sistema)"
                id="withdrawnBy"
                type="text"
                value={withdrawnBy}
                onChange={(e) => setWithdrawnBy(e.target.value)}
                required
                disabled={!selectedProduct}
              />
            </>
          )}

          <Button type="submit" disabled={isLoading || !selectedProduct}>
            {isLoading ? 'Registrando...' : `Registrar ${type.charAt(0).toUpperCase() + type.slice(1)}`}
          </Button>

        </form>
      </CardContent>
    </Card>
  );
}