import { env } from '$env/dynamic/private';

// Tag a public repo with this topic on GitHub to list it under "More projects".
const PORTFOLIO_TOPIC = 'portfolio';

export type Repo = {
	name: string;
	description: string | null;
	url: string;
	homepageUrl: string | null;
	stars: number;
	language: { name: string; color: string | null } | null;
	topics: string[];
};

export type Projects = { pinned: Repo[]; tagged: Repo[] };

const REPO_FIELDS = `
	name
	description
	url
	homepageUrl
	stargazerCount
	primaryLanguage { name color }
	repositoryTopics(first: 10) { nodes { topic { name } } }
`;

// Everything comes from whoever owns GITHUB_TOKEN — no username to hardcode.
const QUERY = `{
	viewer {
		pinnedItems(first: 6, types: REPOSITORY) {
			nodes { ... on Repository { ${REPO_FIELDS} } }
		}
		repositories(
			first: 100
			privacy: PUBLIC
			ownerAffiliations: OWNER
			isFork: false
			isArchived: false
			orderBy: { field: PUSHED_AT, direction: DESC }
		) {
			nodes { ${REPO_FIELDS} }
		}
	}
}`;

type RepoNode = {
	name: string;
	description: string | null;
	url: string;
	homepageUrl: string | null;
	stargazerCount: number;
	primaryLanguage: { name: string; color: string | null } | null;
	repositoryTopics: { nodes: { topic: { name: string } }[] };
};

function toRepo(r: RepoNode): Repo {
	return {
		name: r.name,
		description: r.description,
		url: r.url,
		homepageUrl: r.homepageUrl || null,
		stars: r.stargazerCount,
		language: r.primaryLanguage,
		topics: r.repositoryTopics.nodes
			.map((t) => t.topic.name)
			.filter((t) => t !== PORTFOLIO_TOPIC)
			.slice(0, 5)
	};
}

const hasTopic = (r: RepoNode) =>
	r.repositoryTopics.nodes.some((t) => t.topic.name === PORTFOLIO_TOPIC);

/** Returns empty lists on any failure so the page still renders without the section. */
export async function getProjects(fetch: typeof globalThis.fetch): Promise<Projects> {
	const empty: Projects = { pinned: [], tagged: [] };

	if (!env.GITHUB_TOKEN) {
		console.warn('GITHUB_TOKEN not set — skipping projects');
		return empty;
	}

	try {
		const res = await fetch('https://api.github.com/graphql', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.GITHUB_TOKEN}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query: QUERY })
		});
		if (!res.ok) throw new Error(`GitHub API ${res.status}`);

		const json = await res.json();
		if (json.errors)
			throw new Error(json.errors.map((e: { message: string }) => e.message).join('; '));

		const pinnedNodes: RepoNode[] = json.data.viewer.pinnedItems.nodes;
		const pinnedUrls = new Set(pinnedNodes.map((r) => r.url));
		const taggedNodes: RepoNode[] = json.data.viewer.repositories.nodes.filter(
			(r: RepoNode) => hasTopic(r) && !pinnedUrls.has(r.url)
		);

		return { pinned: pinnedNodes.map(toRepo), tagged: taggedNodes.map(toRepo) };
	} catch (err) {
		console.error('Failed to fetch projects:', err);
		return empty;
	}
}
