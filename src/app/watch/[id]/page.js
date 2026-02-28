import Link from "next/link";
import WatchActions from "@/components/WatchActions";
import { checkWatchlist } from "@/lib/actions";

async function getDetails(id, type) {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
	const endpoint = type === "movie" ? "movie" : "tv";
	const res = await fetch(
		`https://api.themoviedb.org/3/${endpoint}/${id}?language=fr-FR&api_key=${apiKey}`,
	);
	if (!res.ok) return null;
	return res.json();
}

async function getImdbId(id, type) {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
	const endpoint = type === "movie" ? "movie" : "tv";
	const res = await fetch(
		`https://api.themoviedb.org/3/${endpoint}/${id}/external_ids?api_key=${apiKey}`,
	);
	if (!res.ok) return null;
	const data = await res.json();
	return data.imdb_id || null;
}

async function getSeasonDetails(id, seasonNumber) {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
	const res = await fetch(
		`https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}?language=fr-FR&api_key=${apiKey}`,
	);
	if (!res.ok) return null;
	return res.json();
}

export default async function WatchPage({ params, searchParams }) {
	const { id } = await params;
	const sp = await searchParams;

	const type = sp?.type || "movie";
	const currentSeason = parseInt(sp?.s) || 1;
	const currentEpisode = parseInt(sp?.e) || 1;
	// "vf" ou "vo" — VF par défaut
	const currentLang = sp?.lang === "vo" ? "vo" : "vf";
	// clé de source dans la langue choisie
	const currentServerKey = sp?.server || "1";

	const [data, imdbId] = await Promise.all([
		getDetails(id, type),
		getImdbId(id, type),
	]);

	if (!data)
		return (
			<div className="bg-black min-h-screen flex items-center justify-center text-white font-black italic uppercase">
				CONTENU INTROUVABLE...
			</div>
		);

	const isSeriesOrAnime = type === "tv" || type === "anime";
	const seasonData = isSeriesOrAnime
		? await getSeasonDetails(id, currentSeason)
		: null;

	const hasPrevEpisode = currentEpisode > 1;
	const hasNextEpisode =
		seasonData && currentEpisode < (seasonData.episodes?.length || 0);

	const tmdb = id;
	const imdb = imdbId;

	// ─── SOURCES VF ────────────────────────────────────────────────────────────
	const serversVF = {
		1: {
			name: "VF 1",
			url: isSeriesOrAnime
				? `https://autoembed.cc/tv/tmdb/${tmdb}-${currentSeason}-${currentEpisode}`
				: `https://autoembed.cc/movie/tmdb/${tmdb}`,
		},
		2: {
			name: "VF 2",
			url: isSeriesOrAnime
				? `https://embed.su/embed/tv/${tmdb}/${currentSeason}/${currentEpisode}`
				: `https://embed.su/embed/movie/${tmdb}`,
		},
		3: {
			name: "VF 3",
			url: isSeriesOrAnime
				? `https://www.2embed.stream/embed/tv/${imdb || tmdb}/${currentSeason}/${currentEpisode}`
				: `https://www.2embed.stream/embed/movie/${imdb || tmdb}`,
		},
	};

	// ─── SOURCES VO (anglais / version originale) ──────────────────────────────
	const serversVO = {
		1: {
			name: "VO 1",
			url: isSeriesOrAnime
				? `https://vidsrc.to/embed/tv/${tmdb}/${currentSeason}/${currentEpisode}`
				: `https://vidsrc.to/embed/movie/${tmdb}`,
		},
		2: {
			name: "VO 2",
			url: isSeriesOrAnime
				? `https://vidlink.pro/tv/${tmdb}/${currentSeason}/${currentEpisode}`
				: `https://vidlink.pro/movie/${tmdb}`,
		},
		3: {
			name: "VO 3",
			url: isSeriesOrAnime
				? `https://vidsrc.xyz/embed/tv/${tmdb}/${currentSeason}/${currentEpisode}`
				: `https://vidsrc.xyz/embed/movie/${tmdb}`,
		},
	};

	const servers = currentLang === "vf" ? serversVF : serversVO;
	const videoUrl =
		servers[currentServerKey]?.url || Object.values(servers)[0].url;

	const releaseYear = (
		data.release_date ||
		data.first_air_date ||
		""
	).substring(0, 4);
	const rating = data.vote_average ? data.vote_average.toFixed(1) : "";

	const isListed = await checkWatchlist(id);
	const mediaDataForDb = {
		id,
		type,
		title: data.title || data.name,
		poster_path: data.poster_path,
		season: currentSeason,
		episode: currentEpisode,
	};

	// Helper pour construire les liens en gardant tous les params
	const watchLink = (overrides = {}) => {
		const p = {
			type,
			lang: currentLang,
			s: currentSeason,
			e: currentEpisode,
			server: currentServerKey,
			...overrides,
		};
		return `/watch/${id}?${new URLSearchParams(p).toString()}`;
	};

	return (
		<main className="min-h-screen bg-black text-white selection:bg-red-600 pb-20">
			{/* Header */}
			<header className="w-full p-6 flex justify-between items-center border-b border-red-900/50 bg-black">
				<Link
					href="/"
					className="text-gray-400 hover:text-white flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-colors"
				>
					<span className="text-red-600 text-xl">←</span> RETOUR
				</Link>
				<h1 className="text-2xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent transform -skew-x-6">
					KATCH
				</h1>
			</header>

			<div className="max-w-7xl mx-auto px-4 md:px-8 mt-10">
				{/* Titre + meta */}
				<div className="mb-6">
					<h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white transform -skew-x-3 mb-2">
						{data.title || data.name}
					</h2>
					<div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
						{rating && <span className="text-yellow-500">★ {rating}</span>}
						{releaseYear && <span>{releaseYear}</span>}
						{isSeriesOrAnime && (
							<span className="text-red-600 border border-red-600 px-1">
								{data.number_of_seasons} SAISONS
							</span>
						)}
					</div>
					<WatchActions
						mediaData={mediaDataForDb}
						initialIsListed={isListed}
						t={{ in_list: "DANS MA LISTE", add_list: "MA LISTE" }}
					/>
				</div>

				<div className="flex flex-col lg:flex-row gap-8">
					<div className="flex-1">
						{/* Player */}
						<div className="relative w-full aspect-video bg-zinc-900 border border-red-900/30 rounded-sm shadow-[0_0_30px_rgba(220,38,38,0.1)]">
							<iframe
								key={videoUrl}
								src={videoUrl}
								className="absolute inset-0 w-full h-full rounded-sm"
								allowFullScreen
								allow="autoplay; fullscreen; picture-in-picture"
								referrerPolicy="origin"
							/>
						</div>

						{/* Barre VF / VO + sources */}
						<div className="bg-zinc-900 border-x border-b border-red-900/30 rounded-b-sm p-3 flex flex-col gap-3">
							{/* Ligne 1 : sélecteur de langue */}
							<div className="flex items-center gap-2">
								<span className="text-red-600 font-black text-xs">///</span>
								<span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic mr-3">
									LANGUE
								</span>
								{/* Bouton VF */}
								<Link
									href={watchLink({ lang: "vf", server: "1" })}
									scroll={false}
								>
									<button
										className={`px-4 py-2 text-[10px] font-black uppercase rounded-sm transition-all border-b-2 ${
											currentLang === "vf"
												? "bg-red-600 text-white border-red-900"
												: "bg-black text-zinc-500 border-transparent hover:text-white hover:bg-zinc-800"
										}`}
									>
										🇫🇷 VF
									</button>
								</Link>
								{/* Bouton VO */}
								<Link
									href={watchLink({ lang: "vo", server: "1" })}
									scroll={false}
								>
									<button
										className={`px-4 py-2 text-[10px] font-black uppercase rounded-sm transition-all border-b-2 ${
											currentLang === "vo"
												? "bg-red-600 text-white border-red-900"
												: "bg-black text-zinc-500 border-transparent hover:text-white hover:bg-zinc-800"
										}`}
									>
										🇬🇧 VO
									</button>
								</Link>
							</div>

							{/* Ligne 2 : sélecteur de source */}
							<div className="flex items-center gap-2">
								<span className="text-red-600 font-black text-xs">///</span>
								<span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic mr-3">
									SOURCE
								</span>
								{Object.entries(servers).map(([key, server]) => (
									<Link
										key={key}
										href={watchLink({ server: key })}
										scroll={false}
									>
										<button
											className={`px-4 py-2 text-[10px] font-black uppercase rounded-sm transition-all border-b-2 ${
												currentServerKey === key
													? "bg-zinc-700 text-white border-zinc-900"
													: "bg-black text-zinc-500 border-transparent hover:text-white hover:bg-zinc-800"
											}`}
										>
											{server.name}
										</button>
									</Link>
								))}
							</div>
						</div>

						{/* Navigation épisodes */}
						{isSeriesOrAnime && (
							<div className="flex justify-between mt-4">
								{hasPrevEpisode ? (
									<Link
										href={watchLink({ e: currentEpisode - 1 })}
										scroll={false}
									>
										<button className="px-6 py-3 text-[10px] font-black bg-zinc-900 text-white border border-red-900/30 rounded-sm hover:bg-red-600 uppercase italic transition-all">
											← PRÉC.
										</button>
									</Link>
								) : (
									<div />
								)}
								{hasNextEpisode ? (
									<Link
										href={watchLink({ e: currentEpisode + 1 })}
										scroll={false}
									>
										<button className="px-6 py-3 text-[10px] font-black bg-red-600 text-white border-b-2 border-red-900 rounded-sm hover:scale-105 uppercase italic transition-all">
											SUIV. →
										</button>
									</Link>
								) : (
									<div />
								)}
							</div>
						)}
					</div>

					{/* Sidebar séries */}
					{isSeriesOrAnime && (
						<div className="w-full lg:w-80 flex flex-col gap-6">
							{/* Saisons */}
							{data.seasons?.filter((s) => s.season_number > 0).length > 1 && (
								<div className="bg-zinc-900 border border-red-900/30 p-4 rounded-sm">
									<h3 className="text-xs font-black uppercase mb-4 text-white italic tracking-widest flex items-center gap-2">
										<span className="text-red-600">///</span> SAISONS
									</h3>
									<div className="grid grid-cols-4 gap-2">
										{data.seasons
											?.filter((s) => s.season_number > 0)
											.map((s) => (
												<Link
													key={s.id}
													href={watchLink({ s: s.season_number, e: 1 })}
													scroll={false}
												>
													<button
														className={`w-full py-2 text-[10px] font-black uppercase rounded-sm border-b-2 transition-all ${
															currentSeason === s.season_number
																? "bg-red-600 text-white border-red-900"
																: "bg-black text-zinc-500 border-transparent hover:text-white hover:bg-zinc-800"
														}`}
													>
														S{s.season_number}
													</button>
												</Link>
											))}
									</div>
								</div>
							)}

							{/* Épisodes */}
							<div className="bg-zinc-900 border border-red-900/30 p-4 rounded-sm flex-1 max-h-[600px] flex flex-col">
								<h3 className="text-xs font-black uppercase mb-4 text-white italic tracking-widest flex items-center gap-2">
									<span className="text-red-600">///</span> ÉPISODES
								</h3>
								<div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
									{seasonData?.episodes?.map((ep) => (
										<Link
											key={ep.id}
											href={watchLink({ e: ep.episode_number })}
											scroll={false}
										>
											<button
												className={`w-full text-left px-4 py-3 text-xs font-bold rounded-sm border-l-2 transition-all flex items-center gap-3 ${
													currentEpisode === ep.episode_number
														? "bg-black border-red-600 text-white"
														: "bg-black/50 border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
												}`}
											>
												<span
													className={`text-[10px] font-black ${currentEpisode === ep.episode_number ? "text-red-600" : "text-zinc-700"}`}
												>
													{String(ep.episode_number).padStart(2, "0")}
												</span>
												<span className="truncate">{ep.name}</span>
											</button>
										</Link>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Synopsis */}
				<div className="mt-8 bg-zinc-900/50 border border-white/5 p-6 rounded-sm">
					<p className="text-gray-400 leading-relaxed font-medium text-sm md:text-base">
						{data.overview || "Pas de résumé disponible."}
					</p>
					<div className="mt-4 flex flex-wrap gap-2">
						{data.genres?.map((g) => (
							<span
								key={g.id}
								className="bg-black border border-zinc-800 text-zinc-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm"
							>
								{g.name}
							</span>
						))}
					</div>
				</div>
			</div>
		</main>
	);
}
