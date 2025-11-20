import React from "react";

import { Outlet } from "react-router-dom";
import { Navbar } from "../Navbar/Navbar";
import styles from "./Layout.module.css";

export function Layout() {
  return (
    <div className={styles.layout}>
      <Navbar />

      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
}
