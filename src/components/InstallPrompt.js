"use client";

import { useState, useEffect } from "react";

export default function InstallPrompt() {
	const [show, setShow] = useState(false);

	useEffect(() => {
		// On vérifie si on est sur mobile et si l'app n'est pas déjà installée ("standalone")
		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
		const isStandalone = window.matchMedia(
			"(display-mode: standalone)",
		).matches;

		if (isMobile && !isStandalone) {
			// On affiche le popup après 3 secondes pour ne pas agresser l'utilisateur
			const timer = setTimeout(() => setShow(true), 3000);
			return () => clearTimeout(timer);
		}
	}, []);

	if (!show) return null;

	return (
		<div className="fixed bottom-24 left-4 right-4 z-[100] md:hidden">
			<div className="bg-zinc-900 border border-white/10 p-4 rounded-sm shadow-2xl flex flex-col gap-3">
				<div className="flex justify-between items-start">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-red-600 rounded-sm flex items-center justify-center font-black italic text-white text-xs transform -skew-x-6">
							K
						</div>
						<div>
							<p className="text-[10px] font-black uppercase italic text-white tracking-widest">
								Installer KATCH
							</p>
							<p className="text-[8px] text-zinc-500 uppercase font-bold">
								Ajoute l'app sur ton écran d'accueil
							</p>
						</div>
					</div>
					<button
						onClick={() => setShow(false)}
						className="text-zinc-500 text-xs p-1"
					>
						✕
					</button>
				</div>

				<div className="bg-black/50 p-2 rounded-sm border border-white/5 flex items-center gap-3">
					<div className="flex flex-col items-center gap-1">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="white"
							strokeWidth="2"
							className="w-4 h-4 opacity-70"
						>
							<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
						</svg>
					</div>
					<p className="text-[8px] font-medium text-zinc-300 leading-tight">
						Appuie sur <span className="text-white font-bold">"Partager"</span>{" "}
						puis sur{" "}
						<span className="text-white font-bold">
							"Sur l'écran d'accueil"
						</span>{" "}
						pour l'installer.
					</p>
				</div>
			</div>
		</div>
	);
}
