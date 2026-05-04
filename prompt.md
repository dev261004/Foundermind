> ## Context — Read These Files First
>
> ```
> apps/ideas/models.py
> apps/agent/tasks.py
> apps/agent/models.py
> integrations/gemini_client.py
> foundermind_backend/settings/base.py
> src/components/idea/IdeaAnalysisPage.tsx
> src/store/useRunStore.ts
> src/types/analysis.ts
> ```
>
> Read all files completely before touching anything. Understand the existing idea submission flow, how `AgentRun` is created, and how the frontend polls for status before making any changes.
>
> ---
>
> ## Goal
>
> Add description quality validation, AI refinement, and user clarification flow to the idea analysis pipeline. When a description is too vague, stop the pipeline early and ask the user specific questions instead of running a full analysis on bad input.
>
> Implement in this exact order — settings first, then backend, then frontend.
>
> ---
>
> ## Part 1 — Add Settings Constants
>
> In `foundermind_backend/settings/base.py` add:
>
> ```python
> # Idea description limits
> IDEA_DESCRIPTION_MIN_CHARS = 150
> IDEA_DESCRIPTION_MAX_CHARS = 1000
> IDEA_DESCRIPTION_AI_MAX_CHARS = 800   # truncation limit before sending to AI tools
> IDEA_QUALITY_MIN_SCORE = 2            # minimum quality score to proceed with analysis
> ```
>
> ---
>
> ## Part 2 — Create `apps/agent/idea_quality.py`
>
> Create a new file. It must contain two functions: a quality checker and a description refiner.
>
> **Quality checker function:**
>
> Takes `title: str` and `description: str` as inputs. Returns a dict.
>
> Instruct the LLM to evaluate the combined idea text against exactly 4 criteria and return a JSON object:
>
> - `specificity` — 0 or 1. Does it mention a specific target customer, market segment, or geography? Generic words like "people" or "users" score 0. Specific words like "corporate offices", "solo founders", "hedge fund managers", "India" score 1.
> - `problem_clarity` — 0 or 1. Is there a clear problem being solved? Vague intent like "I want to sell X" scores 0. A described pain point or inefficiency scores 1.
> - `differentiation` — 0 or 1. Is there any hint of what makes this different or the business model? Words like "subscription", "AI-powered", "B2B", "marketplace", "automated" count. Completely generic descriptions score 0.
> - `sufficient_length` — 0 or 1. After mentally stripping filler words, are there at least 30 meaningful words of substance? Score 1 if yes, 0 if not.
>
> Also return:
> - `total_score` — integer 0-4, sum of the 4 signals
> - `missing_signals` — array of signal names that scored 0
> - `suggested_questions` — array of 1-3 specific questions to ask the user based on what is missing. Questions must be concrete and actionable, not generic. Examples:
>   - If specificity=0: "Who specifically will use this? (e.g. corporate offices, solo founders, students in urban areas)"
>   - If problem_clarity=0: "What problem does this solve today that isn't solved well by existing options?"
>   - If differentiation=0: "How does it make money, and what makes it different from existing solutions? (e.g. subscription, B2B contract, marketplace)"
>
> Tell the model: return only valid JSON, no markdown, no code blocks. Use `settings.AGENT_MODELS["tool_light"]` and `settings.AGENT_MODELS["fallback_gemma"]`. If the LLM call fails for any reason, return a safe default with `total_score: 2` so the pipeline does not block on a quality check error.
>
> **Description refiner function:**
>
> Takes `title: str` and `description: str` as inputs. Returns a refined description string.
>
> Instruct the LLM to rewrite the description into a single clear paragraph that:
> - Preserves all factual information from the original — never invent details
> - Fixes grammar and spelling
> - Makes the target customer, problem, and solution explicit
> - Removes filler and redundant phrases
> - Is between 100-200 words
> - Is written in third person business language
>
> Tell the model: return only the refined description paragraph, no explanation, no prefix like "Here is the refined description:", no markdown. Just the paragraph.
>
> If refinement fails, return the original description unchanged — never block the pipeline on a refiner failure.
>
> Use `settings.AGENT_MODELS["tool_light"]` and `settings.AGENT_MODELS["fallback_gemma"]`.
>
> ---
>
> ## Part 3 — Update `apps/agent/models.py`
>
> Add these fields to the `AgentRun` model:
>
> - `original_description` — StringField, stores the raw user-submitted description before refinement
> - `refined_description` — StringField, stores the AI-refined description that was actually used
> - `quality_score` — IntField, stores the 0-4 quality score
> - `quality_missing_signals` — ListField(StringField()), stores which signals were missing
> - `clarification_questions` — ListField(StringField()), stores the questions shown to the user
> - `clarification_answers` — DictField, stores the user's answers keyed by question index
> - `status` must now also accept `"awaiting_clarification"` as a valid value — add it to any status choices if they exist
>
> ---
>
> ## Part 4 — Update `apps/agent/tasks.py`
>
> **Change `idea_text` construction:**
>
> Replace:
> ```python
> idea_text = idea_obj.title
> ```
>
> With logic that:
> - Gets the title from `idea_obj.title`
> - Gets the description from `idea_obj` — check `apps/ideas/models.py` for the exact field name
> - Combines them: if description exists and is non-empty after stripping: `idea_text = f"{title}\n\n{description}"`
> - Truncates description to `settings.IDEA_DESCRIPTION_AI_MAX_CHARS` before combining
> - Stores the original description in `agent_run.original_description`
>
> **Add quality check as the very first step — before classification:**
>
> After building `idea_text`, run the quality checker:
>
> - If `quality_score < settings.IDEA_QUALITY_MIN_SCORE`:
>   - Save `quality_score`, `quality_missing_signals`, `clarification_questions` to `agent_run`
>   - Set `agent_run.status = "awaiting_clarification"`
>   - Save and return immediately with `{"status": "awaiting_clarification", "questions": suggested_questions}`
>   - Do NOT proceed to classification or any tool execution
>
> - If `quality_score >= settings.IDEA_QUALITY_MIN_SCORE`:
>   - Run the refiner function
>   - Store refined description in `agent_run.refined_description`
>   - Use the refined description as `idea_text` for all subsequent steps
>   - Log a single execution entry: `{"type": "idea_refinement", "status": "completed", "quality_score": score, "original_length": len(original), "refined_length": len(refined)}`
>   - Continue with classification as before
>
> ---
>
> ## Part 5 — Add Clarification API Endpoint
>
> Find the existing API views file for the agent app. Add a new endpoint:
>
> `POST /api/v1/agent/clarify/{run_id}/`
>
> Request body:
> ```json
> {
>   "answers": {
>     "0": "Corporate offices and mid-size companies in India",
>     "1": "Local tea vendors are unreliable and have no digital tracking"
>   }
> }
> ```
>
> The view must:
> - Fetch the `AgentRun` by `run_id`
> - Verify its status is `"awaiting_clarification"` — return 400 if not
> - Save answers to `agent_run.clarification_answers`
> - Build an enriched description by combining: original description + the questions and their answers as structured text
> - Store the enriched text as the new description on the `Idea` object
> - Re-queue `run_startup_analysis.delay(run_id)` — the task will now find a richer description
> - Set `agent_run.status = "running"` and save
> - Return `{"status": "running", "run_id": run_id}`
>
> ---
>
> ## Part 6 — Update `src/types/analysis.ts`
>
> Add `"awaiting_clarification"` to the run status union type wherever status is defined. Add a `ClarificationState` interface:
>
> ```typescript
> export interface ClarificationState {
>   questions: string[]
>   run_id: string
> }
> ```
>
> ---
>
> ## Part 7 — Update Frontend Status Handling
>
> **In `src/store/useRunStore.ts`:**
>
> The store already polls `/api/v1/agent/status/{run_id}/`. When the response status is `"awaiting_clarification"`, store the questions array in a new `clarificationQuestions: string[]` state field. Stop polling — no further polling needed until the user submits answers.
>
> Add a new action `submitClarification(runId: string, answers: Record<string, string>)` that:
> - Posts to `/api/v1/agent/clarify/{run_id}/`
> - On success sets status back to `"running"` and resumes polling
>
> **In `src/components/idea/IdeaAnalysisPage.tsx`:**
>
> Add a new render branch for `status === "awaiting_clarification"`:
>
> Show a centered clarification panel instead of the loading state. The panel must contain:
>
> - A heading: "Help us understand your idea better"
> - A subtitle: "Our AI needs a bit more context to generate a high-quality analysis. Answer one or more of these questions:"
> - The questions list — each question as a labeled textarea input. Questions come from `useRunStore`'s `clarificationQuestions` array.
> - A "Continue analysis →" button that calls `submitClarification()` with the filled answers
> - Answering all questions is not required — any non-empty answer helps
> - The button is disabled if all textareas are empty — at least one answer required
> - While submitting: show a loading spinner on the button, disable all inputs
> - After submission: transition directly to the existing `LoadingState` component — no separate confirmation screen needed
>
> Style it consistently with the existing `LoadingState` and `ErrorState` components — same container, same dark background, same font treatment.
>
> ---
>
> ## Part 8 — Add Character Limit to Idea Submission Form
>
> Find the idea submission form component. Read it before making changes.
>
> On the description textarea:
> - Add `minLength={150}` and `maxLength={1000}` HTML attributes
> - Add a live character counter below the textarea showing `{count}/1000`
> - Counter color: muted grey below 150 chars, normal below 600, amber at 600-800, red above 800
> - Show a hint message below the counter when under 150 chars: "Add more detail — describe the target customer and the problem being solved"
> - Prevent form submission if description is under 150 characters
>
> ---
>
> ## Do NOT Change
>
> The planner, critic, reporter, orchestrator, executor, any other tool files, any existing API endpoints, MongoDB collection names, or `call_llm()`.
>
> ---
>
> ## Verification Checklist
>
> - [ ] `apps/ideas/models.py` — confirm exact description field name before using it in tasks.py
> - [ ] Submit idea with title only and no description — quality check fires, status becomes `"awaiting_clarification"`, questions appear in frontend
> - [ ] Submit idea with vague 20-word description — same result
> - [ ] Submit idea with clear 200-word description — quality check passes, refinement runs, analysis proceeds normally
> - [ ] `agent_run.original_description` stores raw input, `agent_run.refined_description` stores AI output
> - [ ] Clarification form shows the specific questions from the API
> - [ ] Submitting at least one answer re-queues the analysis and transitions to loading state
> - [ ] Re-queued analysis uses the enriched description — tool outputs reference specific details
> - [ ] Description textarea blocks submission under 150 chars with hint message
> - [ ] Character counter shows correct color coding at each threshold
> - [ ] Quality check failure (LLM error) defaults to score 2 — pipeline proceeds, never blocks
> - [ ] Refiner failure returns original description — pipeline never blocks on refiner error
> - [ ] `"awaiting_clarification"` status stops polling correctly
> - [ ] No TypeScript errors across all modified files