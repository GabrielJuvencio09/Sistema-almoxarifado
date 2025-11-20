
import { useState, useEffect } from 'react';


const API_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Um "Hook" customizado para buscar dados da nossa API.
 * Ele gerencia o loading, os erros e os dados para nós.
 * * @param {string} endpoint 
 * @returns {{data: any, isLoading: boolean, error: string | null, setData: Function}}
 */
export function useApi(endpoint) {
  // Nossos 3 estados padrão
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // A lógica de busca
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const requestOptions = {
          method: 'GET',
          credentials: 'include', 
        };

        const response = await fetch(`${API_URL}${endpoint}`, requestOptions);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao buscar dados');
        }
        
        const responseData = await response.json();
        setData(responseData);

      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [endpoint]); 

 
  return { data, isLoading, error, setData };
}