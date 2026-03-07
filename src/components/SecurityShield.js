"use client";

import { useEffect } from "react";

export default function SecurityShield() {
	useEffect(() => {
		// ── 1. Bloquer window.open (popups JS classiques) ──────────────────────
		window.open = () => {
			console.warn("🚫 Popup bloquée par KATCH");
			return null;
		};

		// ── 2. Bloquer les redirections de la page entière ─────────────────────
		// Certaines pubs font window.location = "https://pub.com"
		const locationDescriptor = Object.getOwnPropertyDescriptor(
			window,
			"location",
		);
		try {
			Object.defineProperty(window, "location", {
				set(val) {
					console.warn("🚫 Redirection bloquée par KATCH:", val);
					// On ne fait rien = on ignore la redirection
				},
				get() {
					return locationDescriptor?.get
						? locationDescriptor.get.call(this)
						: location;
				},
				configurable: true,
			});
		} catch (e) {
			// Certains navigateurs protègent window.location, pas grave
		}

		// ── 3. Bloquer les clics sur liens externes dans les iframes ───────────
		// Les iframes ne peuvent pas cliquer en dehors d'eux-mêmes,
		// mais des scripts peuvent injecter des éléments dans la page parent
		const blockExternalLinks = (e) => {
			const a = e.target.closest("a");
			if (!a) return;
			const href = a.getAttribute("href") || "";
			const isInternal =
				href.startsWith("/") ||
				href.startsWith("#") ||
				href.includes(window.location.hostname);
			if (!isInternal && href.startsWith("http")) {
				e.preventDefault();
				e.stopPropagation();
				console.warn("🚫 Lien externe bloqué par KATCH:", href);
			}
		};
		document.addEventListener("click", blockExternalLinks, true);

		// ── 4. Bloquer les nouvelles fenêtres via keyboard/touch sur iframe ────
		// Empêche le focus sur l'iframe de déclencher des redirections au clic
		const iframes = document.querySelectorAll("iframe");
		const blurIframe = () => {
			// On redonne le focus à la page principale après 100ms
			// pour éviter que l'iframe "vole" le focus et redirige
			setTimeout(() => {
				if (document.activeElement?.tagName === "IFRAME") {
					// On ne blur pas pour ne pas casser la vidéo,
					// mais on intercepte les tentatives de navigation
				}
			}, 100);
		};
		window.addEventListener("blur", blurIframe);

		// ── 5. Observer les nouveaux éléments injectés (overlay pubs) ──────────
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node.nodeType !== 1) continue;
					const el = node;
					// Supprimer les iframes injectées dynamiquement hors du player
					if (el.tagName === "IFRAME") {
						const src = el.getAttribute("src") || "";
						const isPlayer = el.closest(".player-container");
						if (!isPlayer && src && !src.startsWith("/")) {
							console.warn("🚫 iframe pub supprimée:", src);
							el.remove();
						}
					}
					// Supprimer les overlays/pop-unders (divs plein écran positionnés en fixed)
					if (el.tagName === "DIV" || el.tagName === "A") {
						const style = window.getComputedStyle(el);
						if (
							style.position === "fixed" &&
							(parseInt(style.zIndex) > 9000 || style.zIndex === "9999") &&
							style.width === "100vw"
						) {
							console.warn("🚫 Overlay pub supprimé");
							el.remove();
						}
					}
				}
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });

		return () => {
			document.removeEventListener("click", blockExternalLinks, true);
			window.removeEventListener("blur", blurIframe);
			observer.disconnect();
		};
	}, []);

	return null;
}
