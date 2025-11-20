import styles from "./Card.module.css";

export function Card({ children, className = "" }) {
  const cardClass = `${styles.card} ${className}`;
  return <div className={cardClass}>{children}</div>;
}

export function CardHeader({ children, className = "" }) {
  const headerClass = `${styles.header} ${className}`;
  return <div className={headerClass}>{children}</div>;
}
export function CardContent({ children, className = "" }) {
  const contentClass = `${styles.content} ${className}`;
  return <div className={contentClass}>{children}</div>;
}
