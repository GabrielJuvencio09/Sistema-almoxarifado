

import React from 'react';
import ReactDOM from 'react-dom'; 
import styles from './Modal.module.css';
import { X } from 'lucide-react'; 


const portalRoot = document.getElementById('modal-root');

export function Modal({ isOpen, onClose, children }) {
  if (!isOpen) {
    return null; 
  }


  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={styles.modal} 
        onClick={(e) => e.stopPropagation()} 
      >
        <button className={styles.closeButton} onClick={onClose}>
          <X size={20} />
        </button>
        {children}
      </div>
    </div>,
    portalRoot
  );
}