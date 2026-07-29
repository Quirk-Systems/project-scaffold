/**
 * Canonical dataset: 111 reforged Quirk concepts.
 *
 * Single source of truth, consumed by both the doc generator
 * (`scripts/generate-ideas-doc.ts`) and the DB seed (`scripts/seed.ts`).
 * Voice is intentionally raw and unfiltered — these are gonzo product
 * concepts, not marketing copy.
 *
 * If you edit this list, re-run `bun run docs:ideas` to regenerate the doc.
 */

export type QuirkCategory =
  | "Creator Forge"
  | "Pixel Cult"
  | "Aggregator Pit"
  | "Fintech Quirk"
  | "Enterprise Brain"
  | "Civic & Infra"
  | "Mind & Body"
  | "Daily Life"
  | "Wildcards";

export type QuirkIdea = {
  /** Stable 1-based ordinal across the whole list. */
  n: number;
  category: QuirkCategory;
  /** Reforged gonzo feature name. */
  name: string;
  /** The original idea this mutated from ('net-new' for wildcards). */
  origin: string;
  /** The reinvented hook — what it actually is, unfiltered. */
  reforged: string;
  /** Why it's ahead of the curve. */
  futureForward: string;
  /** The twist that makes it unmistakably Quirk. */
  quirkTwist: string;
};

/** Display order for the doc sections and seeded experiments. */
export const quirkCategories: QuirkCategory[] = [
  "Creator Forge",
  "Pixel Cult",
  "Aggregator Pit",
  "Fintech Quirk",
  "Enterprise Brain",
  "Civic & Infra",
  "Mind & Body",
  "Daily Life",
  "Wildcards",
];

