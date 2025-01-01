import axios from "axios";
import fs from "fs-extra";
import path from "path";

interface TablerIcon {
	name: string;
	url: string | null;
	type: string;
	path: string;
}

class TablerIconsManager {
	private baseUrl = "https://api.github.com/repos/tabler/tabler-icons/contents/icons";
	private cacheDir = path.join(process.cwd(), ".icon-cache");

	constructor() {
		fs.mkdirpSync(this.cacheDir);
	}

	async fetchAllIcons(): Promise<TablerIcon[]> {
		try {
			// Fetch icon types (filled, outline)
			const iconTypes = await this.fetchIconTypes();

			// Fetch icons concurrently
			const iconPromises = iconTypes.map((type) => this.fetchIconsByType(type));
			const allIcons = await Promise.all(iconPromises);

			return allIcons.flat();
		} catch (error) {
			this.handleError(error);
			return [];
		}
	}

	private async fetchIconTypes(): Promise<string[]> {
		try {
			const response = await axios.get(this.baseUrl);
			return response.data.filter((item: any) => item.type === "dir").map((item: any) => item.name);
		} catch (error) {
			this.handleError(error);
			return [];
		}
	}

	private async fetchIconsByType(type: string): Promise<TablerIcon[]> {
		try {
			const typeUrl = `${this.baseUrl}/${type}`;
			const response = await axios.get(typeUrl);

			return response.data
				.filter((icon: any) => icon.name.endsWith(".svg"))
				.map((icon: any) => ({
					name: icon.name.replace(".svg", ""),
					url: icon.download_url,
					type: type,
					path: icon.path,
				}));
		} catch (error) {
			this.handleError(error);
			return [];
		}
	}

	async downloadAllIcons(icons: TablerIcon[]): Promise<void> {
		for (const icon of icons) {
			await this.downloadIcon(icon);
		}
	}

	private async downloadIcon(icon: TablerIcon): Promise<void> {
		if (!icon.url) return;

		try {
			const response = await axios.get(icon.url, { responseType: "text" });
			const svgContent = response.data;

			// Remove width="24" and height="24" attributes
			let cleanedSvgContent = svgContent.replace(/width="24"/g, "");
			cleanedSvgContent = cleanedSvgContent.replace(/height="24"/g, "");

			const filePath = path.join(this.cacheDir, `${icon.type}-${icon.name}.svg`);
			await fs.writeFile(filePath, cleanedSvgContent);
			console.log(`Downloaded: ${icon.name}`);
		} catch (error) {
			this.handleError(error);
		}
	}

	private handleError(error: any): void {
		console.error("Tabler Icons Error:", error.message);
	}
}

// Main execution function
async function main() {
	const iconManager = new TablerIconsManager();

	try {
		console.log("Fetching Tabler Icons...");
		const icons = await iconManager.fetchAllIcons();

		console.log(`Total Icons Found: ${icons.length}`);

		console.log("Downloading Icons...");
		await iconManager.downloadAllIcons(icons);

		console.log("Icon retrieval complete!");
	} catch (error) {
		console.error("Failed to retrieve icons:", error);
	}
}

// Run the main function
main();
