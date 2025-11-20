

import styles from './Input.module.css';


export function Input({ label, id, type = "text", className = "", ...props }) {

  
  const wrapperClass = `${styles.inputGroup} ${className}`;

  return (
  
    <div className={wrapperClass}> 
      <label htmlFor={id} className={styles.label}>{label}</label>
      <input
        id={id}
        type={type}
        className={styles.input}
        {...props} 
      />
    </div>
  );
}