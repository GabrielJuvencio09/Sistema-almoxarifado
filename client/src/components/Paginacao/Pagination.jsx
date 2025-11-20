

import React from 'react';
import { Button } from '../Button/Button';
import styles from './Pagination.module.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ currentPage, totalPages, onPageChange }) {

  const handlePrevious = () => {
   
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null; 
  }

  return (
    <div className={styles.pagination}>
      <Button
        onClick={handlePrevious}
        disabled={currentPage === 1} // Desativa o botão se estiver na pág 1
        className={styles.pageButton}
      >
        <ChevronLeft size={16} />
        Anterior
      </Button>

      <span className={styles.pageInfo}>
        Página {currentPage} de {totalPages}
      </span>

      <Button
        onClick={handleNext}
        disabled={currentPage === totalPages} // Desativa na última pág
        className={styles.pageButton}
      >
        Próximo
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}