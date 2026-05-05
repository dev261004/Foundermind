> ## Context — Read These Files First
>
> ```
> apps/agent/reporter.py
> apps/agent/tasks.py
> src/components/idea/IdeaAnalysisPage.tsx
> src/types/analysis.ts
> ```
>
> Read all files completely before touching anything. Understand the existing Reporter structure, how `generate_report()` is called, what it returns, and how `report_summary` is currently rendered in the frontend.
>
> ---
>
> ## Goal
>
> Change the Reporter agent from generating a generic Executive Summary to generating a structured **Founder Action Plan** — 4-6 concrete, cross-referenced, actionable steps synthesized from all analysis sections. Update the frontend to render it properly instead of using ReactMarkdown.
>
> ---
>
> ## Part 1 — Rewrite the Reporter LLM Prompt in `apps/agent/reporter.py`
>
> Keep the `generate_report()` function signature exactly the same. Only change the prompt and return shape.
>
> **New prompt requirements:**
>
> Tell the model it is a senior startup strategist who has just reviewed a complete AI analysis of a startup idea. Its job is to produce a prioritized action plan for the founder — not a summary of what was found, but a directive list of what to do next.
>
> Instruct it to return a JSON object with exactly this shape:
>
> ```
> {
>   "horizon": "string — one sentence describing the overall strategic moment this founder is in. Should reference the specific idea, market timing, or biggest risk. Never generic.",
>   "actions": [
>     {
>       "priority": integer 1-6, sequential
>       "title": "3-6 word action title",
>       "what": "One sentence — exactly what the founder should do",
>       "why": "One sentence — which specific finding from the analysis makes this urgent. Must reference a concrete data point, competitor name, score, or insight from the analysis — never vague reasoning",
>       "timeframe": "one of: This Week, This Month, Next 90 Days, Next 6 Months",
>       "category": "one of: Revenue, Defense, Growth, Product, Validation, Hiring"
>     }
>   ]
> }
> ```
>
> Rules to include in the prompt:
> - Return only valid JSON, no markdown, no code blocks, no prose outside the JSON
> - Generate exactly 4-6 actions — never fewer than 4, never more than 6
> - Actions must be ordered by urgency — most time-sensitive first
> - Every `why` field must reference something specific from the analysis data provided — a competitor name, a TAM figure, a threat label, a persona name, a funding signal, a SWOT point. Never write generic reasoning like "this is important for growth"
> - `horizon` must be specific to this idea — never a generic statement about startups
> - `timeframe` must be exactly one of the 4 valid values
> - `category` must be exactly one of the 6 valid values
> - If quota or model fails, the function must return a safe fallback — do not crash the pipeline
>
> **What context to pass to the prompt:**
>
> The reporter already receives `idea_text` and `results`. Extract and pass these specific fields as structured context — do not dump raw JSON:
> - SWOT critical insight label and detail
> - SWOT competitive position stance and score
> - SWOT top 2 threats (term + detail)
> - SWOT top 2 opportunities (term + detail)
> - Market Data opportunity score and CAGR
> - Customer Profile persona name
> - Top monetization strategy name and fit score
> - Comparable startups company names (just the names as a list)
> - Funding signals company names and amounts if present
>
> Build a compact context string from these fields before inserting into the prompt. This prevents the model from receiving thousands of tokens of raw nested JSON.
>
> **Return shape from `generate_report()`:**
>
> Change the return dict to include:
> - `action_plan` — the parsed and sanitized dict with `horizon` and `actions`
> - `model_used` — same as before
>
> Write a parse function that strips code fences, parses JSON safely, returns a safe fallback dict if parsing fails. The fallback must have `horizon` as empty string and `actions` as empty list — never crash.
>
> Write a sanitize function that:
> - Validates `timeframe` is one of the 4 valid values, defaults to `"This Month"` if not
> - Validates `category` is one of the 6 valid values, defaults to `"Growth"` if not
> - Clamps `priority` to 1-6
> - Limits `actions` to 6 items maximum
> - Truncates `what` and `why` to 300 chars each
>
> ---
>
> ## Part 2 — Update `apps/agent/tasks.py`
>
> Find where `reporter_result` is used. The reporter now returns `action_plan` instead of `summary`.
>
> Update `_upsert_analysis_snapshot` to save `action_plan` — find the `IdeaAnalysis` model and add `action_plan = DictField(default=dict)` field if it does not exist. Save `reporter_result["action_plan"]` to `analysis.action_plan`.
>
> Update `agent_run.report_summary` — since the old field stored a string summary, either repurpose it to store the `horizon` string only, or add a new `action_plan` field to `AgentRun`. Read `apps/agent/models.py` first and choose the least disruptive approach.
>
> The reporter log entry message should change to: `"Reporter generated the founder action plan."`
>
> ---
>
> ## Part 3 — Update `src/types/analysis.ts`
>
> Add these types without removing existing ones:
>
> ```typescript
> export type ActionTimeframe = "This Week" | "This Month" | "Next 90 Days" | "Next 6 Months"
> export type ActionCategory = "Revenue" | "Defense" | "Growth" | "Product" | "Validation" | "Hiring"
>
> export interface FounderAction {
>   priority: number
>   title: string
>   what: string
>   why: string
>   timeframe: ActionTimeframe
>   category: ActionCategory
> }
>
> export interface FounderActionPlan {
>   horizon: string
>   actions: FounderAction[]
> }
> ```
>
> Update `AgentAnalysisResponse` — add `action_plan: FounderActionPlan | null` to the results interface.
>
> ---
>
> ## Part 4 — Update Frontend in `IdeaAnalysisPage.tsx`
>
> Find the existing Executive Summary section that currently renders `result.report_summary` using `ReactMarkdown`. Replace it entirely with a new `FounderActionPlan` component.
>
> **Create `src/components/results/FounderActionPlan/index.tsx`**
>
> Props: `plan: FounderActionPlan`
>
> Layout:
>
> **Horizon strip** — full width strip at the top of the component. Dark background with a subtle left purple border accent. Shows `plan.horizon` as italic text in muted white. Label "STRATEGIC MOMENT" in 10px all-caps monospace muted purple above it. Hide entirely if `plan.horizon` is empty string.
>
> **Actions grid** — below the horizon strip. Renders `plan.actions` as a list of action rows. Each row:
>
> - Left: priority number (`01`, `02` etc) in large faded monospace, same pattern as Monetization Strategy cards
> - Left below number: `timeframe` as a small colored pill:
>   - "This Week" → red `#EF4444`
>   - "This Month" → amber `#F59E0B`
>   - "Next 90 Days" → cyan `#00D4FF`
>   - "Next 6 Months" → muted `#6B6880`
> - Center: `title` as bold 15px white heading, `what` as 13px muted text below, `why` as 12px italic even more muted below that with a `→` prefix
> - Right: `category` badge colored by type:
>   - Revenue → green
>   - Defense → red
>   - Growth → purple
>   - Product → blue
>   - Validation → amber
>   - Hiring → teal
>
> Thin `1px rgba(255,255,255,0.06)` divider between each action row.
>
> **Section header** — keep consistent with all other sections. Title: "Founder Action Plan". Subtitle: "Prioritized next steps synthesized across all analysis sections." Badge: "Actions" in purple. Collapse chevron top right.
>
> **Empty state** — if `action_plan` is null or `actions` is empty array, show a simple centered message: "Action plan could not be generated. Run a fresh analysis to generate recommendations." with a ghost retry button.
>
> **Wire up in `IdeaAnalysisPage.tsx`:**
>
> Replace the existing Executive Summary block that renders `result.report_summary` with:
> ```
> if result.action_plan and actions.length > 0 → render <FounderActionPlan plan={result.action_plan} />
> if null or empty → render empty state
> ```
>
> Remove the `ReactMarkdown` import if it is no longer used anywhere else after this change. Check before removing.
>
> ---
>
> ## Do NOT Change
>
> The reporter function signature, Celery task names, any other agent files, any other result components, MongoDB collection names, or `call_llm()`.
>
> ---
>
> ## Verification Checklist
>
> - [ ] `generate_report()` returns dict with `action_plan` key containing `horizon` and `actions`
> - [ ] `actions` array has 4-6 items — never fewer, never more
> - [ ] Every `why` field references a specific data point from the analysis — competitor name, score, or finding
> - [ ] `horizon` is idea-specific — references the actual idea, market, or threat by name
> - [ ] `timeframe` is always one of the 4 valid values
> - [ ] `category` is always one of the 6 valid values
> - [ ] Reporter LLM failure returns safe fallback — pipeline never crashes at reporter step
> - [ ] `action_plan` saved to `IdeaAnalysis` document in MongoDB
> - [ ] Frontend renders horizon strip only when `horizon` is non-empty
> - [ ] Timeframe pill colors correct — This Week=red, This Month=amber, Next 90 Days=cyan
> - [ ] Category badges color-coded correctly
> - [ ] Old `ReactMarkdown` Executive Summary block completely removed
> - [ ] `ReactMarkdown` import removed if no longer used elsewhere
> - [ ] No TypeScript errors across all modified files