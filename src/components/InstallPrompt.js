"use client";

import { useState, useEffect } from "react";

export default function InstallPrompt() {
	const [show, setShow] = useState(false);
	const [deferredPrompt, setDeferredPrompt] = useState(null);
	const [platform, setPlatform] = useState("android");

	useEffect(() => {
		// 1. On vérifie si l'utilisateur a déjà refusé récemment
		const lastDismissed = localStorage.getItem("katch_prompt_dismissed");
		const isDismissed =
			lastDismissed && Date.now() - parseInt(lastDismissed) < 604800000; // 7 jours

		// 2. Détection de la plateforme et du mode standalone
		const isIOS =
			/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
		const isStandalone = window.matchMedia(
			"(display-mode: standalone)",
		).matches;

		setPlatform(isIOS ? "ios" : "android");

		// Logic pour Android/Chrome
		window.addEventListener("beforeinstallprompt", (e) => {
			e.preventDefault();
			setDeferredPrompt(e);
			if (!isStandalone && !isDismissed) setShow(true);
		});

		// Logic pour iOS (car beforeinstallprompt n'existe pas)
		if (isIOS && !isStandalone && !isDismissed) {
			const timer = setTimeout(() => setShow(true), 3000);
			return () => clearTimeout(timer);
		}
	}, []);

	const handleInstallClick = async () => {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === "accepted") {
			setShow(false);
		}
		setDeferredPrompt(null);
	};

	const dismiss = () => {
		localStorage.setItem("katch_prompt_dismissed", Date.now().toString());
		setShow(false);
	};

	if (!show) return null;

	return (
		<div className="fixed bottom-24 left-4 right-4 z-[100] md:hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
			<div className="bg-zinc-900 border border-red-900/30 p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4">
				{/* Header */}
				<div className="flex justify-between items-start">
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center font-black italic text-white text-xl shadow-lg transform -skew-x-6">
							K
						</div>
						<div>
							<p className="text-sm font-black uppercase italic text-white tracking-wider">
								KATCH App
							</p>
							<p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tight">
								Le streaming sans limite
							</p>
						</div>
					</div>
					<button
						onClick={dismiss}
						className="text-zinc-500 hover:text-white p-1 transition-colors"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							className="w-4 h-4"
						>
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Body & Button */}
				{platform === "android" ? (
					<button
						onClick={handleInstallClick}
						className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-black uppercase italic text-xs tracking-widest transition-all active:scale-95 shadow-lg border-b-4 border-red-900"
					>
						INSTALLER L'APPLICATION
					</button>
				) : (
					<div className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center gap-4">
						<div className="flex-none bg-zinc-800 p-2 rounded-lg">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="white"
								strokeWidth="2"
								className="w-5 h-5"
							>
								<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
							</svg>
						</div>
						<p className="text-[10px] font-medium text-zinc-300 leading-snug">
							Pour installer, appuie sur{" "}
							<span className="text-white font-black italic">Partager</span>{" "}
							puis sur{" "}
							<span className="text-white font-black italic text-red-500">
								Sur l'écran d'accueil
							</span>
							.
						</p>
					</div>
				)}
			</div>
			{/* Flèche pour iOS qui pointe vers le centre du bas de l'écran */}
			{platform === "ios" && (
				<div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900 rotate-45 border-r border-b border-red-900/30"></div>
			)}
		</div>
	);
}