export const quirkIdeas: QuirkIdea[] = [
  // ----- Creator Forge ---------------------------------------------------
  {
    n: 1,
    category: "Creator Forge",
    name: "Red Pen Reaper",
    origin: "Proofreading: paste a client's doc into ChatGPT and fix it.",
    reforged:
      "Kill the copy-paste circus. An agent that lives inside the doc, rewrites in the client's actual voice, and drops a margin note explaining every damn change so they learn instead of just nodding.",
    futureForward:
      "Voice-aware editing means the fix reads like the author wrote it sober — not like a robot ate a style guide.",
    quirkTwist:
      "Every correction lands as a semantic diff on the asset, so 'why'd you change this' is answered before they even ask.",
  },
  {
    n: 2,
    category: "Creator Forge",
    name: "Inbox Sniper",
    origin: "Email marketing: ChatGPT writes high-converting emails.",
    reforged:
      "Stop spraying the same blast at 50k people. An agent that mutates subject lines per-human and learns who opens at 6am versus who reads on the toilet at noon.",
    futureForward:
      "Per-person tone and send-time personalization at scale is the funeral of batch-and-blast.",
    quirkTwist:
      "Each variant is a run inside one experiment — winners breed, losers get culled automatically.",
  },
  {
    n: 3,
    category: "Creator Forge",
    name: "Ghost in the Machine",
    origin: "Ghostwriting: brainstorm and draft content with ChatGPT.",
    reforged:
      "A persona engine that eats a client's old posts, voice memos, and drunk 2am texts to forge a writing soul you can summon on command.",
    futureForward:
      "An owned, portable 'voice model' becomes a creator's most valuable asset — bigger than the follower count.",
    quirkTwist:
      "The voice lives as a versioned persona + mask, so the client's 2021 edge and 2026 mellow are both on tap.",
  },
  {
    n: 4,
    category: "Creator Forge",
    name: "Campaign Hydra",
    origin: "Marketing campaign: ChatGPT ideates and builds campaigns.",
    reforged:
      "Feed it one ugly product and it spits a whole multi-channel war plan — hooks, angles, meme formats — then runs the bastard and re-targets mid-flight.",
    futureForward:
      "Campaigns stop being decks and start being living agents that rewrite themselves off real engagement.",
    quirkTwist:
      "Every angle is a pipeline branch; the agency just approves winners and watches the map light up.",
  },
  {
    n: 5,
    category: "Creator Forge",
    name: "Keyword Goblin",
    origin: "SEO: ChatGPT finds keywords and builds an SEO strategy.",
    reforged:
      "Burn the keyword spreadsheet. An agent that watches SERP volatility live and rewrites your pages the hour Google twitches.",
    futureForward:
      "SEO shifts from quarterly audits to an always-on gremlin reacting to algo changes in real time.",
    quirkTwist:
      "Page rewrites are tracked as asset versions with score deltas, so you see exactly which mutation moved the rank.",
  },
  {
    n: 6,
    category: "Creator Forge",
    name: "Copy Demon",
    origin: "Copywriting: use ChatGPT to write more and better copy.",
    reforged:
      "Not a draft vending machine — a sparring partner that calls your copy weak, tells you why it's limp, and dares you to make it meaner.",
    futureForward:
      "The next era of copy is adversarial: AI that roasts your work harder than the client ever would.",
    quirkTwist:
      "Every roast is a critique annotation pinned to the asset, so the next draft starts from the wound.",
  },
  {
    n: 7,
    category: "Creator Forge",
    name: "Ad Gremlin",
    origin: "Ads: ChatGPT writes captions for online ads.",
    reforged:
      "Generates fifty filthy little ad variants, then watches them fight to the death in the wild and reports who survived.",
    futureForward:
      "Creative testing collapses from weeks to hours when the agent both writes and judges the brawl.",
    quirkTwist:
      "Each ad is a run with a real outcome — winner, reject, or mutate-again — so the dead ones still teach you something.",
  },
  {
    n: 8,
    category: "Creator Forge",
    name: "Script Kraken",
    origin: "YouTube scripts: ChatGPT writes scripts for clients.",
    reforged:
      "Reverse-engineers a channel's best-performing retention curves and writes scripts engineered to stop the thumb at second three.",
    futureForward:
      "Scripts become data-shaped — built around watch-time physics, not vibes.",
    quirkTwist:
      "Hook variants are scored against retention metrics logged on the run, so 'good writing' finally has a number.",
  },
  {
    n: 9,
    category: "Creator Forge",
    name: "Audience Whisperer",
    origin: "Social media consulting: advise people on building an audience.",
    reforged:
      "A coach that audits your last 90 days of posts, tells you which ones were cowardly, and hands you a posting plan with actual balls.",
    futureForward:
      "Consulting goes from a $5k call to a persistent agent that nags you toward consistency daily.",
    quirkTwist:
      "Your whole post history is captured as assets and annotated for what actually landed — the strategy writes itself.",
  },
  {
    n: 10,
    category: "Creator Forge",
    name: "SaaS Sherpa",
    origin: "SaaS consulting: advise clients on building and growing a SaaS.",
    reforged:
      "An advisor that's read every churn post-mortem on the internet and tells you, bluntly, why your onboarding is the reason people leave.",
    futureForward:
      "Hard-won operator knowledge gets distilled into an always-available agent instead of dying in a Slack DM.",
    quirkTwist:
      "Playbooks live as reusable pipelines you can fork per client instead of rebuilding the deck every time.",
  },
  {
    n: 11,
    category: "Creator Forge",
    name: "Landing Page Lobotomy",
    origin: "Landing page copy: ChatGPT writes high-converting page copy.",
    reforged:
      "Rips out the corporate mush and rebuilds your page around one violent promise, then ships ten headline variants to argue with reality.",
    futureForward:
      "Pages become self-optimizing organisms instead of static brochures nobody touches for a year.",
    quirkTwist:
      "Each headline is an experiment run; the conversion delta is a hard score, not a designer's gut feeling.",
  },
  {
    n: 12,
    category: "Creator Forge",
    name: "Cold Open Assassin",
    origin: "Cold outreach: ChatGPT writes emails to get leads.",
    reforged:
      "Researches the target before it writes a word, opens with something only a human who gave a shit would know, and never says 'I hope this finds you well.'",
    futureForward:
      "Outreach stops being volume spam and becomes per-target reconnaissance that actually earns a reply.",
    quirkTwist:
      "Reply rates feed back as run scores, so the agent learns which openers get answered and which get blocked.",
  },
  {
    n: 13,
    category: "Creator Forge",
    name: "Product Description Pusher",
    origin: "Product descriptions: ChatGPT writes converting descriptions.",
    reforged:
      "Writes descriptions that sound like a friend who owns the thing hyping it up, not a catalog written by HR.",
    futureForward:
      "Catalog copy becomes per-shopper — the same product pitched differently to a skeptic versus an impulse buyer.",
    quirkTwist:
      "Variants are annotated with persona-fit so you know which copy seduces which buyer archetype.",
  },
  {
    n: 14,
    category: "Creator Forge",
    name: "Influencer Bait",
    origin: "Influencer outreach: ChatGPT writes emails to land influencers.",
    reforged:
      "Scrapes a creator's actual obsessions and writes a pitch that proves you watched their stuff instead of mail-merging their name.",
    futureForward:
      "Partnership outreach becomes genuinely personalized at scale — the spreadsheet pitch dies for good.",
    quirkTwist:
      "Each creator becomes an asset with fit-scoring annotations, so you pitch the right people instead of all the people.",
  },
  {
    n: 15,
    category: "Creator Forge",
    name: "Podcast Pulverizer",
    origin: "Podcast summarization: ChatGPT summarizes podcasts into content.",
    reforged:
      "Eats a three-hour episode and shits out a thread, a newsletter, twelve clips, and the one quote that'll actually go viral.",
    futureForward:
      "One long recording becomes a week of multi-format content with zero human transcribing hell.",
    quirkTwist:
      "The episode is one asset; every derivative is a tracked spawn, so you can trace any clip back to the timestamp.",
  },
  {
    n: 16,
    category: "Creator Forge",
    name: "Course Forge",
    origin: "Online courses: ChatGPT helps build a better online course.",
    reforged:
      "Turns a messy brain-dump into a real curriculum, then watches where students rage-quit and rewrites that lesson.",
    futureForward:
      "Courses become living and self-healing — the worst module fixes itself based on drop-off.",
    quirkTwist:
      "Drop-off points are annotations on each lesson asset, so the course evolves from real student pain.",
  },
  {
    n: 17,
    category: "Creator Forge",
    name: "Newsletter Necromancer",
    origin: "Newsletter creation: ideate, outline, and structure a newsletter.",
    reforged:
      "Resurrects your dead newsletter by mining what your audience actually clicked and ruthlessly killing the segments nobody reads.",
    futureForward:
      "Editorial decisions move from ego to evidence — the agent knows which recurring bit is dead weight.",
    quirkTwist:
      "Every issue is an asset with engagement annotations, so the newsletter literally learns what to stop doing.",
  },
  {
    n: 18,
    category: "Creator Forge",
    name: "Cold Call Conjurer",
    origin: "Cold call scripts: ChatGPT writes better cold-call scripts.",
    reforged:
      "Branches the script live based on what the prospect says, whispering the next line into the rep's ear before the silence gets awkward.",
    futureForward:
      "Sales scripts go from static index cards to real-time conversational copilots.",
    quirkTwist:
      "Branches that close deals get promoted to winners; the dead-end paths get pruned from the pipeline.",
  },
  {
    n: 19,
    category: "Creator Forge",
    name: "Info-Product Printing Press",
    origin: "Info-products: ChatGPT helps a creator make more info-products.",
    reforged:
      "Takes one big idea and stamps out a tripwire, a mid-tier, and a flagship — a whole product ladder from a single afternoon.",
    futureForward:
      "Creators ship product suites at the speed they used to ship a single PDF.",
    quirkTwist:
      "Each tier is a versioned asset spawned from the same parent idea, so the ladder stays coherent.",
  },
  {
    n: 20,
    category: "Creator Forge",
    name: "Viral Plague Lab",
    origin: "AI-Powered Viral Content Tool: generate high-quality content.",
    reforged:
      "A lab that breeds a hundred mutations of a hook, infects a tiny test audience, and only lets the contagious ones out into the wild.",
    futureForward:
      "Virality becomes an experiment you run, not a lottery you pray to.",
    quirkTwist:
      "Hooks that spread get bred together; the contagion score is a real metric on every run.",
  },
  {
    n: 21,
    category: "Creator Forge",
    name: "Social Ops Overlord",
    origin: "AI-Powered Social Media Management Tool: manage and analyze.",
    reforged:
      "Runs every account like a war room — drafts, schedules, replies in your voice, and flags the comment that's about to become a PR fire.",
    futureForward:
      "Social management becomes one autonomous operator instead of six tabs and a burnt-out intern.",
    quirkTwist:
      "The whole thing runs as a pipeline with a human approval step, so nothing unhinged posts itself.",
  },
  {
    n: 22,
    category: "Creator Forge",
    name: "Doc Rot Killer",
    origin: "Technical documentation: get tech docs done in seconds.",
    reforged:
      "Watches the codebase and rewrites the docs the moment they go stale, instead of letting them rot into beautiful lies.",
    futureForward:
      "Docs stop being a one-time chore and become a living mirror of the actual code.",
    quirkTwist:
      "Each doc is an asset diffed against the code; drift triggers a pipeline run to patch it.",
  },
  {
    n: 23,
    category: "Creator Forge",
    name: "FAQ Oracle",
    origin: "FAQ generator: generate FAQs for startups in seconds.",
    reforged:
      "Mines real support tickets and the angry tweets to build an FAQ that answers what people actually ask, not what marketing wishes they'd ask.",
    futureForward:
      "FAQs get generated from genuine confusion signals instead of guesswork.",
    quirkTwist:
      "Recurring questions are clustered as annotations, so the FAQ grows straight out of real pain.",
  },

  // ----- Pixel Cult ------------------------------------------------------
  {
    n: 24,
    category: "Pixel Cult",
    name: "Prompt-to-Mockup Pimp",
    origin: "Design services: ChatGPT prompts then Midjourney for designs.",
    reforged:
      "Skip the prompt-fiddling hell. Describe the vibe in plain trash-talk and it returns a full mood board plus three production-ready directions.",
    futureForward:
      "Design ideation collapses from a week of back-and-forth to a single conversation.",
    quirkTwist:
      "Each direction is a version of one design asset, so picking a winner is a click, not a new brief.",
  },
  {
    n: 25,
    category: "Pixel Cult",
    name: "Etsy Art Sweatshop",
    origin: "Sell AI Art: make Midjourney art and sell it on Etsy.",
    reforged:
      "An agent that watches what's selling, generates collections in that lane, and auto-lists them while you sleep — a print farm with taste.",
    futureForward:
      "Print-on-demand becomes a trend-reactive machine instead of manual guesswork.",
    quirkTwist:
      "Sales data scores each collection as a run, so the farm breeds more of what actually moves.",
  },
  {
    n: 26,
    category: "Pixel Cult",
    name: "Product Glamour Bot",
    origin: "Product photography: Mokker-style background generation.",
    reforged:
      "Drop a shitty phone photo of your product and get a full campaign shoot — beach, studio, neon alley — without renting a damn thing.",
    futureForward:
      "Product photography becomes infinite and free; the physical studio becomes a luxury, not a requirement.",
    quirkTwist:
      "Every scene is a spawned version of the source shot, so brand consistency is enforced across the set.",
  },
  {
    n: 27,
    category: "Pixel Cult",
    name: "Logo Slot Machine",
    origin: "Logo Design: MakeLogo-style AI logo generation.",
    reforged:
      "Pull the lever and get fifty logos, then tell it which three didn't make you gag and watch it evolve those into something real.",
    futureForward:
      "Branding goes iterative and conversational instead of a six-week agency death march.",
    quirkTwist:
      "Each pull is a generation run; your gut reactions are ratings that steer the next batch.",
  },
  {
    n: 28,
    category: "Pixel Cult",
    name: "Meme Cannon",
    origin: "Meme marketing: Supermeme-style meme generation for brands.",
    reforged:
      "Loads your brand into a cannon and fires memes in whatever format is hot today, with just enough self-awareness to not be cringe.",
    futureForward:
      "Brands ride meme formats in real time instead of arriving three weeks late and embarrassing.",
    quirkTwist:
      "Trending formats are captured as assets the second they spike, so the cannon is always loaded with fresh ammo.",
  },
  {
    n: 29,
    category: "Pixel Cult",
    name: "Bedtime Story Forge",
    origin: "Children's Books: ChatGPT + Midjourney short children's books.",
    reforged:
      "Type your kid's name and their fear of the dark, get a fully illustrated book where they're the hero who beats it — printed and on the doorstep.",
    futureForward:
      "Every child becomes the protagonist of bespoke stories, mass-personalization for bedtime.",
    quirkTwist:
      "Story and art are one linked asset bundle, versioned so 'make the dragon nicer' is one edit, not a reprint.",
  },
  {
    n: 30,
    category: "Pixel Cult",
    name: "Cover Art Conjurer",
    origin: "E-book cover: Midjourney covers edited in Canva.",
    reforged:
      "Reads the actual manuscript, nails the genre's visual language, and hands authors a cover that won't get them laughed off Amazon.",
    futureForward:
      "Cover design becomes content-aware instead of a stock-photo crapshoot.",
    quirkTwist:
      "The cover is generated from annotations on the book asset, so the art matches the story, not a vibe.",
  },
  {
    n: 31,
    category: "Pixel Cult",
    name: "Banner Blitz",
    origin: "Social Media Banner Creator: Midjourney converting banners.",
    reforged:
      "One brand kit in, perfectly-sized banners out for every platform that keeps changing its damn dimensions every quarter.",
    futureForward:
      "Resizing hell dies; one source of truth reflows to wherever the platforms move the goalposts.",
    quirkTwist:
      "Every platform crop is a version of one master asset, so a brand tweak propagates everywhere at once.",
  },
  {
    n: 32,
    category: "Pixel Cult",
    name: "Face Forge",
    origin: "Profile Picture: realistic AI avatar profile pictures.",
    reforged:
      "Upload ten ugly selfies, get a profile pic that makes you look like you have your shit together — in any style from corporate to cyberpunk.",
    futureForward:
      "Your digital face becomes a tunable asset you regenerate for the room you're walking into.",
    quirkTwist:
      "Each look is a mask on your base persona, so your LinkedIn and your Discord faces share one identity.",
  },
  {
    n: 33,
    category: "Pixel Cult",
    name: "Greeting Card Goblin",
    origin: "Greeting cards: Canva + ChatGPT + Midjourney cards.",
    reforged:
      "Knows the recipient, the occasion, and the inside joke, then makes a card so personal it's borderline invasive — in a good way.",
    futureForward:
      "Mass-produced sentiment dies; every card becomes a one-off built from real relationship context.",
    quirkTwist:
      "Recipient context lives as annotations, so next year's card remembers last year's joke.",
  },
  {
    n: 34,
    category: "Pixel Cult",
    name: "Blog Hero Machine",
    origin: "Blog post cover image: Midjourney engaging post images.",
    reforged:
      "Reads the post and generates a header image that actually matches the argument, not another smiling-stock-handshake atrocity.",
    futureForward:
      "Editorial imagery becomes semantically tied to the writing instead of decorative filler.",
    quirkTwist:
      "The image is spawned from the article asset, so re-running it after an edit keeps art and words in sync.",
  },
  {
    n: 35,
    category: "Pixel Cult",
    name: "Thumbnail Thirst Trap",
    origin: "YouTube Thumbnails: Canva + Midjourney thumbnails.",
    reforged:
      "Generates thumbnails engineered for the dopamine hit, then predicts click-through before you ever publish so you don't waste a banger.",
    futureForward:
      "Thumbnail testing moves pre-publish — you stop gambling your best videos on bad art.",
    quirkTwist:
      "Predicted CTR is a score on each thumbnail run, so the winner is picked by data, not vibes.",
  },
  {
    n: 36,
    category: "Pixel Cult",
    name: "Wearable You",
    origin: "T-shirt Avatar: put people's AI avatars on a t-shirt.",
    reforged:
      "Turns your avatar into a whole merch drop — shirts, hoodies, the works — and only prints what people actually order.",
    futureForward:
      "Personal merch becomes zero-inventory and instant; everyone's their own brand.",
    quirkTwist:
      "The avatar is one persona reused across every product, so the whole drop looks like a real line.",
  },
  {
    n: 37,
    category: "Pixel Cult",
    name: "Pocket Doppelganger",
    origin: "Phone case Avatar: put AI avatars on a phone case.",
    reforged:
      "Your face, your pet, your worst enemy — rendered into a case design and shipped, no design skills and no shame required.",
    futureForward:
      "Physical-goods personalization becomes a thirty-second conversation instead of a design job.",
    quirkTwist:
      "Designs spawn from the same avatar asset as your other merch, so your stuff matches your stuff.",
  },
  {
    n: 38,
    category: "Pixel Cult",
    name: "Room Raider",
    origin: "AI-Powered Virtual Interior Designer: design and visualize rooms.",
    reforged:
      "Snap your sad living room, describe the dream, and watch it redesigned photo-real — with a shoppable list of every piece in the render.",
    futureForward:
      "Interior design becomes try-before-you-buy for your actual space, not a Pinterest fantasy.",
    quirkTwist:
      "Each redesign is a version of your room asset, so you can diff 'cozy' against 'minimalist' side by side.",
  },
  {
    n: 39,
    category: "Pixel Cult",
    name: "Booth of Babel",
    origin: "Photo Booth: a virtual photo booth tool.",
    reforged:
      "A virtual booth that drops you into any era, planet, or genre — a wedding party becomes a Renaissance painting in one tap.",
    futureForward:
      "Event photography becomes a generative playground, not a guy with a backdrop and a prop box.",
    quirkTwist:
      "Every transformation is a run with a swappable style mask, so one photo yields a dozen worlds.",
  },
  {
    n: 40,
    category: "Pixel Cult",
    name: "Data Dripped in Ink",
    origin: "Infographics: AI tool for infographics and data viz.",
    reforged:
      "Paste a boring-ass spreadsheet and get an infographic that doesn't look like it was made in 2009 PowerPoint — chooses the right chart so you don't lie with bad axes.",
    futureForward:
      "Data storytelling becomes automatic and honest; everyone gets a designer's eye for free.",
    quirkTwist:
      "The dataset is an asset; the visual is a spawned version, so refreshing the numbers re-draws the chart.",
  },
  {
    n: 41,
    category: "Pixel Cult",
    name: "Loop Lord",
    origin: "GIF Creation: a tool to create AI-powered GIFs.",
    reforged:
      "Describe a reaction and get a clean looping GIF in your brand's style — your own private reaction-meme factory.",
    futureForward:
      "Brands and creators get bespoke motion vocabularies instead of recycling the same tired Office clips.",
    quirkTwist:
      "Each loop is an asset tagged by emotion, so your GIF library becomes searchable by mood.",
  },
  {
    n: 42,
    category: "Pixel Cult",
    name: "Cover-as-a-Service",
    origin: "E-book cover creator: make ebook covers from a prompt.",
    reforged:
      "An API that any publishing platform can call to mint a cover on upload — covers become infrastructure, not a freelancer gig.",
    futureForward:
      "Cover generation becomes a utility baked into every writing tool, invisible and instant.",
    quirkTwist:
      "Generated covers flow straight into the asset registry with full version history per title.",
  },
  {
    n: 43,
    category: "Pixel Cult",
    name: "Toon You",
    origin: "Cartoon character: create AI-powered cartoon characters.",
    reforged:
      "Turns a person or a brand mascot into a full cartoon character with a consistent face across a hundred poses and expressions.",
    futureForward:
      "Character consistency — the thing that breaks every image model — becomes the whole point.",
    quirkTwist:
      "The character is a locked persona; every pose is a mask on it, so the face never drifts.",
  },
  {
    n: 44,
    category: "Pixel Cult",
    name: "Emoji Effigy",
    origin: "Emoji Avatar: AI-powered emoji avatar creator.",
    reforged:
      "Builds a full custom emoji pack of your face doing every emotion, ready for Slack, Discord, and your group chat's chaos.",
    futureForward:
      "Personal emoji sets become standard self-expression, like a signature.",
    quirkTwist:
      "The pack is one asset bundle keyed to your persona, so it stays on-brand across every platform.",
  },
  {
    n: 45,
    category: "Pixel Cult",
    name: "Sticker Sweatshop",
    origin: "Laptop stickers: create stickers from your AI avatars.",
    reforged:
      "Spins your avatar into a die-cut sticker sheet and ships it — your laptop becomes a billboard for the character you invented.",
    futureForward:
      "Physical self-expression becomes one-click; everyone prints their own identity.",
    quirkTwist:
      "Sticker designs spawn from the same avatar persona as your merch and emoji, one identity everywhere.",
  },

  // ----- Aggregator Pit --------------------------------------------------
  {
    n: 46,
    category: "Aggregator Pit",
    name: "Tool Graveyard",
    origin: "AI tools Aggregator: an aggregator platform of all AI tools.",
    reforged:
      "Not another dead directory — an agent that knows your stack and tells you which shiny new tool actually fits versus which is hype garbage.",
    futureForward:
      "Tool discovery becomes recommendation by fit, not an SEO-spam list nobody trusts.",
    quirkTwist:
      "Each tool is an asset annotated with real fit scores against your workflow, not paid placement.",
  },
  {
    n: 47,
    category: "Aggregator Pit",
    name: "Art Stash",
    origin: "AI art aggregators: a platform for AI art resources.",
    reforged:
      "A vault of styles, LoRAs, and prompt recipes that you can remix, with provenance so you know what the hell you're actually building on.",
    futureForward:
      "Creative resources become composable and traceable instead of scattered across sketchy Discords.",
    quirkTwist:
      "Every resource is a versioned asset, so remixing keeps a clean lineage back to the source.",
  },
  {
    n: 48,
    category: "Aggregator Pit",
    name: "Prompt Vault",
    origin: "Prompts aggregator: an aggregator of 1000+ ChatGPT prompts.",
    reforged:
      "A living prompt library that tracks which prompts actually still work after the model changes under your feet, and retires the dead ones.",
    futureForward:
      "Prompt libraries become tested and version-aware instead of a graveyard of stale screenshots.",
    quirkTwist:
      "Each prompt is an asset with run history, so you see its hit rate before you trust it.",
  },
  {
    n: 49,
    category: "Aggregator Pit",
    name: "Prompt Alchemist",
    origin: "Prompt generator: generate the best Midjourney/SD prompts.",
    reforged:
      "You describe the half-baked image in your head; it interrogates you like a bartender at 2am and hands back a prompt that actually nails it.",
    futureForward:
      "Prompt engineering becomes a conversation, not a dark art you grind for months.",
    quirkTwist:
      "Generated prompts are saved as assets and scored by the images they produced, so good ones rise.",
  },
  {
    n: 50,
    category: "Aggregator Pit",
    name: "Signal Curator",
    origin: "Curator: AI tool to curate the best resources on the internet.",
    reforged:
      "A taste-trained agent that reads your saves and bookmarks, then drags the genuinely good shit out of the firehose so you stop doomscrolling.",
    futureForward:
      "Curation becomes personal and adversarial to the algorithm instead of feeding you more outrage bait.",
    quirkTwist:
      "Your taste lives as a persona; everything it surfaces is captured and rated to sharpen the next pull.",
  },

  // ----- Fintech Quirk ---------------------------------------------------
  {
    n: 51,
    category: "Fintech Quirk",
    name: "Money Therapist",
    origin: "Financial Planning Tool: plan finances based on goals and risk.",
    reforged:
      "Less spreadsheet, more honest friend — it looks at your goals and your risk tolerance and tells you when your 'plan' is actually a fantasy.",
    futureForward:
      "Financial planning becomes a continuous conversation that adapts as your life detonates and rebuilds.",
    quirkTwist:
      "Each plan is a versioned asset, so you can diff the dream against last quarter's reality.",
  },
  {
    n: 52,
    category: "Fintech Quirk",
    name: "Fraud Bloodhound",
    origin: "Fraud Detection System: ML to detect fraudulent transactions.",
    reforged:
      "Sniffs the weird shit in transaction streams in real time and explains, in plain English, exactly why it thinks something stinks.",
    futureForward:
      "Fraud detection becomes explainable, so analysts trust the flag instead of fighting a black box.",
    quirkTwist:
      "Every flag is an annotation with a confidence score, building a case file instead of a silent alarm.",
  },
  {
    n: 53,
    category: "Fintech Quirk",
    name: "Pocket CFO",
    origin: "AI-Powered Personal Finance Assistant: manage and budget.",
    reforged:
      "A blunt little CFO in your pocket that catches the subscriptions you forgot, the fees you're bleeding, and the dumb 1am purchases.",
    futureForward:
      "Personal finance shifts from monthly guilt to real-time nudges that actually change behavior.",
    quirkTwist:
      "Spending patterns are annotated assets, so the advice is built on your actual mess, not averages.",
  },
  {
    n: 54,
    category: "Fintech Quirk",
    name: "Pre-Crime Ledger",
    origin: "Intelligent Fraud Prevention System: prevent fraud with AI.",
    reforged:
      "Stops fraud before the money moves by simulating the attacker's next play and slamming the door a step early.",
    futureForward:
      "Prevention beats detection — the loss never happens instead of getting reported after.",
    quirkTwist:
      "Attack simulations run as experiments, so defenses are battle-tested against mutated threats, not last year's playbook.",
  },
  {
    n: 55,
    category: "Fintech Quirk",
    name: "Degenerate's Advisor",
    origin: "AI-Powered Investment Advisor: advice and portfolio management.",
    reforged:
      "Gives you real portfolio guidance but also calls you out when you're about to YOLO your rent into a meme coin.",
    futureForward:
      "Investment advice becomes behavioral, intervening at the moment of the dumb decision, not after.",
    quirkTwist:
      "Risk warnings are logged as risk annotations, so your future self can review every reckless impulse.",
  },
  {
    n: 56,
    category: "Fintech Quirk",
    name: "Claims Lie Detector",
    origin: "Intelligent Fraud Detection Tool for Insurance.",
    reforged:
      "Reads a claim, cross-checks the story against itself, and quietly raises an eyebrow at the parts that don't add up.",
    futureForward:
      "Insurance fraud screening becomes narrative-aware instead of a brittle rules engine.",
    quirkTwist:
      "Inconsistencies surface as annotations with confidence, so investigators get a ranked stack, not noise.",
  },
  {
    n: 57,
    category: "Fintech Quirk",
    name: "Spend Confessional",
    origin: "Smart Personal Finance Tracker: track and analyze finances.",
    reforged:
      "A tracker that doesn't just log your spending — it narrates it back like a documentary so you actually feel the $400 of DoorDash.",
    futureForward:
      "Financial awareness becomes visceral storytelling, not a chart you ignore.",
    quirkTwist:
      "Monthly spend snapshots are versioned assets, so the diff between months hits like a gut punch.",
  },
  {
    n: 58,
    category: "Fintech Quirk",
    name: "Checkout Bouncer",
    origin: "AI-Powered Fraud Detection Tool for E-commerce.",
    reforged:
      "Stands at the digital checkout and lets real buyers breeze through while body-checking the bots and stolen cards.",
    futureForward:
      "Fraud screening stops punishing good customers with friction while still stopping the thieves.",
    quirkTwist:
      "Each checkout is a run with an outcome, so the bouncer learns your real customers and stops false-flagging them.",
  },

  // ----- Enterprise Brain ------------------------------------------------
  {
    n: 59,
    category: "Enterprise Brain",
    name: "Resume Shredder",
    origin: "Intelligent HR System: screen resumes, schedule, analyze.",
    reforged:
      "Reads for actual signal instead of keyword bingo, and shows its work so you can argue with it instead of trusting a silent reject.",
    futureForward:
      "Hiring screens become transparent and auditable, dragging bias into the light instead of burying it.",
    quirkTwist:
      "Every candidate score is an annotation with reasoning, so a rejected applicant isn't a black hole.",
  },
  {
    n: 60,
    category: "Enterprise Brain",
    name: "Support Hydra",
    origin: "AI Chatbot for Customer Service: 24/7 support chatbot.",
    reforged:
      "A support agent that actually reads your docs, admits when it doesn't know, and hands off to a human with the full context instead of 'please hold.'",
    futureForward:
      "Support bots stop being rage-inducing dead ends and become genuine first-line problem solvers.",
    quirkTwist:
      "Unanswerable questions become captured assets, so the gaps in your docs surface themselves.",
  },
  {
    n: 61,
    category: "Enterprise Brain",
    name: "Case Law Excavator",
    origin: "AI Legal Research Tool: research and analyze case data.",
    reforged:
      "Digs through case law and hands you the relevant precedents with the quotes pulled — and flags the ones that got overturned so you don't faceplant in court.",
    futureForward:
      "Legal research collapses from billable days to minutes, with citations you can actually verify.",
    quirkTwist:
      "Findings are annotated assets with confidence scores, so every claim traces to a real source.",
  },
  {
    n: 62,
    category: "Enterprise Brain",
    name: "Data Séance",
    origin: "Intelligent Data Analysis Tool: analyze and visualize datasets.",
    reforged:
      "Ask your data questions in plain language and it talks back — not just a chart, but the 'here's the weird thing you didn't think to ask about.'",
    futureForward:
      "Analytics becomes a conversation that volunteers insights instead of waiting for the perfect query.",
    quirkTwist:
      "Each analysis is a run; surprising findings get flagged as annotations for the team to chase.",
  },
  {
    n: 63,
    category: "Enterprise Brain",
    name: "Supply Chain Clairvoyant",
    origin: "Smart Supply Chain Management System: optimize and cut costs.",
    reforged:
      "Watches every link in the chain and screams about the disruption two weeks before it hits, with a re-route already drafted.",
    futureForward:
      "Supply chains get proactive instead of reactive — you dodge the iceberg instead of reporting the crash.",
    quirkTwist:
      "Disruption scenarios run as experiments, so the contingency plan is pre-tested, not improvised.",
  },
  {
    n: 64,
    category: "Enterprise Brain",
    name: "Attribution Exorcist",
    origin: "AI-Powered Marketing Analytics Tool: measure and optimize.",
    reforged:
      "Cuts through the attribution bullshit and tells you which channel actually drove the sale versus which one just took credit.",
    futureForward:
      "Marketing spend gets honest — budget follows real causality, not last-click vanity.",
    quirkTwist:
      "Channel performance is scored on runs, so the budget reallocation is evidence, not the loudest manager's hunch.",
  },
  {
    n: 65,
    category: "Enterprise Brain",
    name: "BI Soothsayer",
    origin: "Intelligent Business Intelligence Tool: insights and recs.",
    reforged:
      "Doesn't wait for you to open the dashboard — it pings you when a number does something weird and tells you what it probably means.",
    futureForward:
      "BI shifts from pull to push; insights find you before the quarter's already on fire.",
    quirkTwist:
      "Anomalies become annotated assets with a recommended action, so the alert comes with a plan.",
  },
  {
    n: 66,
    category: "Enterprise Brain",
    name: "Voice-to-Action",
    origin: "AI-Powered Speech Recognition Tool: speech-to-text and voice UI.",
    reforged:
      "Doesn't just transcribe — it understands intent and fires the actual task, so 'remind me to email Dana' books itself.",
    futureForward:
      "Voice moves from dictation to a true command layer over your whole stack.",
    quirkTwist:
      "Each utterance becomes an asset routed into a pipeline, so speech turns into traceable, undoable actions.",
  },
  {
    n: 67,
    category: "Enterprise Brain",
    name: "Shelf Spy",
    origin: "Smart Retail Analytics Tool: optimize sales and inventory.",
    reforged:
      "Tells you not just what sold, but why the thing next to it didn't — the placement, the price, the psychology of the aisle.",
    futureForward:
      "Retail analytics explains causes, not just counts, so merchandising gets a brain.",
    quirkTwist:
      "Layout experiments run as runs with sales outcomes, so the planogram evolves on evidence.",
  },
  {
    n: 68,
    category: "Enterprise Brain",
    name: "Want Engine",
    origin: "AI-Powered Recommendation Engine: recommend by behavior.",
    reforged:
      "Recommends the thing you didn't know you wanted instead of five more of what you just bought, because nobody needs a sixth toaster.",
    futureForward:
      "Recommendations break out of the bland 'similar items' rut into genuine discovery.",
    quirkTwist:
      "Recommendation strategies are experiments; serendipity gets a real score versus boring safe picks.",
  },
  {
    n: 69,
    category: "Enterprise Brain",
    name: "Relationship Mind-Reader",
    origin: "Intelligent CRM Tool: insights for satisfaction and loyalty.",
    reforged:
      "Reads the tone of every customer touchpoint and warns you which 'happy' account is actually about to churn and ghost you.",
    futureForward:
      "CRM becomes emotionally aware, catching the silent dissatisfaction before the cancellation email.",
    quirkTwist:
      "Sentiment shifts are tracked as annotations over time, so you see the relationship cooling in slow motion.",
  },
  {
    n: 70,
    category: "Enterprise Brain",
    name: "Stock Whisperer",
    origin: "Smart Inventory Management System: optimize stock, cut waste.",
    reforged:
      "Predicts demand down to the SKU and reorders before you stock out — and tells you which dead inventory to dump before it rots.",
    futureForward:
      "Inventory becomes self-balancing, killing both stockouts and the warehouse full of mistakes.",
    quirkTwist:
      "Demand forecasts run as experiments scored against reality, so the model earns its trust over time.",
  },
  {
    n: 71,
    category: "Enterprise Brain",
    name: "Contract Landmine Sweeper",
    origin: "AI-Powered Legal Document Review Tool: highlight key issues.",
    reforged:
      "Reads the contract like a paranoid lawyer who's been burned before and highlights the clause that's going to screw you on page nine.",
    futureForward:
      "Document review becomes instant risk triage instead of a junior associate's all-nighter.",
    quirkTwist:
      "Risky clauses become risk annotations with severity, so the redline writes its own priority list.",
  },
  {
    n: 72,
    category: "Enterprise Brain",
    name: "Fine Print Inquisitor",
    origin: "AI-Powered Legal Contract Review Tool: identify issues.",
    reforged:
      "Compares the contract in front of you against your standard terms and screams about every sneaky deviation the other side slipped in.",
    futureForward:
      "Contract negotiation gets a tireless deviation-hunter, leveling the field against bigger legal teams.",
    quirkTwist:
      "Deviations are diffs against your template asset, so 'what changed' is computed, not eyeballed.",
  },
  {
    n: 73,
    category: "Enterprise Brain",
    name: "Campaign Autopilot",
    origin: "Intelligent Marketing Automation Tool: automate campaigns.",
    reforged:
      "Doesn't just send on a schedule — it watches behavior and re-sequences the journey live, so the flow adapts to each person's actual moves.",
    futureForward:
      "Marketing automation becomes genuinely adaptive instead of a dumb if-this-then-that drip.",
    quirkTwist:
      "Each journey is a pipeline; branches get scored, so the funnel rewires itself toward what converts.",
  },
  {
    n: 74,
    category: "Enterprise Brain",
    name: "Asset Wrangler",
    origin: "AI-Powered Digital Asset Management Tool: organize with vision.",
    reforged:
      "Looks at every file you've got and actually understands it — find 'that photo with the red couch and the dog' without a single tag.",
    futureForward:
      "DAM stops depending on humans tagging things and becomes search by meaning.",
    quirkTwist:
      "Every asset gets auto-embedded, so semantic search across your whole library is native, not bolted on.",
  },
  {
    n: 75,
    category: "Enterprise Brain",
    name: "Resume Glow-Up",
    origin: "AI-Powered Resume Builder: build resumes from skills.",
    reforged:
      "Rewrites your resume for the specific job, surfaces the wins you forgot you had, and cuts the corporate fluff that makes recruiters' eyes glaze.",
    futureForward:
      "Resumes become dynamically tailored per application instead of one stale PDF for everything.",
    quirkTwist:
      "Each tailored version is a spawn of your master profile asset, so your history stays the single source.",
  },
  {
    n: 76,
    category: "Enterprise Brain",
    name: "Support Autopsy",
    origin: "Intelligent Customer Service Analytics Tool: improve CSAT.",
    reforged:
      "Performs an autopsy on every support conversation and tells you which agent behaviors heal the customer versus which ones light the fuse.",
    futureForward:
      "Support coaching becomes data-driven, surfacing the exact phrasings that save or sink a ticket.",
    quirkTwist:
      "Conversations are scored runs; the patterns behind great outcomes get promoted into the playbook.",
  },
  {
    n: 77,
    category: "Enterprise Brain",
    name: "Rack Prophet",
    origin: "AI-Powered Fashion Retail Analytics Tool: optimize fashion sales.",
    reforged:
      "Reads runway trends, social signals, and your own sell-through to call which styles to chase and which to mark down before they die.",
    futureForward:
      "Fashion buying becomes trend-anticipatory instead of a buyer's gut and a prayer.",
    quirkTwist:
      "Trend bets run as experiments scored on sell-through, so taste finally gets a track record.",
  },
  {
    n: 78,
    category: "Enterprise Brain",
    name: "Chain Oracle",
    origin: "Intelligent Supply Chain Analytics Tool: optimize and cut cost.",
    reforged:
      "Models your whole chain as a living system and shows you the single bottleneck that, if you fixed it, would unclog everything downstream.",
    futureForward:
      "Supply chain optimization gets surgical — one high-leverage fix instead of a hundred tiny ones.",
    quirkTwist:
      "Bottleneck fixes run as experiments, so you simulate the ripple before you spend a dollar.",
  },

  // ----- Civic & Infra ---------------------------------------------------
  {
    n: 79,
    category: "Civic & Infra",
    name: "Threat Mongoose",
    origin: "AI-Powered Cybersecurity System: detect and respond to threats.",
    reforged:
      "Hunts the attacker inside your network like a pissed-off mongoose, isolating the breach and explaining the kill chain in human words.",
    futureForward:
      "Security response goes from forensic post-mortem to real-time containment with a readable story.",
    quirkTwist:
      "Each incident is a run with a documented response, building a battle-tested playbook from real fights.",
  },
  {
    n: 80,
    category: "Civic & Infra",
    name: "Traffic Conductor",
    origin: "Intelligent Transportation System: optimize flow and safety.",
    reforged:
      "Treats a city's lights like an orchestra and conducts them in real time so you stop sitting at a red light next to an empty cross-street like an idiot.",
    futureForward:
      "Traffic becomes a continuously optimized flow instead of dumb fixed timers from 1985.",
    quirkTwist:
      "Signal-timing strategies run as experiments scored on real flow, so the city learns its own rhythm.",
  },
  {
    n: 81,
    category: "Civic & Infra",
    name: "Grid Whisperer",
    origin: "Intelligent Energy Management System: cut cost and carbon.",
    reforged:
      "Watches every watt and quietly shifts loads to when power is cheap and clean, trimming the bill and the carbon without you lifting a finger.",
    futureForward:
      "Energy management becomes autonomous and carbon-aware, optimizing for the planet and the wallet at once.",
    quirkTwist:
      "Load-shifting strategies run as experiments scored on cost and carbon, so the savings are measured, not promised.",
  },
  {
    n: 82,
    category: "Civic & Infra",
    name: "Spot Finder",
    origin: "Smart Parking System: optimize parking, reduce traffic.",
    reforged:
      "Knows where the open spots are before you circle the block six times, and routes you straight there — the rage of urban parking, gone.",
    futureForward:
      "Parking becomes a solved, guided experience instead of a daily blood-pressure spike.",
    quirkTwist:
      "Live occupancy is captured as assets, so the routing learns each lot's rhythm by hour and day.",
  },
  {
    n: 83,
    category: "Civic & Infra",
    name: "Eye in the Sky",
    origin: "Intelligent Video Analytics Tool: detect crime, improve safety.",
    reforged:
      "Watches public-space video for genuine danger — a fall, a fight, a fire — and flags it to humans without becoming a creepy surveillance panopticon.",
    futureForward:
      "Safety monitoring focuses on events that matter, with privacy guardrails baked in from the start.",
    quirkTwist:
      "Every alert carries a confidence annotation and a human-review step, so nothing acts on a hunch.",
  },
  {
    n: 84,
    category: "Civic & Infra",
    name: "Content Bouncer",
    origin: "AI-Powered Content Moderation Tool: moderate UGC.",
    reforged:
      "Catches the truly vile stuff fast while understanding context, so satire and reclaimed slurs don't get nuked alongside actual hate.",
    futureForward:
      "Moderation gets nuance, escaping the brittle keyword bans that punish the wrong people.",
    quirkTwist:
      "Edge cases become annotated assets routed to human review, so the gray zone trains the system instead of breaking it.",
  },
  {
    n: 85,
    category: "Civic & Infra",
    name: "Trash Prophet",
    origin: "Smart Waste Management System: optimize collection with sensors.",
    reforged:
      "Predicts which bins are about to overflow and routes the trucks only where they're needed, so you stop burning diesel to empty half-full cans.",
    futureForward:
      "Waste collection becomes demand-driven, slashing emissions and overflowing-bin complaints.",
    quirkTwist:
      "Fill-level sensor data streams in as assets, so routes are re-optimized as runs against real conditions.",
  },
  {
    n: 86,
    category: "Civic & Infra",
    name: "Crowd Shepherd",
    origin: "Smart Crowd Management System: optimize flow, improve safety.",
    reforged:
      "Reads crowd density at events and gently nudges flow before a bottleneck becomes a dangerous crush — the unsexy tech that saves lives.",
    futureForward:
      "Crowd safety shifts from reactive crowd-control to predictive flow management.",
    quirkTwist:
      "Density patterns are captured and scored, so each event's plan is tested against the last one's near-misses.",
  },

  // ----- Mind & Body -----------------------------------------------------
  {
    n: 87,
    category: "Mind & Body",
    name: "Macro Mystic",
    origin: "Personalized Nutrition Plan Generator: plans from health data.",
    reforged:
      "Builds a nutrition plan around your actual life — your gut data, your hatred of kale, your 11pm cravings — not a generic meal-prep fantasy.",
    futureForward:
      "Nutrition becomes truly personalized and behavioral, designed for the human you are, not the one you pretend to be.",
    quirkTwist:
      "Plans adapt as versioned assets, so the diff shows what actually moved your energy and what was bullshit.",
  },
  {
    n: 88,
    category: "Mind & Body",
    name: "Babel Earbud",
    origin: "AI-Powered Language Translation Tool: real-time translation.",
    reforged:
      "Real-time translation that keeps the speaker's tone and slang intact, so a joke lands as a joke instead of a flat literal corpse.",
    futureForward:
      "Translation preserves voice and intent, not just words — the language barrier basically dissolves.",
    quirkTwist:
      "Each speaker's style is a persona, so translations carry their personality across the language gap.",
  },
  {
    n: 89,
    category: "Mind & Body",
    name: "Tutor Daemon",
    origin: "AI-Powered Personalized Education Platform: tailored learning.",
    reforged:
      "Figures out how your specific brain learns, then reteaches the thing you're stuck on five different ways until one finally clicks.",
    futureForward:
      "Education becomes truly adaptive, meeting each learner where they actually are instead of a fixed pace.",
    quirkTwist:
      "Confusion points become annotations, so the tutor builds a map of your gaps and hammers them.",
  },
  {
    n: 90,
    category: "Mind & Body",
    name: "Symptom Sherpa",
    origin: "AI-Powered Healthcare Chatbot: appointments, records, advice.",
    reforged:
      "Helps you describe what's actually wrong, books the right appointment, and preps a clean summary for the doctor so you don't fumble in the room.",
    futureForward:
      "Healthcare navigation gets a guide, cutting the chaos between feeling sick and getting seen.",
    quirkTwist:
      "Your symptom history is a versioned asset, so the doctor gets a timeline instead of a panicked guess.",
  },
  {
    n: 91,
    category: "Mind & Body",
    name: "3am Companion",
    origin: "Intelligent Chatbot for Mental Health: support and resources.",
    reforged:
      "A grounding presence for the 3am spirals — not a fake therapist, but a calm voice that helps you breathe and knows when to push you toward a real human.",
    futureForward:
      "Mental-health support becomes available in the exact moment of need, with clear handoff to professionals.",
    quirkTwist:
      "Crisis signals trigger a hard escalation step in the pipeline, so safety routing is non-negotiable.",
  },
  {
    n: 92,
    category: "Mind & Body",
    name: "Tongue Trainer",
    origin: "Intelligent Language Learning Tool: personalized learning.",
    reforged:
      "Drops you into messy, real conversations from day one and corrects you mid-sentence like a patient friend, not a flashcard grind.",
    futureForward:
      "Language learning becomes immersive and conversational from the start, ditching the rote-memorization slog.",
    quirkTwist:
      "Your recurring mistakes become annotations, so drills target your specific weak spots instead of generic lessons.",
  },

  // ----- Daily Life ------------------------------------------------------
  {
    n: 93,
    category: "Daily Life",
    name: "Deal Hound",
    origin: "Smart Personal Shopping Assistant: best deals from preferences.",
    reforged:
      "Knows your taste and your budget, hunts the actual best price across the web, and tells you to wait when the thing's about to go on sale.",
    futureForward:
      "Shopping becomes an agent that works for you instead of a feed engineered to drain your wallet.",
    quirkTwist:
      "Your preferences live as a persona, so recommendations are yours — not whatever has the fattest affiliate cut.",
  },
  {
    n: 94,
    category: "Daily Life",
    name: "Life Chief of Staff",
    origin:
      "Intelligent Virtual Personal Assistant: manage tasks and schedule.",
    reforged:
      "Runs your calendar like a ruthless chief of staff — defends your focus time, says no to the dumb meetings, and preps you before each one.",
    futureForward:
      "The personal assistant becomes proactive and protective instead of a glorified to-do list.",
    quirkTwist:
      "Your priorities live as a persona, so it makes the calls you'd make instead of asking about everything.",
  },
  {
    n: 95,
    category: "Daily Life",
    name: "Trip Architect",
    origin: "Smart Personalized Travel Planner: itineraries from preferences.",
    reforged:
      "Plans the trip around how you actually travel — slow mornings, no tourist traps, one good meal a day — and re-routes live when the flight gets delayed.",
    futureForward:
      "Travel planning becomes deeply personal and resilient, adapting in real time instead of falling apart at the first hiccup.",
    quirkTwist:
      "Each itinerary is a versioned asset, so re-planning around a canceled train is one run, not a meltdown.",
  },
  {
    n: 96,
    category: "Daily Life",
    name: "Closet Oracle",
    origin: "AI-Powered Personal Stylist: fashion by preference and body.",
    reforged:
      "Knows your real closet and your real body, builds outfits from what you already own, and only suggests buying when there's a genuine gap.",
    futureForward:
      "Personal styling becomes practical and waste-aware, fighting overconsumption instead of fueling it.",
    quirkTwist:
      "Your wardrobe is captured as assets, so outfit suggestions are grounded in what you actually have.",
  },
  {
    n: 97,
    category: "Daily Life",
    name: "Co-Pilot Co-Pilot",
    origin: "Intelligent Voice Assistant for Cars: hands-free control.",
    reforged:
      "A car assistant that actually understands 'find a coffee place that isn't garbage and is on my way' without forcing you through six robotic menus.",
    futureForward:
      "In-car AI becomes genuinely conversational and context-aware, not a frustrating voice-menu maze.",
    quirkTwist:
      "Your driving habits and preferences live as a persona, so it anticipates the detour you always take.",
  },
  {
    n: 98,
    category: "Daily Life",
    name: "Ear Reader",
    origin: "Intelligent Music Recommendation Tool: recommend by behavior.",
    reforged:
      "Reads your actual mood and moment — not just genre — and serves the song you didn't know you needed at 7am on a brutal Monday.",
    futureForward:
      "Music discovery becomes context-aware, soundtracking your life instead of looping the same forty tracks.",
    quirkTwist:
      "Your taste is a persona that mutates over time, so the recs grow with you instead of freezing in 2019.",
  },
  {
    n: 99,
    category: "Daily Life",
    name: "Event Ringmaster",
    origin: "Intelligent Virtual Event Planner: plan and organize events.",
    reforged:
      "Runs a virtual event end to end — agenda, invites, reminders, the awkward icebreaker — and adapts the run-of-show live when a speaker bails.",
    futureForward:
      "Event production becomes a single coordinated agent instead of a frazzled human juggling twelve tools.",
    quirkTwist:
      "The whole event runs as a pipeline with checkpoints, so a last-minute change is a re-run, not a panic.",
  },
  {
    n: 100,
    category: "Daily Life",
    name: "Podcast Surgeon",
    origin: "Podcast edits: edit podcasts without freelancers.",
    reforged:
      "Cuts the ums, the dead air, and the ten-minute tangent nobody needed, then masters the audio so you sound like you have a producer.",
    futureForward:
      "Audio post-production becomes one-click, freeing creators from the editing-cave grind.",
    quirkTwist:
      "Raw audio is the source asset; each edit is a version, so you can always roll back a too-aggressive cut.",
  },

  // ----- Wildcards (net-new) --------------------------------------------
  {
    n: 101,
    category: "Wildcards",
    name: "Dream Logger",
    origin: "net-new",
    reforged:
      "Mumble your dream into your phone while you're half-awake and it reconstructs the narrative, renders the imagery, and tracks the recurring weird shit over months.",
    futureForward:
      "Subjective inner experience becomes a queryable, visual dataset — a frontier nobody owns yet.",
    quirkTwist:
      "Each dream is an asset with an embedding, so 'show me every dream about drowning' is a real search.",
  },
  {
    n: 102,
    category: "Wildcards",
    name: "Legacy Persona",
    origin: "net-new",
    reforged:
      "Builds a respectful, consent-gated conversational model of a person from their writing and recordings, so families can hear a voice again — handled with serious ethical guardrails.",
    futureForward:
      "Digital legacy becomes a real category as voice and persona cloning matures and demands a code of ethics.",
    quirkTwist:
      "The persona is a locked, versioned asset with explicit consent annotations, so it can never be quietly repurposed.",
  },
  {
    n: 103,
    category: "Wildcards",
    name: "Negotiation Exoskeleton",
    origin: "net-new",
    reforged:
      "A live earpiece coach during a salary or deal call that reads the room, catches the lowball, and feeds you the line to hold your ground.",
    futureForward:
      "Real-time conversational coaching becomes the great equalizer for anyone who freezes under pressure.",
    quirkTwist:
      "Each negotiation is a run scored on outcome, so the coach learns which moves actually win you money.",
  },
  {
    n: 104,
    category: "Wildcards",
    name: "Reverse Influencer",
    origin: "net-new",
    reforged:
      "An autonomous persona that builds a real, engaged audience in a niche while you sleep, then hands you the keys once it's warm — faceless creator economy on autopilot.",
    futureForward:
      "Audience-building becomes a deployable agent, decoupling reach from the grind of personal posting.",
    quirkTwist:
      "The persona is a managed mask running on a content pipeline, with a human approval gate before anything ships.",
  },
  {
    n: 105,
    category: "Wildcards",
    name: "Argument Referee",
    origin: "net-new",
    reforged:
      "Settles the recurring couple-or-roommate fight by replaying who-actually-said-what from logged context, with zero emotional bias and infinite patience.",
    futureForward:
      "Shared memory becomes a neutral third party, defusing the 'that's not what you said' death spiral.",
    quirkTwist:
      "Agreed facts get captured as annotated assets, so the receipts exist before the fight even starts.",
  },
  {
    n: 106,
    category: "Wildcards",
    name: "Boredom Engine",
    origin: "net-new",
    reforged:
      "The anti-algorithm: deliberately feeds you brilliant weird shit from outside your bubble, engineered to surprise you instead of confirming what you already think.",
    futureForward:
      "As feeds collapse into homogenous slop, intentional serendipity becomes a premium product.",
    quirkTwist:
      "It builds an anti-persona — the inverse of your taste graph — and curates straight from the gap.",
  },
  {
    n: 107,
    category: "Wildcards",
    name: "Body Double Bot",
    origin: "net-new",
    reforged:
      "A co-working presence for the ADHD brain — it sits with you, breaks the task into bites, and quietly keeps you company so starting stops feeling impossible.",
    futureForward:
      "Focus-as-companionship becomes a recognized mental-health support tool, not just a productivity hack.",
    quirkTwist:
      "Each work session is a run with completion scoring, so it learns the conditions where you actually ship.",
  },
  {
    n: 108,
    category: "Wildcards",
    name: "Regret Simulator",
    origin: "net-new",
    reforged:
      "Before a big fork — the job, the move, the breakup — it models the realistic shape of each path so you decide with your eyes open instead of pure gut terror.",
    futureForward:
      "Personal decision-making gets a simulation layer, the way businesses already model scenarios.",
    quirkTwist:
      "Each path is an experiment with projected outcomes, so the choice is a documented bet you can revisit.",
  },
  {
    n: 109,
    category: "Wildcards",
    name: "Smell-to-Spec",
    origin: "net-new",
    reforged:
      "Describe a scent in pure vibes — 'rain on hot asphalt with a hint of my grandma's kitchen' — and it returns a real fragrance formula for the coming wave of scent hardware.",
    futureForward:
      "Olfactory design becomes a generative medium as digital-scent hardware finally arrives.",
    quirkTwist:
      "Each formula is a versioned asset, so 'make it 20% less sweet' is a diff, not starting from scratch.",
  },
  {
    n: 110,
    category: "Wildcards",
    name: "Local-Only Brain",
    origin: "net-new",
    reforged:
      "A fully on-device personal AI that never phones home — your whole life as context, paranoid-grade private, working even with the wifi ripped out.",
    futureForward:
      "As privacy backlash peaks, on-device AI with zero cloud leakage becomes the trust differentiator.",
    quirkTwist:
      "Every asset and embedding stays in a local registry, so the entire Quirk OS can run air-gapped.",
  },
  {
    n: 111,
    category: "Wildcards",
    name: "Quirk Itself",
    origin: "net-new",
    reforged:
      "The self-referential capstone: an agent that reads this entire list, critiques it, mutates the weak ones, and spawns idea number 112 — the machine that eats its own roadmap.",
    futureForward:
      "Product ideation itself becomes an autonomous, compounding loop instead of a one-off brainstorm.",
    quirkTwist:
      "This very list is the seed corpus; each idea is an asset, and the agent runs experiments to breed the next generation.",
  },
];

if (quirkIdeas.length !== 111) {
  throw new Error(
    `quirkIdeas must contain exactly 111 entries, found ${quirkIdeas.length}`,
  );
}
