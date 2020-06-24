import {
	App,
	AppOptions,
	TemplatedApp,
	HttpRequest,
	HttpResponse,
} from 'uWebSockets.js'
import regexparam from 'regexparam'
import { promises as fs } from 'fs'
import path from 'path'

export type RequestHandler = (
	req: HttpRequest,
	res: HttpResponse
) => Promise<void>

interface Route {
	route: {
		keys: string[]
		pattern: RegExp
	}
	handler: RequestHandler
}

export class Router {
	routesDir: string

	constructor(routesDir: string) {
		this.routesDir = path.isAbsolute(routesDir)
			? routesDir
			: path.join(__dirname, routesDir)
	}

	async init() {
		const routes = await this.recursivelyGetRoutes(this.routesDir)
		console.log(routes)
	}

	async recursivelyGetRoutes(routesDir: string, prefixRoute = '') {
		const dir = await fs.readdir(routesDir)
		const routesArr: Route[] = []

		for (let itemName of dir) {
			// Ignore paths or files that start with underscore
			if (itemName.startsWith('_')) continue

			const itemPath = path.join(routesDir, itemName)
			const itemStat = await fs.stat(itemPath)
			const parsedItemPath = path.parse(itemPath)

			const currentRoute = prefixRoute + '/' + parsedItemPath.name

			// In case of directory use their folder name as sub-path
			if (itemStat.isDirectory()) {
				const subRoutes = await this.recursivelyGetRoutes(
					itemPath,
					currentRoute
				)
				routesArr.push(...subRoutes)
			}

			// In case of files use their name as path
			if (itemStat.isFile() && parsedItemPath.ext === '.js') {
				routesArr.push({
					route: regexparam(currentRoute),
					handler: (await import(itemPath)).default,
				})
			}
		}

		return routesArr
	}
}
