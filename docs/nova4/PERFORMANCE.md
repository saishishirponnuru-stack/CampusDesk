# Build observations

Measured by Vite's production build in this cloud workspace, Node 24.22.1. Values below are displayed gzip kilobytes, not request latency, Core Web Vitals, FPS or a claim of faster performance.

| Output | Exact baseline | Nova 4 |
| --- | ---: | ---: |
| Main JavaScript chunk | 134.55 kB | 134.67 kB |
| Student import route | 3.33 kB | 5.06 kB |
| Attendance register route | 3.08 kB | 3.09 kB |
| Dashboard route | 1.98 kB | 2.07 kB |
| Brand/shared icon chunk | 6.49 kB | 6.69 kB |
| Lazy chart chunk | 110.75 kB | 110.76 kB |
| Stylesheet | 9.87 kB | 11.66 kB |
| Self-hosted font (raw WOFF2) | 24.83 kB | 24.83 kB |

Chunk boundaries are preserved: importing CSV interaction code does not eagerly load the import route into the entry. No dependency/lockfile change or animation engine was added. The uploader uses native events, bounded CSV data and the existing API. Simple interaction motion uses CSS transforms/opacity and transition tokens, with reduced-motion overrides. There are no continuous pointer effects, background animation loops or fabricated loading percentages.

The import route and CSS increased to support the real uploader, guided states and semantic treatments. The main chunk is not the total initial download; shared static chunks must also be counted to compare whole-page payloads. No total-entry reduction or percentage improvement is claimed. Full command output is retained in the review archive's verification log.
