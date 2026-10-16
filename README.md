<p align="center">
  <img src="assets/logo.png" width="120" alt="Chisle">
</p>

<h1 align="center">Chisle</h1>

<p align="center">
  <em>Your AI talks less, builds less, reads less, and says more. Like a senior dev who bills by the syllable.</em>
</p>

<p align="center">
  <em>The only tool in this class that publishes the runs where it lost. <a href="https://jaypokale.me/writing/chisle-benchmarks-it-loses">Here's why.</a></em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/chisle"><img src="https://img.shields.io/npm/v/chisle?style=flat-square&color=d78a3c" alt="npm version"></a>
  <img src="https://img.shields.io/badge/works%20with-12%20agents-d78a3c?style=flat-square" alt="Works with 12 agents">
  <a href="https://github.com/JayPokale/Chisle/actions/workflows/test.yml"><img src="https://img.shields.io/github/actions/workflow/status/JayPokale/Chisle/test.yml?style=flat-square&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/deps-0-2da44e?style=flat-square" alt="Zero deps">
  <img src="https://img.shields.io/badge/license-MIT-d78a3c?style=flat-square" alt="MIT">
  <a href="https://github.com/JayPokale/Chisle/stargazers"><img src="https://img.shields.io/github/stars/JayPokale/Chisle?style=social" alt="Star Chisle on GitHub"></a>
</p>

<p align="center">
  <strong>Built for Claude Code: coding answers come back about half as long, every number and loss published &middot; 12 agents &middot; zero dependencies &middot; one command</strong>
</p>

Chisle is a Claude Code plugin that makes Claude cheaper to run without making it dumber. It cuts what Claude writes: no filler, no hedging, no speculative abstractions, just the smallest code that works. It also cuts what Claude reads: a `PostToolUse` hook trims oversized tool output by ~46% before it re-enters the context window, where it would be re-billed on every later request. In agent-loop tests Claude with Chisle passes the same tasks as Claude without it. One `npx chisle` installs it, and the same ruleset ships to Pi, Cursor, Codex, Gemini, Copilot, OpenCode, Antigravity and four more agents. Every number here comes from committed raw transcripts, including the runs where it lost.

<p align="center">
  <img src="assets/benchmark-claude.svg" width="820" alt="Claude Code coding prompts, 14 cells on Haiku 4.5, tools off, as percent of the same model with no ruleset. Answer length: caveman 57%, ponytail 47%, Chisle 52%. Billed tokens: caveman 69%, ponytail 154%, Chisle 79%.">
</p>

<p align="center"><sub>Claude Code 2.1.285 on Haiku 4.5, tools off, the 14 coding cells of a 26-cell run. All three rulesets shorten answers by a similar amount. Across all 26 prompts Chisle bills 82%, caveman 81% and ponytail 127%; on short answers every ruleset costs more than none. <a href="#benchmarks">Full numbers below.</a></sub></p>

---

"Add debounce to a search input that currently fires an API call on every keystroke." Same model, same prompt, one difference: the injected ruleset. Both answers below are the **verbatim committed output** from [`benchmarks/results/raw/`](benchmarks/results/raw/):

<table>
<tr><th align="left" width="50%">bare agent: 142 lines, 1506 tokens</th><th align="left" width="50%">Chisle: 35 lines, 602 tokens</th></tr>
<tr valign="top"><td>

Opens with *"Let me show you the most common approaches"*, then ships a reusable generic `useDebounce<T>` hook in its own file…

```typescript
// useDebounce.ts
export function useDebounce<T>(
  value: T, delay: number
): T {
  const [debouncedValue, setDebouncedValue]
    = useState<T>(value);
  useEffect(() => { /* … */ }, [value, delay]);
  return debouncedValue;
}
```

…then **Option 2** and **Option 3**, a comparison table, and a caveats section.

</td><td>

Asks which framework, then answers the question that was actually asked: `setTimeout` in the effect you already have, no new file, no generic:

```jsx
useEffect(() => {
  const timer = setTimeout(async () => {
    if (query.trim()) { /* fetch */ }
  }, 300);
  return () => clearTimeout(timer);
}, [query]);
```

Then two lines on why it works, and *"use `lodash.debounce` if already installed."*

</td></tr>
</table>

Not golfed, **boring**. Same behaviour, one less abstraction, no second file, and it names the dependency you might already have instead of reinventing it.

<sub>From the June run, whose bare answer was recorded with Claude Code's tools on (3 turns, [#37](https://github.com/JayPokale/Chisle/issues/37)). With tools off this prompt is a tie or a loss for Chisle (99% and 123% of bare across two seeds); across all 14 tools-off coding cells Chisle's answers are 52% as long ([raw cells](benchmarks/results/raw-oct-notools/)).</sub>

