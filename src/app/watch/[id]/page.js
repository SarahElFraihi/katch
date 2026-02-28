import Link from "next/link";
import WatchActions from "@/components/WatchActions";
import { checkWatchlist } from "@/lib/actions";

const TRANSLATIONS = {
	fr: {
		back: "RETOUR",
		episodes: "ÉPISODES",
		seasons: "SAISONS",
		error: "CONTENU INTROUVABLE...",
		no_summary: "Pas de résumé disponible en français.",
		server_title: "SOURCES",
		prev_ep: "← PRÉC.",
		next_ep: "SUIV. →",
		in_list: "DANS MA LISTE",
		add_list: "MA LISTE",
	},
	en: {
		back: "BACK",
		episodes: "EPISODES",
		seasons: "SEASONS",
		error: "CONTENT NOT FOUND...",
		no_summary: "No summary available in English.",
		server_title: "SOURCES",
		prev_ep: "← PREV",
		next_ep: "NEXT →",
		in_list: "DANS MA LISTE",
		add_list: "MA LISTE",
	},
};

async function getDetails(id, type, lang = "fr") {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
	const tmdbLang = lang === "fr" ? "fr-FR" : "en-US";
	const endpoint = type === "movie" ? "movie" : "tv";
	const url = `https://api.themoviedb.org/3/${endpoint}/${id}?language=${tmdbLang}&api_key=${apiKey}`;
	const res = await fetch(url);
	if (!res.ok) return null;
	return res.json();
}

async function getSeasonDetails(id, seasonNumber, lang = "fr") {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
	const tmdbLang = lang === "fr" ? "fr-FR" : "en-US";
	const url = `https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}?language=${tmdbLang}&api_key=${apiKey}`;
	const res = await fetch(url);
	if (!res.ok) return null;
	return res.json();
}

