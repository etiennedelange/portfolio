<script lang="ts">
	import { onMount } from 'svelte';

	let menuOpen = $state(false);
	let scrolled = $state(false);
	let isDark = $state(false);

	const navItems = [
		{ id: 'about', label: 'About' },
		{ id: 'experience', label: 'Experience' },
		{ id: 'skills', label: 'Skills' },
		{ id: 'education', label: 'Education' },
		{ id: 'contact', label: 'Contact' }
	];

	const experiences = [
		{
			company: 'MRI Software',
			role: 'Software Engineer III',
			period: 'May 2022 – Present',
			tech: ['Azure', '.NET', 'C#', 'ASP.NET MVC', 'Umbraco', 'GitHub', 'Azure DevOps', 'SQL'],
			highlights: [
				'Develop new features and fix bugs across a cloud-based real estate software platform.',
				'Conduct code reviews via GitHub pull requests to maintain quality standards.',
				'Sprint planning and tracking with JIRA in an agile team.'
			]
		},
		{
			company: 'LexisNexis',
			role: 'Mid – Senior Software Engineer',
			period: 'May 2016 – May 2022',
			tech: ['.NET 6', 'C#', 'Angular', 'AngularJS', 'TypeScript', 'SQL', 'Azure DevOps', 'Entity Framework', 'SignalR'],
			highlights: [
				'Built and maintained a market-leading conveyancing management system used by banks and attorneys.',
				'Sole developer of an internal admin website using .NET Core, Angular 13, SignalR, and Azure DevOps CI/CD pipelines.',
				'Mentored junior developers and ran check-in reviews to enforce code quality.',
				'Managed Azure DevOps build and release pipelines for continuous integration and deployment.'
			]
		},
		{
			company: 'Tigers Limited',
			role: 'Mid – Senior Software Engineer',
			period: 'Nov 2015 – Mar 2016',
			tech: ['.NET', 'C#', 'AngularJS', 'ASP.NET Web API', 'ASP.NET Identity', 'SQL', 'TFS'],
			highlights: [
				'Developed a warehouse orders portal enabling complex stock queries for a global logistics provider.',
				'Built a VSTO add-in for Microsoft Outlook.'
			]
		},
		{
			company: 'Property24',
			role: 'Mid-level Software Engineer',
			period: 'Nov 2014 – Oct 2015',
			tech: ['C#', 'Java', 'Android', 'iOS', 'Xamarin', 'SQLite', 'OrmLite'],
			highlights: [
				'Developed and maintained iOS and Android property listing applications with search, favourites, and agent contact features.',
				'Participated in user experience sessions to improve usability.'
			]
		},
		{
			company: 'Korbitec',
			role: 'Junior – Mid Software Engineer',
			period: 'Jan 2011 – Oct 2014',
			tech: ['.NET', 'C#', 'WPF', 'WinForms', 'SQL', 'LINQ', 'TortoiseSVN'],
			highlights: [
				'Contributed to a desktop back-office solution for estate agents managing property listings and sales.',
				'Built reporting components using SQL views and WPF/WinForms.',
				'Involved in the full SDLC from analysis and design through to deployment.'
			]
		}
	];

	const skillGroups = [
		{
			label: 'Cloud & DevOps',
			skills: ['Microsoft Azure', 'Azure DevOps', 'IIS', 'CI/CD Pipelines']
		},
		{
			label: 'Backend',
			skills: ['.NET / .NET Core', 'C#', 'ASP.NET Core', 'ASP.NET MVC', 'ASP.NET Web API', 'Entity Framework', 'LINQ', 'SQL', 'WCF', 'NodeJS']
		},
		{
			label: 'Frontend',
			skills: ['Angular', 'AngularJS', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'SignalR', 'Umbraco']
		},
		{
			label: 'Mobile & Desktop',
			skills: ['iOS', 'Android', 'Xamarin', 'WPF', 'WinForms', 'Java']
		},
		{
			label: 'Tools & Process',
			skills: ['Git', 'GitHub', 'Agile / Scrum', 'JIRA', 'Trello', 'Visual Studio', 'VS Code', 'SQL Server Management Studio']
		}
	];

	const education = [
		{
			degree: 'Baccalaureus Technologiae: Information Technology',
			institution: 'Nelson Mandela Metropolitan University',
			location: 'Port Elizabeth, South Africa',
			year: '2009 – 2010',
			note: 'Cum Laude'
		},
		{
			degree: 'National Diploma: Information Technology',
			institution: 'Nelson Mandela Metropolitan University',
			location: 'Port Elizabeth, South Africa',
			year: '2006 – 2009',
			note: ''
		}
	];

	const certifications = [
		{ title: 'Microsoft Certified: Azure Fundamentals', year: '2023', highlight: true },
		{ title: 'Exam 480: Programming in HTML5 with JavaScript and CSS3', year: '2018', highlight: false },
		{ title: 'Merit Award for Academic Excellence (3rd Level, Nov Examination)', year: '2009', highlight: false },
		{ title: 'Merit Award for Academic Excellence in Final Year Project', year: '2009', highlight: false },
		{ title: 'Top 3rd Year Project', year: '2009', highlight: true },
		{ title: 'Attended Imagine Cup South Africa', year: '2009', highlight: false }
	];

	onMount(() => {
		isDark = document.documentElement.classList.contains('dark');

		const handleScroll = () => {
			scrolled = window.scrollY > 40;
		};
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});

	function toggleDark() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}

	function scrollTo(id: string) {
		menuOpen = false;
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<svelte:head>
	<title>Etienne de Lange – Software Engineer</title>
</svelte:head>

<!-- NAV -->
<header
	class="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
	style:background-color={scrolled ? 'var(--c-bg)' : 'transparent'}
	style:border-bottom={scrolled ? '2px solid var(--c-ink)' : 'none'}
>
	<nav class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a
			href="/"
			class="text-lg font-bold tracking-tight hover:opacity-70 transition-opacity"
			style="color: var(--c-ink);"
		>
			Etienne<span style="color: var(--c-accent);" class="ml-1">.</span>
		</a>

		<!-- Desktop nav -->
		<ul class="hidden md:flex items-center gap-8">
			{#each navItems as item (item.id)}
				<li>
					<button
						onclick={() => scrollTo(item.id)}
						class="text-sm font-medium transition-colors cursor-pointer hover:opacity-100"
						style="color: var(--c-muted);"
						onmouseenter={(e) => (e.currentTarget.style.color = 'var(--c-ink)')}
						onmouseleave={(e) => (e.currentTarget.style.color = 'var(--c-muted)')}
					>
						{item.label}
					</button>
				</li>
			{/each}
			<li>
				<!-- Dark mode toggle -->
				<button
					class="dm-toggle"
					onclick={toggleDark}
					aria-label="Toggle dark mode"
				>
					<span class:dm-active={!isDark}>☀ LIGHT</span>
					<span class:dm-active={isDark}>☾ DARK</span>
				</button>
			</li>
			<li>
				<a
					href="mailto:etienne.de.lange1@gmail.com"
					class="neo-btn px-4 py-2 text-sm inline-block"
					style="background-color: var(--c-accent); color: #0a0a0a;"
				>
					Hire me
				</a>
			</li>
		</ul>

		<!-- Mobile hamburger -->
		<button
			class="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer"
			onclick={() => (menuOpen = !menuOpen)}
			aria-label="Toggle menu"
		>
			<span
				class="block w-6 h-0.5 transition-all"
				style="background-color: var(--c-ink);"
				class:rotate-45={menuOpen}
				class:translate-y-2={menuOpen}
			></span>
			<span
				class="block w-6 h-0.5 transition-all"
				style="background-color: var(--c-ink);"
				class:opacity-0={menuOpen}
			></span>
			<span
				class="block w-6 h-0.5 transition-all"
				style="background-color: var(--c-ink);"
				class:-rotate-45={menuOpen}
				class:-translate-y-2={menuOpen}
			></span>
		</button>
	</nav>

	<!-- Mobile menu -->
	{#if menuOpen}
		<div
			class="md:hidden px-6 py-4 flex flex-col gap-4"
			style="background-color: var(--c-bg); border-top: 2px solid var(--c-ink);"
		>
			{#each navItems as item (item.id)}
				<button
					onclick={() => scrollTo(item.id)}
					class="text-left text-sm font-medium cursor-pointer"
					style="color: var(--c-muted);"
				>
					{item.label}
				</button>
			{/each}
			<div class="flex items-center gap-3 pt-1">
				<button class="dm-toggle" onclick={toggleDark} aria-label="Toggle dark mode">
					<span class:dm-active={!isDark}>☀ LIGHT</span>
					<span class:dm-active={isDark}>☾ DARK</span>
				</button>
				<a
					href="mailto:etienne.de.lange1@gmail.com"
					class="neo-btn px-4 py-2 text-sm inline-block"
					style="background-color: var(--c-accent); color: #0a0a0a;"
				>
					Hire me
				</a>
			</div>
		</div>
	{/if}
</header>

<!-- HERO -->
<section id="hero" class="min-h-screen flex flex-col justify-center px-6 pt-24 pb-16 max-w-6xl mx-auto">
	<div class="max-w-3xl">
		<p class="text-sm font-semibold uppercase tracking-widest mb-6" style="color: var(--c-muted);">
			Software Engineer · Port Elizabeth, South Africa
		</p>

		<h1 class="text-6xl sm:text-7xl md:text-8xl font-bold leading-none tracking-tight mb-6">
			Etienne<br />
			<span class="relative inline-block">
				de Lange
				<span
					class="absolute -bottom-2 left-0 right-0 h-4 -z-10"
					style="background-color: var(--c-accent);"
				></span>
			</span>
		</h1>

		<p class="text-lg md:text-xl max-w-xl leading-relaxed mt-8 mb-10" style="color: var(--c-muted);">
			14+ years crafting robust software — from conveyancing systems and property apps
			to microservices on Azure. I take pride in every line of code.
		</p>

		<div class="flex flex-wrap gap-4">
			<button
				onclick={() => scrollTo('experience')}
				class="neo-btn px-6 py-3 font-semibold"
				style="background-color: var(--c-accent); color: #0a0a0a;"
			>
				View Experience
			</button>
			<button
				onclick={() => scrollTo('contact')}
				class="neo-btn px-6 py-3 font-semibold"
				style="background-color: var(--c-bg);"
			>
				Get in touch
			</button>
		</div>
	</div>

	<!-- Stats row -->
	<div class="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6">
		{#each [
			{ value: '14+', label: 'Years experience' },
			{ value: '5', label: 'Companies' },
			{ value: '2', label: 'Certifications' },
			{ value: 'Cum Laude', label: 'Graduate' }
		] as stat (stat.label)}
			<div class="pt-4" style="border-top: 2px solid var(--c-ink);">
				<p class="text-3xl font-bold">{stat.value}</p>
				<p class="text-sm mt-1" style="color: var(--c-muted);">{stat.label}</p>
			</div>
		{/each}
	</div>
</section>

<!-- ABOUT -->
<section id="about" class="py-24 px-6" style="background-color: var(--c-bg-alt);">
	<div class="max-w-6xl mx-auto">
		<div class="grid md:grid-cols-2 gap-16 items-start">
			<div>
				<p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--c-muted);">
					01 / About
				</p>
				<h2 class="text-4xl md:text-5xl font-bold leading-tight">
					Passionate about<br />great software.
				</h2>
			</div>
			<div class="space-y-5 leading-relaxed" style="color: var(--c-muted);">
				<p>
					I started my career in January 2011 and have since worked across desktop applications,
					mobile platforms, web portals, and cloud-based microservices — always focused on delivering
					quality and going the extra mile.
				</p>
				<p>
					At LexisNexis I was the sole architect of an internal admin platform, setting up full CI/CD
					pipelines in Azure DevOps from scratch. At MRI Software I've deepened my Azure expertise,
					developing microservices that power real estate management at scale.
				</p>
				<p>
					Agile methodologies, code reviews, and mentoring junior developers have been constants
					throughout my career. I believe that clean, reviewable code is the foundation of every
					great product.
				</p>
				<div class="flex flex-wrap gap-2 pt-2">
					{#each ['Problem Solver', 'Team Player', 'Mentor', 'Agile Practitioner'] as trait (trait)}
						<span class="neo-tag">{trait}</span>
					{/each}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- EXPERIENCE -->
<section id="experience" class="py-24 px-6">
	<div class="max-w-6xl mx-auto">
		<p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--c-muted);">
			02 / Experience
		</p>
		<h2 class="text-4xl md:text-5xl font-bold mb-16">Where I've worked.</h2>

		<div class="space-y-8">
			{#each experiences as job (job.company)}
				<div class="neo-card p-8">
					<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
						<div>
							<h3 class="text-xl font-bold">{job.company}</h3>
							<p class="font-medium mt-0.5" style="color: var(--c-muted);">{job.role}</p>
						</div>
						<span class="neo-tag self-start sm:self-auto shrink-0 mt-1">{job.period}</span>
					</div>

					<ul class="space-y-2 mb-6">
						{#each job.highlights as point (point)}
							<li class="flex gap-3 text-sm leading-relaxed" style="color: var(--c-muted);">
								<span style="color: var(--c-accent);" class="font-bold mt-0.5 shrink-0">→</span>
								{point}
							</li>
						{/each}
					</ul>

					<div class="flex flex-wrap gap-2">
						{#each job.tech as t (t)}
							<span
								class="text-xs px-2 py-0.5 font-medium"
								style="border: 1px solid var(--c-border-soft); color: var(--c-muted);"
							>{t}</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- SKILLS -->
<section id="skills" class="py-24 px-6" style="background-color: var(--c-bg-alt);">
	<div class="max-w-6xl mx-auto">
		<p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--c-muted);">
			03 / Skills
		</p>
		<h2 class="text-4xl md:text-5xl font-bold mb-16">What I work with.</h2>

		<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
			{#each skillGroups as group (group.label)}
				<div>
					<h3
						class="text-xs font-bold uppercase tracking-widest mb-4 pb-2"
						style="border-bottom: 2px solid var(--c-ink);"
					>
						{group.label}
					</h3>
					<div class="flex flex-wrap gap-2">
						{#each group.skills as skill (skill)}
							<span class="neo-tag">{skill}</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- EDUCATION -->
<section id="education" class="py-24 px-6">
	<div class="max-w-6xl mx-auto">
		<p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--c-muted);">
			04 / Education
		</p>
		<h2 class="text-4xl md:text-5xl font-bold mb-16">Academic background.</h2>

		<div class="grid md:grid-cols-2 gap-8 mb-16">
			{#each education as edu (edu.degree)}
				<div class="neo-card p-8">
					<p class="text-sm font-semibold mb-3" style="color: var(--c-muted);">{edu.year}</p>
					<h3 class="text-lg font-bold leading-snug mb-2">{edu.degree}</h3>
					<p class="text-sm" style="color: var(--c-muted);">{edu.institution}</p>
					<p class="text-xs mt-1" style="color: var(--c-muted); opacity: 0.7;">{edu.location}</p>
					{#if edu.note}
						<span class="neo-tag mt-4 inline-block">{edu.note}</span>
					{/if}
				</div>
			{/each}
		</div>

		<p class="text-xs font-bold uppercase tracking-widest mb-6" style="color: var(--c-muted);">
			Certifications & Achievements
		</p>
		<div class="space-y-3">
			{#each certifications as cert (cert.title)}
				<div
					class="flex items-center justify-between gap-4 py-3"
					style="border-bottom: 1px solid var(--c-border-soft);"
				>
					<div class="flex items-center gap-3">
						{#if cert.highlight}
							<span
								class="w-2 h-2 shrink-0 inline-block"
								style="background-color: var(--c-accent); border: 1px solid var(--c-ink);"
							></span>
						{:else}
							<span
								class="w-2 h-2 shrink-0 inline-block"
								style="background-color: var(--c-border-soft); border: 1px solid var(--c-muted); opacity: 0.6;"
							></span>
						{/if}
						<span class="text-sm font-medium">{cert.title}</span>
					</div>
					<span class="text-sm shrink-0" style="color: var(--c-muted);">{cert.year}</span>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- CONTACT -->
<section id="contact" class="contact-section py-24 px-6">
	<div class="max-w-6xl mx-auto">
		<p class="contact-muted text-xs font-bold uppercase tracking-widest mb-3">05 / Contact</p>
		<h2 class="text-4xl md:text-5xl font-bold mb-6 leading-tight">
			Let's build something<br />
			<span class="relative inline-block">
				great together
				<span
					class="absolute -bottom-1 left-0 right-0 h-3 -z-10"
					style="background-color: var(--c-contact-hover);"
				></span>
			</span>
			.
		</h2>

		<p class="contact-muted max-w-md mb-12 text-lg">
			Open to new opportunities. Reach out and let's talk.
		</p>

		<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
			{#each [
				{ label: 'Email', value: 'etienne.de.lange1@gmail.com', href: 'mailto:etienne.de.lange1@gmail.com' },
				{ label: 'Phone', value: '+27 76 920 9230', href: 'tel:+27769209230' },
				{ label: 'Location', value: 'Port Elizabeth, South Africa', href: null }
			] as item (item.label)}
				<div class="contact-card p-6">
					<p class="contact-muted text-xs font-bold uppercase tracking-widest mb-2">{item.label}</p>
					{#if item.href}
						<a href={item.href} class="contact-link font-semibold text-sm break-all">{item.value}</a>
					{:else}
						<p class="font-semibold text-sm">{item.value}</p>
					{/if}
				</div>
			{/each}
		</div>

		<div class="flex flex-wrap gap-4 items-center">
			<a href="mailto:etienne.de.lange1@gmail.com" class="contact-cta px-8 py-4">
				Send an email
			</a>
			<p class="contact-aside text-sm">Available for freelance & full-time roles</p>
		</div>
	</div>
</section>

<!-- FOOTER -->
<footer class="py-8 px-6" style="border-top: 2px solid var(--c-ink);">
	<div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
		<p class="text-sm" style="color: var(--c-muted);">
			© {new Date().getFullYear()} Etienne de Lange
		</p>
		<p class="text-xs" style="color: var(--c-muted); opacity: 0.6;">Built with SvelteKit · Tailwind CSS</p>
	</div>
</footer>
