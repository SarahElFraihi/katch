"use client";

import { useEffect } from "react";

export default function SecurityShield() {
	useEffect(() => {
		// Bloque les tentatives d'ouverture de nouveaux onglets via JS (window.open)
		const originalWindowOpen = window.open;
		window.open = function () {
			console.warn("🚫 Popup bloquée par KATCH");
			return null;
		};

		// Intercepte les clics pour empêcher les redirections forcées
		const handleGlobalClick = (e) => {
			const target = e.target.closest("a");
			if (target) {
				const url = target.getAttribute("href");
				// On peut ajouter ici une liste blanche si nécessaire
			}
		};

		document.addEventListener("click", handleGlobalClick, true);

		return () => {
			window.open = originalWindowOpen;
			document.removeEventListener("click", handleGlobalClick, true);
		};
	}, []);

	return null;
}
