"use client";

import { useEffect, useRef } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

export default function CustomPlayer({ videoUrl, title }) {
	const videoRef = useRef(null);

	useEffect(() => {
		// Sécurité pour s'assurer qu'on est bien côté navigateur
		if (typeof window === "undefined" || !videoRef.current) return;

		// Initialisation du lecteur Plyr officiel
		const player = new Plyr(videoRef.current, {
			title: title,
			controls: [
				"play-large", // Gros bouton central
				"play", // Petit bouton play
				"progress", // Barre d'avancement
				"current-time",
				"duration",
				"mute",
				"volume",
				"settings",
				"fullscreen",
			],
			settings: ["speed"], // On garde juste la vitesse pour un look épuré
		});

		// Nettoyage quand on quitte la page
		return () => {
			if (player) {
				player.destroy();
			}
		};
	}, []);

	return (
		<div className="relative w-full aspect-video bg-black rounded-t-lg shadow-[0_0_30px_rgba(220,38,38,0.15)] overflow-hidden border border-white/5 border-b-0">
			{/* Plyr permet de changer sa couleur principale avec une simple variable CSS ! */}
			<style jsx global>{`
				:root {
					--plyr-color-main: #dc2626; /* Rouge KATCH */
				}
			`}</style>

			{/* La balise vidéo HTML standard, transformée par Plyr en lecteur magnifique */}
			<video ref={videoRef} controls crossOrigin="anonymous" playsInline>
				<source src={videoUrl} type="video/mp4" />
			</video>
		</div>
	);
}
