import Link from "next/link";

// 1. Récupération des infos de la série/anime
async function getShowDetails(id) {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
	const url = `https://api.themoviedb.org/3/tv/${id}?language=fr-FR&api_key=${apiKey}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error("Erreur de récupération");
	return res.json();
}

// 2. Récupération des épisodes d'une saison précise
async function getSeasonDetails(id, seasonNumber) {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
	const url = `https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}?language=fr-FR&api_key=${apiKey}`;
	const res = await fetch(url);
	if (!res.ok) return null;
	return res.json();
}

export default async function AnimeWatchPage({ params, searchParams }) {
	const { id } = await params;
	const sp = await searchParams;

	// Gestion de la saison et de l'épisode via l'URL (S1 E1 par défaut)
	const currentSeason = parseInt(sp?.s) || 1;
	const currentEpisode = parseInt(sp?.e) || 1;
	const currentServer = sp?.server || "serveur1";

	const show = await getShowDetails(id);
	const seasonData = await getSeasonDetails(id, currentSeason);

	// 🗄️ SERVEURS ADAPTÉS POUR LES SÉRIES (ID + S + E)
	const servers = {
		serveur1: {
			name: "🔴 VidLink",
			url: `https://vidlink.pro/tv/${id}/${currentSeason}/${currentEpisode}?primaryColor=ef4444`,
		},
		serveur2: {
			name: "🟠 VidSrc",
			url: `https://vidsrc.to/embed/tv/${id}/${currentSeason}/${currentEpisode}`,
		},
		serveur3: {
			name: "🟡 Multi",
			url: `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${currentSeason}&e=${currentEpisode}`,
		},
	};

	const videoUrl = servers[currentServer]?.url || servers.serveur1.url;

	return (
		<main className="min-h-screen bg-black text-white selection:bg-red-600">
			{/* HEADER */}
			<header className="w-full p-6 flex justify-between items-center border-b border-red-900/30">
				<Link
					href="/"
					className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 font-bold uppercase text-sm"
				>
					<span className="text-red-600 text-xl">←</span> Retour
				</Link>
				<h1 className="text-2xl font-black uppercase italic tracking-tighter text-red-600 opacity-80">
					KATCH
				</h1>
			</header>

			<div className="max-w-7xl mx-auto px-4 md:px-8 pb-20 mt-8">
				<div className="flex flex-col lg:flex-row gap-8">
					{/* COLONNE GAUCHE : LECTEUR ET INFOS */}
					<div className="flex-1">
						<div className="relative w-full aspect-video bg-zinc-900 rounded-t-lg shadow-2xl overflow-hidden border border-white/5">
							<iframe
								src={videoUrl}
								className="absolute inset-0 w-full h-full"
								allowFullScreen
							></iframe>
						</div>

						{/* SELECTEUR DE SERVEURS */}
						<div className="bg-zinc-900 p-4 rounded-b-lg border border-white/5 flex flex-wrap gap-2 mb-8">
							{Object.entries(servers).map(([key, server]) => (
								<Link
									key={key}
									href={`/anime/${id}?s=${currentSeason}&e=${currentEpisode}&server=${key}`}
								>
									<button
										className={`px-4 py-2 text-[10px] font-black uppercase italic rounded-sm border-b-2 transition-all ${currentServer === key ? "bg-red-600 border-red-800" : "bg-zinc-800 border-zinc-950 text-gray-400"}`}
									>
										{server.name}
									</button>
								</Link>
							))}
						</div>

						<h2 className="text-4xl font-black uppercase italic mb-2">
							{show.name}
						</h2>
						<p className="text-zinc-400 font-bold mb-4 uppercase tracking-widest text-xs">
							Saison {currentSeason} — Épisode {currentEpisode}
						</p>
						<p className="text-gray-400 leading-relaxed max-w-2xl">
							{show.overview || "Pas de résumé."}
						</p>
					</div>

					{/* COLONNE DROITE : NAVIGATION ÉPISODES */}
					<div className="w-full lg:w-80 flex flex-col gap-6">
						{/* CHOIX DE LA SAISON */}
						<div className="bg-zinc-900 p-4 rounded border border-white/5">
							<h3 className="text-xs font-black uppercase mb-4 text-red-600 italic tracking-widest">
								Saisons
							</h3>
							<div className="grid grid-cols-3 gap-2">
								{show.seasons
									.filter((s) => s.season_number > 0)
									.map((s) => (
										<Link
											key={s.id}
											href={`/anime/${id}?s=${s.season_number}&e=1`}
										>
											<button
												className={`w-full py-2 text-[10px] font-bold rounded ${currentSeason === s.season_number ? "bg-red-600" : "bg-zinc-800 hover:bg-zinc-700"}`}
											>
												S{s.season_number}
											</button>
										</Link>
									))}
							</div>
						</div>

						{/* LISTE DES ÉPISODES */}
						<div className="bg-zinc-900 p-4 rounded border border-white/5 max-h-[500px] overflow-y-auto">
							<h3 className="text-xs font-black uppercase mb-4 text-red-600 italic tracking-widest">
								Épisodes (S{currentSeason})
							</h3>
							<div className="flex flex-col gap-2">
								{seasonData?.episodes.map((ep) => (
									<Link
										key={ep.id}
										href={`/anime/${id}?s=${currentSeason}&e=${ep.episode_number}`}
									>
										<button
											className={`w-full text-left px-3 py-3 text-[10px] font-bold rounded transition-colors ${currentEpisode === ep.episode_number ? "bg-red-600 text-white" : "bg-zinc-800/50 hover:bg-zinc-800 text-gray-400"}`}
										>
											<span className="mr-2 opacity-50">
												{ep.episode_number}.
											</span>{" "}
											{ep.name}
										</button>
									</Link>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
