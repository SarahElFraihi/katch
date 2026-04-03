"use client";

import { useRef, useState, useEffect } from "react";

export default function PlayerWrapper({ videoUrl }) {
	const containerRef = useRef(null);
	const [isFullscreen, setIsFullscreen] = useState(false);

	// Détecte si on est en plein écran ou non pour changer le texte du bouton
	useEffect(() => {
		const onFullscreenChange = () => {
			setIsFullscreen(
				!!document.fullscreenElement || !!document.webkitFullscreenElement,
			);
		};
		document.addEventListener("fullscreenchange", onFullscreenChange);
		document.addEventListener("webkitfullscreenchange", onFullscreenChange);

		return () => {
			document.removeEventListener("fullscreenchange", onFullscreenChange);
			document.removeEventListener(
				"webkitfullscreenchange",
				onFullscreenChange,
			);
		};
	}, []);

	// La fonction qui force la boîte à prendre tout l'écran
	const handleFullscreen = () => {
		if (!document.fullscreenElement && !document.webkitFullscreenElement) {
			if (containerRef.current?.requestFullscreen) {
				containerRef.current.requestFullscreen();
			} else if (containerRef.current?.webkitRequestFullscreen) {
				// Pour Safari / iOS
				containerRef.current.webkitRequestFullscreen();
			}
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			}
		}
	};

	return (
		<div
			ref={containerRef}
			className="player-container relative w-full aspect-video bg-zinc-900 border border-red-900/30 rounded-sm shadow-[0_0_30px_rgba(220,38,38,0.1)] group"
		>
			<iframe
				key={videoUrl}
				src={videoUrl}
				className="absolute inset-0 w-full h-full rounded-sm"
				allow="autoplay; fullscreen; picture-in-picture"
				allowFullScreen
				referrerPolicy="origin"
			/>

			{/* Bouton de forçage (Toujours visible sur mobile, au survol sur PC) */}
			<button
				onClick={handleFullscreen}
				className="absolute top-2 right-2 z-50 bg-black/80 text-white px-2 py-2 md:px-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-sm border border-red-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity active:bg-red-600 md:hover:bg-red-600 md:hover:text-white shadow-lg shadow-black/50"
			>
				{isFullscreen ? "Quitter" : "[ ] Plein Écran"}
			</button>
		</div>
	);
}
