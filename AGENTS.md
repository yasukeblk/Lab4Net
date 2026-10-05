# Lab4Net project rules

## CCNA curriculum only

The graded lab curriculum, new practice content and default tutor coaching must remain focused on Cisco CCNA 200-301. The current content target is the v1.1 blueprint verified on 2026-10-04. Use the official Cisco exam topics as the reference:
https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf

- Every graded lab must identify the CCNA objective IDs it practices. Explain partial simulator coverage honestly; a completed lab does not establish mastery of an entire objective or readiness for the exam.
- Prioritize CCNA configuration, verification, interpretation and troubleshooting. Match the required depth: topics marked describe/explain are not permission to add advanced configuration courses.
- Do not add graded Junos/JNCIA, CCNP/CCIE, BGP, MPLS or other certification curricula. Existing Juniper hardware remains optional sandbox experimentation, not CCNA exam practice. Do not remove that previously requested functionality.
- Keep lab titles, IDs and saved progress stable. Preserve the independent mission/objectives, optional step guide and per-task why explanations.
- Before changing the app, run `node tests/labs.cjs`; run it afterward. Every lab's `build`, `solution`, `checks` and guided commands must be coherent. Troubleshooting scenarios must begin with a real failing requirement and recover using their documented commands, without damaging unrelated working requirements.
- Keep the simulator self-contained in `index.html`, desktop-first, phone-usable and respectful of reduced motion. Preserve `git pull && bash install-lxc.sh` deployment. Operator AI remains an optional server-side integration; credentials never belong in HTML or Git.
- Work on `chatgpt/improvements`, update `CHANGES.md`, and deliver the final commit hash and grading test result.

Future exam revisions require checking Cisco's published scope and explicitly documenting the migration; do not silently mix blueprints.