## What it compresses

| axis | what | how |
|---|---|---|
| **Output: prose** | filler, hedging, manufactured structure | zero-fluff ruleset, injected per session |
| **Output: code** | speculative abstractions, unrequested boilerplate | YAGNI efficiency ladder |
| **Input: context** | oversized tool output flooding the window | Claude `PostToolUse` / Pi `tool_result`: scrub, elide, dedup, plus prevention rules |

Where each one attaches to a session:

```mermaid
flowchart LR
    subgraph S["Session start"]
        H1["Ruleset injection<br/>once per active session"]
    end
    subgraph T["Every turn"]
        H2["Mode tracking<br/>Claude + Pi"]
    end
    subgraph L["Every tool call"]
        H3["PostToolUse / tool_result<br/>scrub → elide → dedup"]
    end

    H1 --> M(["Model"])
    H2 --> M
    M -->|writes| O["Output:<br/>terser prose,<br/>YAGNI-first code"]
    M -->|calls a tool| TOOL[["Bash / grep / web / extension tools"]]
    TOOL -->|raw output| H3
    H3 -->|"compressed, rebuilt into<br/>the tool's own shape"| M

    RE["Read / Edit / Write"] -.->|"never touched,<br/>exact bytes feed later edits"| M

    style M fill:#1f2937,stroke:#d78a3c,color:#e6edf3
    style O fill:#14532d,stroke:#2da44e,color:#e6edf3
    style H3 fill:#1f2937,stroke:#2da44e,color:#e6edf3
    style RE fill:#3f1d1d,stroke:#cf3b3b,color:#e6edf3
```

The loop on the right is the input axis: tool output is billed again on *every* later request in the session, so shrinking it once pays repeatedly. `Read`, `Edit`, and `Write` are deliberately outside it.

---

## Install

