

import React, { useRef } from 'react';
import { Button } from '../Button/Button';
import { UploadCloud } from 'lucide-react';
import styles from './InputFile.module.css';


export function InputFile({ onFileSelect }) {
 
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div 
      className={styles.uploadBox}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current.click()} 
    >
      {/* O input real fica escondido */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className={styles.hiddenInput}
        accept=".xml" 
      />

      <UploadCloud size={48} className={styles.uploadIcon} />
      <p>Arraste e solte o arquivo .XML aqui</p>
      <p>- ou -</p>
      <Button 
        type="button" 
        className={styles.uploadButton}
        onClick={(e) => e.stopPropagation()} 
      >
        Selecionar Arquivo
      </Button>
      <small>Isso irá preencher o formulário de "Registro Manual" automaticamente.</small>
    </div>
  );
}