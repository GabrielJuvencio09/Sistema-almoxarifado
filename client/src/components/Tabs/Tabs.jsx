

import React, { useState } from 'react';
import styles from './Tabs.module.css';


export function Tabs({ children }) {

  const [activeTab, setActiveTab] = useState(children[0].props.label);

  return (
    <div className={styles.tabs}>
      <div className={styles.tabList}>
        {children.map((child) => {
          const { label } = child.props;
          return (
            <button
              key={label}
              className={`${styles.tabButton} ${activeTab === label ? styles.active : ''}`}
              onClick={() => setActiveTab(label)}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className={styles.tabContent}>
        {children.map((child) => {
          if (child.props.label !== activeTab) return undefined;
          return child.props.children;
        })}
      </div>
    </div>
  );
}


export function Tab({ label, children }) {
  return (
    <div data-label={label}>
      {children}
    </div>
  );
}