import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import SecurityShield from "@/components/SecurityShield";
import InstallPrompt from "@/components/InstallPrompt";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata = {
	title: "KATCH",
};

export default function RootLayout({ children }) {
	return (
		<ClerkProvider>
			<html lang="fr">
				<head>
					<link rel="manifest" href="/manifest.json" />
					<meta name="theme-color" content="#000000" />
				</head>
				<body className="antialiased bg-black">
					<SecurityShield />
					<InstallPrompt /> {/* Le popup d'installation */}
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