export default async function UniversalWatchPage({ params, searchParams }) {
	const { id } = await params;
	const sp = await searchParams;

	const lang = sp?.lang || "fr";
	const type = sp?.type || "movie";
	const currentSeason = parseInt(sp?.s) || 1;
	const currentEpisode = parseInt(sp?.e) || 1;

	const t = TRANSLATIONS[lang];
	const data = await getDetails(id, type, lang);

	if (!data)
		return (
			<div className="bg-black min-h-screen flex items-center justify-center text-white font-black italic uppercase">
				{t.error}
			</div>
		);

	const isSeriesOrAnime = type === "tv" || type === "anime";
	const seasonData = isSeriesOrAnime
		? await getSeasonDetails(id, currentSeason, lang)
		: null;

	const hasPrevEpisode = currentEpisode > 1;
	const hasNextEpisode =
		seasonData && currentEpisode < seasonData.episodes?.length;

	let servers = {};
	if (lang === "fr") {
		servers = {
			multiembed: {
				name: "🚀 LECTEUR AUTO",
				url: `https://multiembed.mov/?video_id=${id}&tmdb=1${isSeriesOrAnime ? `&s=${currentSeason}&e=${currentEpisode}` : ""}`,
			},
			vidsrc_me: {
				name: "🌟 SOURCE 2",
				url:
					type === "movie"
						? `https://vidsrc.me/embed/movie?tmdb=${id}`
						: `https://vidsrc.me/embed/tv?tmdb=${id}&sea=${currentSeason}&epi=${currentEpisode}`,
			},
			vidsrc_xyz: {
				name: "🎬 SOURCE 3",
				url:
					type === "movie"
						? `https://vidsrc.xyz/embed/movie/${id}`
						: `https://vidsrc.xyz/embed/tv/${id}/${currentSeason}/${currentEpisode}`,
			},
		};
	} else {
		servers = {
			vidsrc_to: {
				name: "🇬🇧 ENG 1",
				url:
					type === "movie"
						? `https://vidlink.pro/movie/${id}`
						: `https://vidlink.pro/tv/${id}/${currentSeason}/${currentEpisode}`,
			},
			vidlink: {
				name: "🇬🇧 ENG 2",
				url:
					type === "movie"
						? `https://vidsrc.to/embed/movie/${id}`
						: `https://vidsrc.to/embed/tv/${id}/${currentSeason}/${currentEpisode}`,
			},
		};
	}

	const currentServerKey = sp?.server || Object.keys(servers)[0];
	const videoUrl =
		servers[currentServerKey]?.url || Object.values(servers)[0].url;

	const releaseYear = data.release_date
		? data.release_date.substring(0, 4)
		: data.first_air_date
			? data.first_air_date.substring(0, 4)
			: "";
	const rating = data.vote_average ? data.vote_average.toFixed(1) : "";

	const isListed = await checkWatchlist(id);
	const mediaDataForDb = {
		id: id,
		type: type,
		title: data.title || data.name,
		poster_path: data.poster_path,
		season: currentSeason,
		episode: currentEpisode,
	};

	return (
		<main className="min-h-screen bg-black text-white selection:bg-red-600 pb-20">
			<header className="w-full p-6 flex justify-between items-center border-b border-red-900/50 bg-black">
				<Link
					href={`/?lang=${lang}`}
					className="text-gray-400 hover:text-white flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-colors"
				>
					<span className="text-red-600 text-xl">←</span> {t.back}
				</Link>
				<h1 className="text-2xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent transform -skew-x-6">
					KATCH
				</h1>
			</header>

			<div className="max-w-7xl mx-auto px-4 md:px-8 mt-10">
				<div className="mb-6">
					<h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white transform -skew-x-3 mb-2">
						{data.title || data.name}
					</h2>
					<div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
						{rating && <span className="text-yellow-500">★ {rating}</span>}
						{releaseYear && <span>{releaseYear}</span>}
						{isSeriesOrAnime && (
							<span className="text-red-600 border border-red-600 px-1">
								{data.number_of_seasons} {t.seasons}
							</span>
						)}
					</div>
					<WatchActions
						mediaData={mediaDataForDb}
						initialIsListed={isListed}
						t={t}
					/>
				</div>

				<div className="flex flex-col lg:flex-row gap-8">
					<div className="flex-1">
						<div className="relative w-full aspect-video bg-zinc-900 border border-red-900/30 rounded-sm shadow-[0_0_30px_rgba(220,38,38,0.1)]">
							<iframe
								src={videoUrl}
								className="absolute inset-0 w-full h-full rounded-sm"
								allowFullScreen
							></iframe>
						</div>

						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-zinc-900 border-x border-b border-red-900/30 rounded-b-sm p-3 gap-4">
							<div className="flex items-center gap-2">
								<span className="text-red-600 font-black">///</span>
								<span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 italic">
									{t.server_title}
								</span>
							</div>
							<div className="flex flex-wrap gap-2">
								{Object.entries(servers).map(([key, server]) => (
									<Link
										key={key}
										href={`/watch/${id}?type=${type}&lang=${lang}&s=${currentSeason}&e=${currentEpisode}&server=${key}`}
										scroll={false}
									>
										<button
											className={`px-4 py-2 text-[10px] font-black uppercase italic rounded-sm transition-all border-b-2 ${currentServerKey === key ? "bg-red-600 text-white border-red-900" : "bg-black text-zinc-500 border-transparent hover:text-white hover:bg-zinc-800"}`}
										>
											{server.name}
										</button>
									</Link>
								))}
							</div>
						</div>

						{isSeriesOrAnime && (
							<div className="flex justify-between mt-4">
								{hasPrevEpisode ? (
									<Link
										href={`/watch/${id}?type=${type}&lang=${lang}&s=${currentSeason}&e=${currentEpisode - 1}`}
										scroll={false}
									>
										<button className="px-6 py-3 text-[10px] font-black bg-zinc-900 text-white border border-red-900/30 rounded-sm hover:bg-red-600 uppercase italic">
											{t.prev_ep}
										</button>
									</Link>
								) : (
									<div />
								)}
								{hasNextEpisode ? (
									<Link
										href={`/watch/${id}?type=${type}&lang=${lang}&s=${currentSeason}&e=${currentEpisode + 1}`}
										scroll={false}
									>
										<button className="px-6 py-3 text-[10px] font-black bg-red-600 text-white border-b-2 border-red-900 rounded-sm hover:scale-105 uppercase italic">
											{t.next_ep}
										</button>
									</Link>
								) : (
									<div />
								)}
							</div>
						)}
					</div>

					{isSeriesOrAnime && (
						<div className="w-full lg:w-80 flex flex-col gap-6">
							<div className="bg-zinc-900 border border-red-900/30 p-4 rounded-sm">
								<h3 className="text-xs font-black uppercase mb-4 text-white italic tracking-widest flex items-center gap-2">
									<span className="text-red-600">///</span> {t.seasons}
								</h3>
								<div className="grid grid-cols-4 gap-2">
									{data.seasons
										?.filter((s) => s.season_number > 0)
										.map((s) => (
											<Link
												key={s.id}
												href={`/watch/${id}?type=${type}&lang=${lang}&s=${s.season_number}&e=1`}
												scroll={false}
											>
												<button
													className={`w-full py-2 text-[10px] font-black uppercase rounded-sm border-b-2 transition-all ${currentSeason === s.season_number ? "bg-red-600 text-white border-red-900" : "bg-black text-zinc-500 border-transparent hover:text-white hover:bg-zinc-800"}`}
												>
													S{s.season_number}
												</button>
											</Link>
										))}
								</div>
							</div>
							<div className="bg-zinc-900 border border-red-900/30 p-4 rounded-sm flex-1 max-h-[600px] flex flex-col">
								<h3 className="text-xs font-black uppercase mb-4 text-white italic tracking-widest flex items-center gap-2">
									<span className="text-red-600">///</span> {t.episodes}
								</h3>
								<div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
									{seasonData?.episodes?.map((ep) => (
										<Link
											key={ep.id}
											href={`/watch/${id}?type=${type}&lang=${lang}&s=${currentSeason}&e=${ep.episode_number}`}
											scroll={false}
										>
											<button
												className={`w-full text-left px-4 py-3 text-xs font-bold rounded-sm border-l-2 transition-all flex items-center gap-3 ${currentEpisode === ep.episode_number ? "bg-black border-red-600 text-white" : "bg-black/50 border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"}`}
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

				{/* DESCRIPTION DÉPLACÉE ICI POUR ÊTRE TOUT EN BAS SUR MOBILE */}
				<div className="mt-8 bg-zinc-900/50 border border-white/5 p-6 rounded-sm">
					<p className="text-gray-400 leading-relaxed font-medium text-sm md:text-base">
						{data.overview || t.no_summary}
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