One command. Auto-detects your agents (Claude Code, Pi, Cursor, Windsurf, Cline, Kiro, Antigravity, Codex, Gemini, Copilot, Copilot CLI, OpenCode, Hermes) and wires each one. `--uninstall` puts everything back. `npx chisle mcp wrap` extends tool-output compression to MCP servers in any agent ([details](INSTALL.md#mcp-output-compression-any-agent)).

```bash
npx chisle
```

```bash
# or via curl
curl -fsSL https://raw.githubusercontent.com/JayPokale/Chisle/main/install.sh | bash
```

```powershell
# Windows
irm https://raw.githubusercontent.com/JayPokale/Chisle/main/install.ps1 | iex
```

Preview first with `npx chisle --dry-run`, scope with `--only claude` or `--only pi`, see everything with `npx chisle --help`. Remove with `npx chisle --uninstall`.

Upgrading, per-agent setup, `--stats` and config: [docs/usage.md](docs/usage.md).

---

## Benchmarks

Claude Code 2.1.285 on Haiku 4.5, 13 live prompts × 2 seeds = 26 cells per arm, tools off, billed output tokens vs the same model with no ruleset ([writeup + raw cells](benchmarks/results/2026-10-12-tools-off-rerun.md)). This replaces the 2026-10-01 run, which left Claude Code's tools on ([#37](https://github.com/JayPokale/Chisle/issues/37)):

<p align="center">
  <img src="assets/benchmark-rerun.svg" width="820" alt="2026-10-12 tools-off rerun: total billed output as percent of the bare model. caveman 81%, ponytail 127%, Chisle 82%.">
</p>

| | total bill | 95% CI | visible answer | worst cell | backfires |
|---|--:|--:|--:|--:|--:|
| caveman | 81% | 63–105% | 65% | 339% | 13 / 26 |
| ponytail | 127% | 102–155% | 58% | 493% | 18 / 26 |
| **Chisle** | **82%** | **67–104%** | **56%** | **194%** | **12 / 26** |

All three shorten the visible answer by a similar amount; the intervals overlap. On the bill Chisle and caveman tie, and neither is clearly below a bare model. ponytail bills more because its reasoning grows almost 5×. Every ruleset costs more than none on short answers.

On Pi + GPT-5.5 Chisle gives the shortest answers, 37% the length of a bare model's (caveman 56%, ponytail 49%), though on total billed tokens ponytail edges it, 59% to 61%:

<p align="center">
  <img src="assets/benchmark-pi.svg" width="820" alt="Pi benchmark, 6 tasks on GPT-5.5, as percent of the same model with no ruleset. Answer length: caveman 56%, ponytail 49%, Chisle 37%. Billed tokens: caveman 72%, ponytail 59%, Chisle 61%.">
</p>

**Input side:** tool output is 67.5% of context in 171 measured Claude Code sessions, and it is re-billed on every later request. The compressor cut ~46% off every eligible output there, and 27.4% of tool output on top of Pi's own truncation ([receipts](benchmarks/results/2026-07-07-input-axis.md)).

Every table, chart and caveat, including the June suite and the Pi run in full: [docs/benchmarks.md](docs/benchmarks.md). Head to head: [docs/comparison.md](docs/comparison.md).

---

## How it works

Before writing code, the agent stops at the first rung that holds:

```mermaid
flowchart TD
    A[Request for code] --> R[Read the problem fully]
    R --> Q1{Does this need<br/>to exist at all?}
    Q1 -->|no| S1[Skip it. Say so in one line]
    Q1 -->|yes| Q2{Already in<br/>this codebase?}
    Q2 -->|yes| S2[Reuse it. Don't rewrite]
    Q2 -->|no| Q3{Stdlib<br/>does it?}
    Q3 -->|yes| S3[Use the stdlib]
    Q3 -->|no| Q4{Native platform<br/>feature covers it?}
    Q4 -->|yes| S4["CSS over JS, DB constraint<br/>over app code"]
    Q4 -->|no| Q5{Already-installed<br/>dependency?}
    Q5 -->|yes| S5[Use it. Never add a new dep<br/>for what a few lines do]
    Q5 -->|no| Q6{Can it be<br/>one line?}
    Q6 -->|yes| S6[One line]
    Q6 -->|no| S7[The minimum code that works]

    S1 & S2 & S3 & S4 & S5 & S6 & S7 --> OUT[Ship it + note what was skipped<br/>and when to add it]

    style Q1 fill:#1f2937,stroke:#d78a3c,color:#e6edf3
    style OUT fill:#14532d,stroke:#2da44e,color:#e6edf3
    style R fill:#1f2937,stroke:#8b949e,color:#e6edf3
```

The ladder runs **after** reading, never instead of it. Note the exit: every rung lands on the same obligation: say what you skipped, so "later" doesn't quietly become "never".

The ladder runs *after* reading the code, lazy about the solution and never about understanding. Lazy is not negligent: trust-boundary validation, data-loss handling, security, and accessibility are never on the chopping block.

Mark deliberate simplifications so "later" doesn't quietly become "never":

```js
// chisle: global lock, per-account locks if throughput matters
// chisle: O(n) scan, index this when table exceeds ~10k rows
```

## Usage

| Command | Effect |
|---------|--------|
| *(nothing)* | On automatically every session after install |
| `/chisle` | Re-activate if you'd stopped it |
| `/chisle off` | Deactivate |
| `stop chisle` | Deactivate (ruleset *and* input-side compression) |
| `normal mode` | Deactivate |

Natural language works too: "activate chisle", "chisle mode", "chislify this". Code symbols, function/API names, and error strings stay verbatim, so only the noise around them compresses.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Built by [Jay Pokale](https://github.com/JayPokale) with [Claude](https://claude.com/claude-code), [Antigravity](https://antigravity.google), and [Codex](https://openai.com/blog/openai-codex/) as co-engineers.

## Star History

<a href="https://www.star-history.com/?repos=JayPokale%2FChisle&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=JayPokale/Chisle&type=date&legend=top-left&theme=dark">
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=JayPokale/Chisle&type=date&legend=top-left">
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=JayPokale/Chisle&type=date&legend=top-left">
  </picture>
</a>

## License

[MIT](LICENSE). The shortest license that works.

Chisle began as a merge of [caveman](https://github.com/JuliusBrussee/caveman) (terse prose) and [ponytail](https://github.com/DietrichGebert/ponytail) (lazy-senior-dev code rules), and its ruleset still carries parts of both. Their MIT notices are in [NOTICE](NOTICE).

## Contributors

<a href="https://github.com/JayPokale/Chisle/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=JayPokale/Chisle" alt="GitHub contributors">
</a>

**AI co-engineers** (pair-work credited in commit trailers and the changelog):

<p>
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/🤖_Claude-input_axis_·_benchmarks_·_bug_hunts-d97757?style=flat-square" alt="Claude (Anthropic)"></a>
  <a href="https://openai.com/codex/"><img src="https://img.shields.io/badge/🤖_Codex-early_iterations-10a37f?style=flat-square" alt="Codex (OpenAI)"></a>
  <a href="https://antigravity.google/"><img src="https://img.shields.io/badge/🤖_Antigravity-early_iterations-4285f4?style=flat-square" alt="Antigravity (Google)"></a>
</p>

---

<p align="center">
  Saved you tokens? <a href="https://github.com/JayPokale/Chisle">⭐ Star the repo</a>. It costs zero tokens and keeps the benchmarks running.
</p>
