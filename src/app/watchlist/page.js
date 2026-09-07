import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserWatchlist } from "@/lib/actions";

export const metadata = {
	title: "Ma Liste - KATCH",
};

export default async function WatchlistPage({ searchParams }) {
	const { userId } = await auth();

	if (!userId) {
		redirect("/");
	}

	const sp = await searchParams;
	const currentFilter = sp?.type || "all";
	const searchQuery = (sp?.q || "").trim().toLowerCase();

	const allWatchlist = (await getUserWatchlist()) || [];

	// Filtrage par type + recherche par titre
	const filteredWatchlist = allWatchlist.filter((item) => {
		const matchesType =
			currentFilter === "all" || item.media_type === currentFilter;
		const matchesQuery =
			searchQuery === "" ||
			(item.title || "").toLowerCase().includes(searchQuery);
		return matchesType && matchesQuery;
	});

	const tabs = [
		{ id: "all", label: "TOUT" },
		{ id: "movie", label: "FILMS" },
		{ id: "tv", label: "SÉRIES" },
		{ id: "anime", label: "ANIMES" },
		{ id: "kdrama", label: "K-DRAMAS" },
	];

	const getTabUrl = (tabId) => {
		const p = new URLSearchParams();
		if (tabId !== "all") p.set("type", tabId);
		if (searchQuery) p.set("q", searchQuery);
		const qs = p.toString();
		return qs ? `/watchlist?${qs}` : "/watchlist";
	};

	return (
		<main className="min-h-screen bg-black text-white selection:bg-red-600 pb-32 md:pb-20">
			{/* Header retour */}
			<header className="w-full p-6 flex justify-between items-center border-b border-red-900/40 bg-black">
				<Link
					href="/"
					className="text-gray-400 hover:text-white flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-colors"
				>
					<span className="text-red-600 text-xl">←</span> ACCUEIL
				</Link>
				<h1 className="text-2xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-red-600 to-yellow-500 bg-clip-text text-transparent transform -skew-x-6">
					KATCH
				</h1>
			</header>

			<div className="max-w-7xl mx-auto px-4 md:px-12 mt-10">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
					<h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
						<span className="text-red-600">///</span> MA LISTE
					</h2>

					{/* Barre de recherche */}
					<form
						action="/watchlist"
						method="GET"
						className="relative w-full md:w-72"
					>
						{currentFilter !== "all" && (
							<input type="hidden" name="type" value={currentFilter} />
						)}
						<input
							type="text"
							name="q"
							placeholder="CHERCHER DANS MA LISTE..."
							defaultValue={searchQuery}
							className="w-full bg-zinc-900/90 border border-red-900/40 rounded-sm px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-red-600 uppercase italic placeholder:text-zinc-600"
						/>
					</form>
				</div>

				{/* Sélecteur de catégorie */}
				<div className="flex flex-wrap gap-2 md:gap-3 items-center pb-6 border-b border-red-900/30 mb-8">
					{tabs.map((tab) => {
						const isActive = currentFilter === tab.id;
						return (
							<Link
								key={tab.id}
								href={getTabUrl(tab.id)}
								className={`px-4 py-2 text-[10px] md:text-xs font-black uppercase italic rounded-sm transition-all border ${
									isActive
										? "bg-red-600 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] scale-105"
										: "bg-black/50 border-white/10 text-zinc-400 hover:text-white hover:border-white/30"
								}`}
							>
								{tab.label}
							</Link>
						);
					})}
				</div>

				{/* Grille des résultats */}
				{filteredWatchlist.length === 0 ? (
					<div className="text-center py-20 text-zinc-500 font-black uppercase italic text-sm">
						{searchQuery
							? `AUCUN RÉSULTAT POUR "${searchQuery.toUpperCase()}"`
							: "AUCUN TITRE DANS VOTRE LISTE..."}
					</div>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
						{filteredWatchlist.map((item) => {
							const watchUrl = `/watch/${item.media_id || item.id}?type=${item.media_type}`;

							return (
								<Link
									key={item.id || item.media_id}
									href={watchUrl}
									className="group flex flex-col gap-2 transition-transform duration-300 ease-out md:hover:scale-105 will-change-transform"
								>
									<div className="relative aspect-[2/3] overflow-hidden rounded-sm shadow-lg border border-transparent group-hover:border-red-600 transition-colors duration-200 bg-zinc-900">
										<img
											src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
											alt={item.title || ""}
											className="w-full h-full object-cover"
										/>
									</div>
									<h4 className="font-bold text-[9px] md:text-xs uppercase text-zinc-400 group-hover:text-white truncate transition-colors">
										{item.title}
									</h4>
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</main>
	);
}
