import React from "react";
import styles from "./Button.module.css";

export function Button({ children, onClick, type = "button", className = "", ...rest }) {
  const ButtonClass = `${styles.button} ${className}`;

  return (
    <button type={type} className={ButtonClass} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
